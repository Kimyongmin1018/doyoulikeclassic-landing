import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("accepts camelCase overrides from createApp callers", () => {
    const config = loadConfig({
      dbPath: ":memory:",
      adminPassword: "secret",
      sessionSecret: "test-session-secret",
      publicBaseUrl: "http://example.test",
      clarityProjectId: "clarity123",
      googleAnalyticsMeasurementId: "G-TEST1234",
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
      clarityProjectId: "clarity123",
      googleAnalyticsMeasurementId: "G-TEST1234",
      analytics: {
        clarityProjectId: "clarity123",
        googleAnalyticsMeasurementId: "G-TEST1234"
      },
      secureCookies: false
    });
  });

  it("uses the Clarity project by default and only enables Google Analytics when configured", () => {
    const config = loadConfig({
      dbPath: ":memory:",
      adminPassword: "secret",
      sessionSecret: "test-session-secret"
    });

    expect(config.analytics.clarityProjectId).toBe("x6svg2d1wr");
    expect(config.analytics.googleAnalyticsMeasurementId).toBe("");
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
