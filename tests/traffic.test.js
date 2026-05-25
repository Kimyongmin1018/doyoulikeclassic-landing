import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

async function login(agent) {
  const loginResponse = await agent.post("/admin/login").send("password=secret");
  expect(loginResponse.status).toBe(302);
}

describe("traffic log", () => {
  it("records public landing visits with an anonymous visitor cookie", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const agent = request.agent(app);

    const firstVisit = await agent.get("/");
    const secondVisit = await agent.get("/");
    const cookieHeader = firstVisit.headers["set-cookie"].join(";");
    const aggregate = app.locals.db
      .prepare("select count(*) as uniqueVisitors, sum(visit_count) as pageViews from traffic_visits")
      .get();

    expect(firstVisit.status).toBe(200);
    expect(secondVisit.status).toBe(200);
    expect(cookieHeader).toContain("public_visitor=");
    expect(cookieHeader).toContain("HttpOnly");
    expect(cookieHeader).toContain("SameSite=Lax");
    expect(aggregate).toEqual({ uniqueVisitors: 1, pageViews: 2 });
  });

  it("renders traffic log summary in the admin dashboard", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const visitor = request.agent(app);
    const admin = request.agent(app);

    await visitor.get("/");
    await login(admin);
    const dashboard = await admin.get("/admin");

    expect(dashboard.status).toBe(200);
    expect(dashboard.text).toContain("Traffic Log");
    expect(dashboard.text).toContain("시간대별 홈페이지 접속");
    expect(dashboard.text).toContain("고유 방문자");
    expect(dashboard.text).toContain("페이지뷰");
  });
});
