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
    expect(response.text).toContain("개인정보는 구글폼에서 수집");
    expect(response.text).toContain("Q&amp;A 챗봇");
    expect(response.text).toContain("궁금한 점은 챗봇에게 바로 물어보세요.");
  });
});
