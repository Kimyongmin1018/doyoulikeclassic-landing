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

    await visitor.get("/?utm_source=naver&utm_term=%ED%81%B4%EB%9E%98%EC%8B%9D");
    await visitor.post("/traffic/event").send({
      eventType: "apply_click",
      label: "일정 카드 신청 버튼",
      value: "https://forms.gle/demo",
      path: "/"
    });
    await visitor.post("/traffic/event").send({
      eventType: "menu_click",
      label: "현장 영상",
      value: "#instagram",
      path: "/"
    });
    await login(admin);
    const dashboard = await admin.get("/admin");

    expect(dashboard.status).toBe(200);
    expect(dashboard.text).toContain("Traffic Log");
    expect(dashboard.text).toContain("시간대별 홈페이지 접속");
    expect(dashboard.text).toContain("고유 방문자");
    expect(dashboard.text).toContain("페이지뷰");
    expect(dashboard.text).toContain("신청 버튼 클릭");
    expect(dashboard.text).toContain("메뉴 클릭 순위");
    expect(dashboard.text).toContain("유입 경로");
    expect(dashboard.text).toContain("유입 검색어 / UTM");
    expect(dashboard.text).toContain("일정 카드 신청 버튼");
    expect(dashboard.text).toContain("현장 영상");
    expect(dashboard.text).toContain("naver");
    expect(dashboard.text).toContain("클래식");
  });

  it("records anonymous click analytics events", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const visitor = request.agent(app);

    await visitor.get("/");
    const applyClick = await visitor.post("/traffic/event").send({
      eventType: "apply_click",
      label: "상단 신청 버튼",
      value: "https://forms.gle/demo",
      path: "/"
    });
    const menuClick = await visitor.post("/traffic/event").send({
      eventType: "menu_click",
      label: "일정",
      value: "#event",
      path: "/"
    });
    const aggregate = app.locals.db
      .prepare(`
        select event_type as eventType, event_label as eventLabel, count(*) as count
        from traffic_events
        where event_type in ('apply_click', 'menu_click')
        group by event_type, event_label
        order by event_type
      `)
      .all();

    expect(applyClick.status).toBe(204);
    expect(menuClick.status).toBe(204);
    expect(aggregate).toEqual([
      { eventType: "apply_click", eventLabel: "상단 신청 버튼", count: 1 },
      { eventType: "menu_click", eventLabel: "일정", count: 1 }
    ]);
  });
});
