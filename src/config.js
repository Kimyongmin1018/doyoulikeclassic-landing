import "dotenv/config";

export function loadConfig(overrides = {}) {
  const env = { ...process.env, ...overrides };

  return {
    nodeEnv: env.NODE_ENV || "development",
    port: Number(env.PORT || 3000),
    dbPath: env.DATABASE_PATH || "data/classic-rotation.sqlite",
    adminPassword: env.ADMIN_PASSWORD || "change-this-before-production",
    sessionSecret: env.SESSION_SECRET || "dev-session-secret",
    publicBaseUrl: env.PUBLIC_BASE_URL || "http://localhost:3000",
    secureCookies: (env.NODE_ENV || "development") === "production"
  };
}
