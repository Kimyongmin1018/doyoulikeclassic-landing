#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const apiToken = requireEnv("CF_API_TOKEN");
const accountId = requireEnv("CF_ACCOUNT_ID");
const zoneId = requireEnv("CF_ZONE_ID");
const tunnelName = process.env.CF_TUNNEL_NAME || "doyoulikeclassic-main";
const originUrl = process.env.CF_ORIGIN_URL || "http://localhost:3001";
const hostnames = (process.env.CF_HOSTNAMES || "doyoulikeclassic.com,www.doyoulikeclassic.com")
  .split(",")
  .map((hostname) => hostname.trim())
  .filter(Boolean);
const tokenFile = process.env.CF_TUNNEL_TOKEN_FILE || "/tmp/doyoulikeclassic-cloudflared.token";

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

async function request(endpoint, { method = "GET", body } = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${endpoint}`, {
    method,
    headers: {
      authorization: `Bearer ${apiToken}`,
      "content-type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();

  if (!payload.success) {
    const details = payload.errors?.map((error) => `${error.code}: ${error.message}`).join("; ");
    throw new Error(`Cloudflare API request failed (${method} ${endpoint}): ${details || response.status}`);
  }

  return payload.result;
}

async function getTunnel() {
  const tunnels = await request(`/accounts/${accountId}/cfd_tunnel?is_deleted=false`);
  return tunnels.find((tunnel) => tunnel.name === tunnelName) || null;
}

async function createTunnel() {
  return request(`/accounts/${accountId}/cfd_tunnel`, {
    method: "POST",
    body: {
      name: tunnelName,
      config_src: "cloudflare"
    }
  });
}

async function configureTunnel(tunnelId) {
  const ingress = hostnames.map((hostname) => ({
    hostname,
    service: originUrl
  }));

  ingress.push({ service: "http_status:404" });

  return request(`/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`, {
    method: "PUT",
    body: {
      config: {
        ingress
      }
    }
  });
}

async function getTunnelToken(tunnelId) {
  return request(`/accounts/${accountId}/cfd_tunnel/${tunnelId}/token`);
}

async function upsertTunnelDnsRecord(hostname, tunnelTarget) {
  const records = await request(
    `/zones/${zoneId}/dns_records?name=${encodeURIComponent(hostname)}&per_page=100`
  );
  const blockingRecords = records.filter((record) => record.type !== "CNAME");

  if (blockingRecords.length > 0) {
    const summary = blockingRecords.map((record) => `${record.type} ${record.name}`).join(", ");
    throw new Error(
      `Cannot create CNAME for ${hostname}; remove or convert existing record(s) first: ${summary}`
    );
  }

  const cname = records.find((record) => record.type === "CNAME");
  const body = {
    type: "CNAME",
    name: hostname,
    content: tunnelTarget,
    proxied: true
  };

  if (!cname) {
    await request(`/zones/${zoneId}/dns_records`, {
      method: "POST",
      body
    });
    return "created";
  }

  await request(`/zones/${zoneId}/dns_records/${cname.id}`, {
    method: "PATCH",
    body
  });
  return "updated";
}

function writeTunnelToken(token) {
  fs.mkdirSync(path.dirname(tokenFile), { recursive: true });
  fs.writeFileSync(tokenFile, `${token}\n`, { mode: 0o600 });
  fs.chmodSync(tokenFile, 0o600);
}

async function main() {
  if (hostnames.length === 0) {
    throw new Error("CF_HOSTNAMES must include at least one hostname");
  }

  let tunnel = await getTunnel();
  let token = tunnel?.token;

  if (!tunnel) {
    tunnel = await createTunnel();
    token = tunnel.token;
  }

  if (!token) {
    token = await getTunnelToken(tunnel.id);
  }

  await configureTunnel(tunnel.id);

  const tunnelTarget = `${tunnel.id}.cfargotunnel.com`;
  const dnsResults = [];

  for (const hostname of hostnames) {
    const action = await upsertTunnelDnsRecord(hostname, tunnelTarget);
    dnsResults.push(`${hostname}: ${action}`);
  }

  writeTunnelToken(token);

  console.log(`Cloudflare Tunnel is ready: ${tunnel.name} (${tunnel.id})`);
  console.log(`Origin: ${originUrl}`);
  console.log(`DNS: ${dnsResults.join(", ")}`);
  console.log(`Tunnel token file: ${tokenFile}`);
  console.log("Run the connector with: npm run cloudflare:tunnel");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
