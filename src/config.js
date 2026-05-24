import "dotenv/config";

const overrideAliases = {
  nodeEnv: "NODE_ENV",
  port: "PORT",
  dbPath: "DATABASE_PATH",
  adminPassword: "ADMIN_PASSWORD",
  sessionSecret: "SESSION_SECRET",
  publicBaseUrl: "PUBLIC_BASE_URL"
};

const unsafeAdminPasswords = new Set(["change-this-before-production"]);
const unsafeSessionSecrets = new Set([
  "dev-session-secret",
  "replace-with-a-long-random-string"
]);

function normalizeOverrides(overrides) {
  const normalized = { ...overrides };

  for (const [camelKey, envKey] of Object.entries(overrideAliases)) {
    if (Object.hasOwn(overrides, camelKey) && !Object.hasOwn(overrides, envKey)) {
      normalized[envKey] = overrides[camelKey];
    }
  }

  return normalized;
}

function assertProductionSecrets(config) {
  if (config.nodeEnv !== "production") {
    return;
  }

  if (!config.adminPassword || unsafeAdminPasswords.has(config.adminPassword)) {
    throw new Error("ADMIN_PASSWORD must be set to a non-placeholder value in production");
  }

  if (!config.sessionSecret || unsafeSessionSecrets.has(config.sessionSecret)) {
    throw new Error("SESSION_SECRET must be set to a non-placeholder value in production");
  }
}

export function loadConfig(overrides = {}) {
  const env = { ...process.env, ...normalizeOverrides(overrides) };

  const config = {
    nodeEnv: env.NODE_ENV || "development",
    port: Number(env.PORT || 3000),
    dbPath: env.DATABASE_PATH || "data/classic-rotation.sqlite",
    adminPassword: env.ADMIN_PASSWORD || "change-this-before-production",
    sessionSecret: env.SESSION_SECRET || "dev-session-secret",
    publicBaseUrl: env.PUBLIC_BASE_URL || "http://localhost:3000",
    secureCookies: (env.NODE_ENV || "development") === "production"
  };

  assertProductionSecrets(config);

  return config;
}
