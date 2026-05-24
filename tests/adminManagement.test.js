import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

async function login(agent) {
  const loginResponse = await agent.post("/admin/login").send("password=secret");
  expect(loginResponse.status).toBe(302);

  const dashboard = await agent.get("/admin");
  expect(dashboard.status).toBe(200);

  const csrfToken = dashboard.text.match(/name="csrfToken" value="([^"]+)"/)?.[1];
  expect(csrfToken).toBeTruthy();
  return csrfToken;
}

function eventPayload(overrides = {}) {
  return {
    publicTitle: "클래식을 좋아하세요 7기",
    generationLabel: "7기 모집",
    eventDate: "7/20 토요일",
    region: "서울 강남권",
    venueNote: "참여 확정자 개별 안내",
    capacityNote: "최대 10:10",
    applicationConditions: "93-06년생 남자 / 94-06년생 여자",
    status: "closing-soon",
    googleFormUrl: "https://forms.gle/demo",
    ...overrides
  };
}

describe("admin management", () => {
  it("updates the featured event and renders the change publicly", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const agent = request.agent(app);
    const csrfToken = await login(agent);

    const update = await agent.post("/admin/events/classic-rotation-6").send(eventPayload({ csrfToken }));

    expect(update.status).toBe(302);
    expect(update.headers.location).toBe("/admin");

    const publicPage = await request(app).get("/");
    expect(publicPage.status).toBe(200);
    expect(publicPage.text).toContain("클래식을 좋아하세요 7기");
    expect(publicPage.text).toContain("마감 전 신청하기");
  });

  it("rejects non-https Google Form URLs", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const agent = request.agent(app);
    const csrfToken = await login(agent);

    const update = await agent.post("/admin/events/classic-rotation-6").send(eventPayload({
      csrfToken,
      googleFormUrl: "http://forms.gle/demo"
    }));

    expect(update.status).toBe(400);

    const publicPage = await request(app).get("/");
    expect(publicPage.text).toContain("클래식을 좋아하세요 6기");
    expect(publicPage.text).not.toContain("클래식을 좋아하세요 7기");
  });
});
