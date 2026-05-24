import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("rendering", () => {
  it("renders the public landing page", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true });
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("클래식을 좋아하세요");
    expect(response.text).toContain("이번 기수 신청하기");
  });
});
