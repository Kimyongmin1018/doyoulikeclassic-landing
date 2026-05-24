import express from "express";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

export function createApp(overrides = {}) {
  const config = loadConfig(overrides);
  const app = express();

  app.set("view engine", "ejs");
  app.set("views", path.join(rootDir, "views"));
  app.locals.config = config;

  app.use(helmet());
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(express.static(path.join(rootDir, "public")));

  app.get("/", (_request, response) => {
    response
      .status(200)
      .send("<!doctype html><title>클래식을 좋아하세요</title><a>이번 기수 신청하기</a>");
  });

  return app;
}
