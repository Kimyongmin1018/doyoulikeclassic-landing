import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("rendering", () => {
  it("renders the public landing page from seeded content", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true });
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("클래식을 좋아하세요");
    expect(response.text).toContain("같은 취향이 설렘이 되는 밤");
    expect(response.text).toContain("서울 강남권");
    expect(response.text).toContain("누적 신청자 500명 이상");
    expect(response.text).toContain("이번 기수 신청하기");
    expect(response.text).toContain("자주 묻는 질문");
    expect(response.text).toContain("Q&amp;A 챗봇");
    expect(response.text).toContain("궁금한 점은 챗봇에게 바로 물어보세요.");
    expect(response.text).toContain("directContactLabel");
  });

  it("renders Clarity and Google Analytics tags on the public landing page", async () => {
    const app = createApp({
      dbPath: ":memory:",
      seed: true,
      googleAnalyticsMeasurementId: "G-TEST1234"
    });
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("https://www.clarity.ms/tag/");
    expect(response.text).toContain("\"x6svg2d1wr\"");
    expect(response.text).toContain("https://www.googletagmanager.com/gtag/js?id=G-TEST1234");
    expect(response.text).toContain("gtag(\"config\", \"G-TEST1234\")");
  });
});
