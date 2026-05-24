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

function contentPayload(overrides = {}) {
  return {
    heroEyebrow: "취향이 만나는 테스트 살롱",
    heroHeadline: "클래식으로 시작하는 새로운 인연",
    heroSubheadline: "서울 강남권에서 만나는 취향 기반 로테이션 소개팅",
    heroBadgesText: "검증된 신청 폼\n선정자 개별 안내",
    participantsText: "피아니스트\n개발자\n교사",
    instagramUrl: "https://www.instagram.com/doyoulike.classic",
    instagramHandle: "@doyoulike.classic",
    instagramReelsText: "https://www.instagram.com/reel/demo-one\nhttps://www.instagram.com/reel/demo-two",
    faqText: "신청은 어떻게 하나요?|구글폼으로 신청합니다.\n결제는 언제 하나요?|선정자에게 개별 안내합니다.",
    businessName: "테스트 클래식 살롱",
    representative: "홍길동",
    registrationNumber: "123-45-67890",
    contact: "hello@doyoulikeclassic.com",
    domain: "demo.doyoulikeclassic.com",
    ...overrides
  };
}

function expectInputValue(html, name, value) {
  expect(html).toContain(`name="${name}" value="${value}"`);
}

function expectSelectedStatus(html, status) {
  expect(html).toContain(`value="${status}" selected>${status}</option>`);
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

  it.each([
    ["non-https URL", "http://forms.gle/demo"],
    ["non-Google Forms HTTPS URL", "https://example.com/not-google-form"]
  ])("rejects %s for Google Form URLs", async (_caseName, googleFormUrl) => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const agent = request.agent(app);
    const csrfToken = await login(agent);

    const update = await agent.post("/admin/events/classic-rotation-6").send(eventPayload({
      csrfToken,
      googleFormUrl
    }));

    expect(update.status).toBe(400);

    const publicPage = await request(app).get("/");
    expect(publicPage.text).toContain("클래식을 좋아하세요 6기");
    expect(publicPage.text).not.toContain("클래식을 좋아하세요 7기");
  });

  it("accepts docs.google.com Google Form URLs", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const agent = request.agent(app);
    const csrfToken = await login(agent);
    const googleFormUrl = "https://docs.google.com/forms/d/e/demo/viewform";

    const update = await agent.post("/admin/events/classic-rotation-6").send(eventPayload({
      csrfToken,
      googleFormUrl
    }));

    expect(update.status).toBe(302);

    const publicPage = await request(app).get("/");
    expect(publicPage.text).toContain(`href="${googleFormUrl}"`);
  });

  it("keeps the featured event editable with its Google Form URL when hidden", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const agent = request.agent(app);
    const csrfToken = await login(agent);
    const googleFormUrl = "https://forms.gle/hidden-admin-edit";

    const update = await agent.post("/admin/events/classic-rotation-6").send(eventPayload({
      csrfToken,
      status: "hidden",
      googleFormUrl
    }));

    expect(update.status).toBe(302);

    const dashboard = await agent.get("/admin");
    expect(dashboard.status).toBe(200);
    expect(dashboard.text).toContain('action="/admin/events/classic-rotation-6"');
    expectSelectedStatus(dashboard.text, "hidden");
    expectInputValue(dashboard.text, "googleFormUrl", googleFormUrl);
  });

  it.each(["scheduled", "closed"])(
    "preserves the Google Form URL for admin editing when %s while hiding the public apply href",
    async (status) => {
      const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
      const agent = request.agent(app);
      const csrfToken = await login(agent);
      const googleFormUrl = `https://forms.gle/${status}-admin-edit`;

      const update = await agent.post("/admin/events/classic-rotation-6").send(eventPayload({
        csrfToken,
        status,
        googleFormUrl
      }));

      expect(update.status).toBe(302);

      const dashboard = await agent.get("/admin");
      expect(dashboard.status).toBe(200);
      expectSelectedStatus(dashboard.text, status);
      expectInputValue(dashboard.text, "googleFormUrl", googleFormUrl);

      const publicPage = await request(app).get("/");
      expect(publicPage.status).toBe(200);
      expect(publicPage.text).not.toContain(`href="${googleFormUrl}"`);
    }
  );

  it("creates a second schedule and can make it featured", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const agent = request.agent(app);
    const csrfToken = await login(agent);

    const create = await agent.post("/admin/events").send(eventPayload({
      csrfToken,
      status: "scheduled",
      googleFormUrl: "https://forms.gle/next"
    }));

    expect(create.status).toBe(302);

    const eventRow = app.locals.db
      .prepare("select id, is_featured, is_visible from events where public_title = ?")
      .get("클래식을 좋아하세요 7기");
    expect(eventRow).toMatchObject({ is_featured: 0, is_visible: 1 });

    const timeSlot = app.locals.db
      .prepare("select label, starts_at, ends_at from event_time_slots where event_id = ?")
      .get(eventRow.id);
    const priceRow = app.locals.db
      .prepare("select label, amount from event_price_rows where event_id = ?")
      .get(eventRow.id);
    expect(timeSlot).toEqual({ label: "1회차", starts_at: "16:00", ends_at: "18:00" });
    expect(priceRow).toEqual({ label: "기본", amount: "40,000원" });

    const feature = await agent.post(`/admin/events/${eventRow.id}/feature`).send({ csrfToken });
    expect(feature.status).toBe(302);

    const publicPage = await request(app).get("/");
    expect(publicPage.status).toBe(200);
    expect(publicPage.text).toContain("클래식을 좋아하세요 7기");
    expect(publicPage.text).toContain("신청 오픈 예정");
  });

  it("updates a non-featured schedule while keeping the original featured event public", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const agent = request.agent(app);
    const csrfToken = await login(agent);

    const create = await agent.post("/admin/events").send(eventPayload({
      csrfToken,
      status: "scheduled",
      googleFormUrl: "https://forms.gle/next"
    }));
    expect(create.status).toBe(302);

    const eventRow = app.locals.db
      .prepare("select id from events where public_title = ?")
      .get("클래식을 좋아하세요 7기");

    const update = await agent.post(`/admin/events/${eventRow.id}`).send(eventPayload({
      csrfToken,
      publicTitle: "클래식을 좋아하세요 7기 수정",
      status: "scheduled",
      googleFormUrl: "https://forms.gle/next-edited"
    }));
    expect(update.status).toBe(302);

    const publicPage = await request(app).get("/");
    expect(publicPage.status).toBe(200);
    expect(publicPage.text).toContain("클래식을 좋아하세요 6기");
    expect(publicPage.text).not.toContain("클래식을 좋아하세요 7기 수정");

    const dashboard = await agent.get("/admin");
    expect(dashboard.status).toBe(200);
    expect(dashboard.text).toContain("클래식을 좋아하세요 7기 수정");
    expect(dashboard.text).toContain(`action="/admin/events/${eventRow.id}"`);
  });

  it("updates editable time slots and price rows before featuring an event", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const agent = request.agent(app);
    const csrfToken = await login(agent);

    const create = await agent.post("/admin/events").send(eventPayload({
      csrfToken,
      status: "scheduled",
      googleFormUrl: "https://forms.gle/next"
    }));
    expect(create.status).toBe(302);

    const eventRow = app.locals.db
      .prepare("select id from events where public_title = ?")
      .get("클래식을 좋아하세요 7기");

    const update = await agent.post(`/admin/events/${eventRow.id}`).send(eventPayload({
      csrfToken,
      publicTitle: "클래식을 좋아하세요 7기",
      status: "open",
      timeSlotsText: "오후|15:00|17:00\n저녁|19:00|21:00",
      priceRowsText: "얼리버드|35,000원|5월 한정\n기본|45,000원|"
    }));
    expect(update.status).toBe(302);

    const feature = await agent.post(`/admin/events/${eventRow.id}/feature`).send({ csrfToken });
    expect(feature.status).toBe(302);

    const publicPage = await request(app).get("/");
    expect(publicPage.status).toBe(200);
    expect(publicPage.text).toContain("오후");
    expect(publicPage.text).toContain("15:00-17:00");
    expect(publicPage.text).toContain("저녁");
    expect(publicPage.text).toContain("19:00-21:00");
    expect(publicPage.text).toContain("얼리버드");
    expect(publicPage.text).toContain("35,000원");
    expect(publicPage.text).toContain("5월 한정");
    expect(publicPage.text).toContain("기본");
    expect(publicPage.text).toContain("45,000원");
  });

  it.each([
    ["timeSlotsText", "라벨만|16:00"],
    ["priceRowsText", "기본||"]
  ])("rejects malformed %s without partially updating event or children", async (fieldName, fieldValue) => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const agent = request.agent(app);
    const csrfToken = await login(agent);

    const beforeEvent = app.locals.db
      .prepare("select public_title from events where id = ?")
      .get("classic-rotation-6");
    const beforeSlots = app.locals.db
      .prepare("select label, starts_at, ends_at, sort_order from event_time_slots where event_id = ? order by sort_order")
      .all("classic-rotation-6");
    const beforePrices = app.locals.db
      .prepare("select label, amount, note, sort_order from event_price_rows where event_id = ? order by sort_order")
      .all("classic-rotation-6");

    const update = await agent.post("/admin/events/classic-rotation-6").send(eventPayload({
      csrfToken,
      publicTitle: "부분 업데이트되면 안 됨",
      timeSlotsText: "1회차|16:00|18:00",
      priceRowsText: "기본|40,000원|",
      [fieldName]: fieldValue
    }));

    expect(update.status).toBe(400);

    const afterEvent = app.locals.db
      .prepare("select public_title from events where id = ?")
      .get("classic-rotation-6");
    const afterSlots = app.locals.db
      .prepare("select label, starts_at, ends_at, sort_order from event_time_slots where event_id = ? order by sort_order")
      .all("classic-rotation-6");
    const afterPrices = app.locals.db
      .prepare("select label, amount, note, sort_order from event_price_rows where event_id = ? order by sort_order")
      .all("classic-rotation-6");

    expect(afterEvent).toEqual(beforeEvent);
    expect(afterSlots).toEqual(beforeSlots);
    expect(afterPrices).toEqual(beforePrices);
  });

  it("feature route preserves only one featured event", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const agent = request.agent(app);
    const csrfToken = await login(agent);

    const create = await agent.post("/admin/events").send(eventPayload({ csrfToken }));
    expect(create.status).toBe(302);

    const eventRow = app.locals.db
      .prepare("select id from events where public_title = ?")
      .get("클래식을 좋아하세요 7기");
    const feature = await agent.post(`/admin/events/${eventRow.id}/feature`).send({ csrfToken });
    expect(feature.status).toBe(302);

    const featured = app.locals.db
      .prepare("select id from events where is_featured = 1")
      .all();
    const original = app.locals.db
      .prepare("select is_featured from events where id = ?")
      .get("classic-rotation-6");

    expect(featured).toEqual([{ id: eventRow.id }]);
    expect(original.is_featured).toBe(0);
  });

  it("requires CSRF for create, feature, and content routes", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const agent = request.agent(app);
    const csrfToken = await login(agent);

    const createWithoutCsrf = await agent.post("/admin/events").send(eventPayload());
    expect(createWithoutCsrf.status).toBe(403);

    const contentWithoutCsrf = await agent.post("/admin/content").send(contentPayload());
    expect(contentWithoutCsrf.status).toBe(403);

    const create = await agent.post("/admin/events").send(eventPayload({ csrfToken }));
    expect(create.status).toBe(302);

    const eventRow = app.locals.db
      .prepare("select id from events where public_title = ?")
      .get("클래식을 좋아하세요 7기");
    const featureWithoutCsrf = await agent.post(`/admin/events/${eventRow.id}/feature`).send({});

    expect(featureWithoutCsrf.status).toBe(403);
  });

  it("updates landing content and legal blocks from admin", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const agent = request.agent(app);
    const csrfToken = await login(agent);

    const response = await agent.post("/admin/content").send(contentPayload({
      csrfToken,
      heroHeadline: "클래식으로 시작하는 새로운 인연"
    }));

    expect(response.status).toBe(302);

    const publicPage = await request(app).get("/");
    expect(publicPage.status).toBe(200);
    expect(publicPage.text).toContain("취향이 만나는 테스트 살롱");
    expect(publicPage.text).toContain("클래식으로 시작하는 새로운 인연");
    expect(publicPage.text).toContain("서울 강남권에서 만나는 취향 기반 로테이션 소개팅");
    expect(publicPage.text).toContain("검증된 신청 폼");
    expect(publicPage.text).toContain("피아니스트");
    expect(publicPage.text).toContain("https://www.instagram.com/doyoulike.classic");
    expect(publicPage.text).toContain("@doyoulike.classic");
    expect(publicPage.text).toContain("https://www.instagram.com/reel/demo-one");
    expect(publicPage.text).toContain("https://www.instagram.com/reel/demo-two");
    expect(publicPage.text).toContain("신청은 어떻게 하나요?");
    expect(publicPage.text).toContain("선정자에게 개별 안내합니다.");
    expect(publicPage.text).toContain("hello@doyoulikeclassic.com");
    expect(publicPage.text).toContain("demo.doyoulikeclassic.com");
    expect(publicPage.text).toContain("테스트 클래식 살롱");
    expect(publicPage.text).toContain("홍길동");
    expect(publicPage.text).toContain("123-45-67890");
  });

  it("rejects unsafe landing content without partially updating blocks", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const agent = request.agent(app);
    const csrfToken = await login(agent);
    const beforeHero = app.locals.db
      .prepare("select value_json from content_blocks where block_key = ?")
      .get("hero");
    const beforeInstagram = app.locals.db
      .prepare("select value_json from content_blocks where block_key = ?")
      .get("instagram");

    const response = await agent.post("/admin/content").send(contentPayload({
      csrfToken,
      heroHeadline: "업데이트되면 안 됨",
      instagramUrl: "http://www.instagram.com/doyoulike.classic",
      instagramReelsText: "https://www.instagram.com/reel/demo-one"
    }));

    expect(response.status).toBe(400);
    expect(app.locals.db
      .prepare("select value_json from content_blocks where block_key = ?")
      .get("hero")).toEqual(beforeHero);
    expect(app.locals.db
      .prepare("select value_json from content_blocks where block_key = ?")
      .get("instagram")).toEqual(beforeInstagram);
  });
});
