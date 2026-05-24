import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("accepts camelCase overrides from createApp callers", () => {
    const config = loadConfig({
      dbPath: ":memory:",
      adminPassword: "secret",
      sessionSecret: "test-session-secret",
      publicBaseUrl: "http://example.test",
      nodeEnv: "test",
      port: 4242
    });

    expect(config).toMatchObject({
      nodeEnv: "test",
      port: 4242,
      dbPath: ":memory:",
      adminPassword: "secret",
      sessionSecret: "test-session-secret",
      publicBaseUrl: "http://example.test",
      secureCookies: false
    });
  });

  it("rejects placeholder secrets in production", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        ADMIN_PASSWORD: "change-this-before-production",
        SESSION_SECRET: "dev-session-secret"
      })
    ).toThrow(/ADMIN_PASSWORD/);

    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        ADMIN_PASSWORD: "real-admin-password",
        SESSION_SECRET: "replace-with-a-long-random-string"
      })
    ).toThrow(/SESSION_SECRET/);
  });
});
