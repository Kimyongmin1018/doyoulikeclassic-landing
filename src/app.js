import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { createDatabase } from "./db/database.js";
import { seedDatabase } from "./db/seed.js";
import { publicRouter } from "./routes/public.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

export function createApp(overrides = {}) {
  const config = loadConfig(overrides);
  const app = express();
  const db = createDatabase(config.dbPath);

  if (overrides.seed || config.seed) {
    seedDatabase(db);
  }

  app.set("view engine", "ejs");
  app.set("views", path.join(rootDir, "views"));
  app.locals.config = config;
  app.locals.serviceName = "클래식을 좋아하세요";

  app.use(helmet());
  app.use(cookieParser(config.sessionSecret));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(express.static(path.join(rootDir, "public")));

  app.use((request, _response, next) => {
    request.db = db;
    request.config = config;
    next();
  });

  app.use("/", publicRouter);

  return app;
}
