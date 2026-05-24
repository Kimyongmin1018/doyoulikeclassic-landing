import { describe, expect, it } from "vitest";
import { buildPublicModel, getContentBlocks, getCtaForStatus } from "../src/services/publicModel.js";
import { createDatabase } from "../src/db/database.js";
import { seedDatabase } from "../src/db/seed.js";

describe("public model", () => {
  it.each([
    ["open", { label: "이번 기수 신청하기", enabled: true }],
    ["closing-soon", { label: "마감 전 신청하기", enabled: true }],
    ["closed", { label: "모집 마감", enabled: false }],
    ["scheduled", { label: "신청 오픈 예정", enabled: false }],
    ["hidden", { label: "신청 오픈 예정", enabled: false }],
    ["unknown", { label: "신청 오픈 예정", enabled: false }],
    [undefined, { label: "신청 오픈 예정", enabled: false }]
  ])("maps %s to CTA state", (status, expected) => {
    expect(getCtaForStatus(status)).toEqual(expected);
  });

  it("returns a landing model without applicant or admin session data", () => {
    const db = createDatabase(":memory:");
    seedDatabase(db);

    const model = buildPublicModel(db);
    const serializedModel = JSON.stringify(model);

    expect(model.serviceName).toBe("클래식을 좋아하세요");
    expect(model.featuredEvent.publicTitle).toBe("클래식을 좋아하세요 6기");
    expect(model.featuredEvent.timeSlots).toHaveLength(2);
    expect(model.featuredEvent.priceRows).toHaveLength(4);
    expect(model.featuredEvent.cta).toEqual({ label: "이번 기수 신청하기", enabled: true });
    expect(model.hasOpenApplication).toBe(true);
    expect(serializedModel).not.toContain("admin_sessions");
    expect(serializedModel).not.toContain("token_hash");
    expect(serializedModel).not.toContain("applicant");
  });

  it.each([
    ["not featured", "is_featured = 0"],
    ["not visible", "is_visible = 0"],
    ["hidden", "status = 'hidden'"]
  ])("returns null featured event and closed application state when the event is %s", (_caseName, updateSet) => {
    const db = createDatabase(":memory:");
    seedDatabase(db);
    db.prepare(`update events set ${updateSet} where id = ?`).run("classic-rotation-6");

    const model = buildPublicModel(db);

    expect(model.featuredEvent).toBeNull();
    expect(model.hasOpenApplication).toBe(false);
  });

  it("returns time slots and price rows in sort order", () => {
    const db = createDatabase(":memory:");
    seedDatabase(db);
    db.prepare("update event_time_slots set sort_order = ? where id = ?").run(20, "classic-rotation-6-slot-1");
    db.prepare("update event_time_slots set sort_order = ? where id = ?").run(10, "classic-rotation-6-slot-2");
    db.prepare("update event_price_rows set sort_order = ? where id = ?").run(40, "classic-rotation-6-price-base");
    db.prepare("update event_price_rows set sort_order = ? where id = ?").run(10, "classic-rotation-6-price-companion");
    db.prepare("update event_price_rows set sort_order = ? where id = ?").run(30, "classic-rotation-6-price-alumni");
    db.prepare("update event_price_rows set sort_order = ? where id = ?").run(20, "classic-rotation-6-price-early-bird");

    const model = buildPublicModel(db);

    expect(model.featuredEvent.timeSlots.map((slot) => slot.label)).toEqual(["2회차", "1회차"]);
    expect(model.featuredEvent.priceRows.map((row) => row.label)).toEqual([
      "동반 할인",
      "얼리버드 할인",
      "이전 기수 할인",
      "기본"
    ]);
  });

  it("returns key public event fields in camelCase", () => {
    const db = createDatabase(":memory:");
    seedDatabase(db);

    const model = buildPublicModel(db);

    expect(model.featuredEvent).toEqual(
      expect.objectContaining({
        eventDate: "6/13 토요일",
        venueNote: "논현역 인근, 참여 확정자에게 개별 안내",
        capacityNote: "최대 10:10",
        applicationConditions: "92-06년생 남자 / 94-06년생 여자",
        googleFormUrl: "https://forms.gle/example-replace-before-launch"
      })
    );
    expect(model.featuredEvent.timeSlots[0]).toEqual(
      expect.objectContaining({
        startsAt: "16:00",
        endsAt: "18:00"
      })
    );
    expect(model.featuredEvent).not.toHaveProperty("event_date");
    expect(model.featuredEvent).not.toHaveProperty("venue_note");
    expect(model.featuredEvent).not.toHaveProperty("capacity_note");
    expect(model.featuredEvent).not.toHaveProperty("application_conditions");
    expect(model.featuredEvent).not.toHaveProperty("google_form_url");
    expect(model.featuredEvent.timeSlots[0]).not.toHaveProperty("starts_at");
    expect(model.featuredEvent.timeSlots[0]).not.toHaveProperty("ends_at");
  });

  it.each(["closed", "scheduled"])("does not expose application URLs for %s events", (status) => {
    const db = createDatabase(":memory:");
    seedDatabase(db);
    db.prepare("update events set status = ? where id = ?").run(status, "classic-rotation-6");

    const model = buildPublicModel(db);

    expect(model.featuredEvent.cta.enabled).toBe(false);
    expect(model.featuredEvent.googleFormUrl).toBe("");
    expect(model.hasOpenApplication).toBe(false);
  });

  it.each([
    ["javascript URL", "javascript:alert(1)"],
    ["http URL", "http://forms.gle/insecure"],
    ["relative URL", "/apply"],
    ["malformed URL", "https://[broken"]
  ])("does not expose unsafe application URLs for %s", (_caseName, googleFormUrl) => {
    const db = createDatabase(":memory:");
    seedDatabase(db);
    db.prepare("update events set google_form_url = ? where id = ?").run(googleFormUrl, "classic-rotation-6");

    const model = buildPublicModel(db);

    expect(model.featuredEvent.googleFormUrl).toBe("");
    expect(model.hasOpenApplication).toBe(false);
  });

  it("uses safe content fallbacks when content is missing or malformed", () => {
    const db = createDatabase(":memory:");
    seedDatabase(db);
    db.prepare("delete from content_blocks where block_key = ?").run("participants");
    db.prepare("update content_blocks set value_json = ? where block_key = ?").run("{broken", "faq");

    expect(getContentBlocks(db)).toEqual({
      hero: expect.objectContaining({
        headline: expect.any(String),
        subheadline: expect.any(String),
        badges: expect.any(Array)
      }),
      participants: [],
      instagram: expect.objectContaining({
        handle: expect.any(String),
        url: expect.any(String),
        reels: expect.any(Array)
      }),
      faq: [],
      legal: expect.any(Object)
    });
  });

  it.each([
    ["javascript URL", "javascript:alert(1)"],
    ["http URL", "http://www.instagram.com/doyoulike.classic"],
    ["relative URL", "/doyoulike.classic"],
    ["malformed URL", "https://[broken"]
  ])("filters unsafe instagram URLs for %s", (_caseName, unsafeUrl) => {
    const db = createDatabase(":memory:");
    seedDatabase(db);
    const validReel = "https://www.instagram.com/reel/safe";
    const instagram = {
      handle: "@doyoulike.classic",
      url: unsafeUrl,
      reels: [unsafeUrl, validReel]
    };
    db.prepare("update content_blocks set value_json = ? where block_key = ?").run(
      JSON.stringify(instagram),
      "instagram"
    );

    const model = buildPublicModel(db);

    expect(model.content.instagram.url).toBe("");
    expect(model.content.instagram.reels).toEqual([validReel]);
  });

  it.each([
    ["hero", null, { hero: { headline: "", subheadline: "", badges: [] } }],
    ["hero", "headline", { hero: { headline: "", subheadline: "", badges: [] } }],
    ["hero", [], { hero: { headline: "", subheadline: "", badges: [] } }],
    ["hero", { headline: "Only headline" }, { hero: { headline: "", subheadline: "", badges: [] } }],
    ["participants", null, { participants: [] }],
    ["participants", "민지", { participants: [] }],
    ["participants", {}, { participants: [] }],
    ["participants", ["민지", 3], { participants: [] }],
    ["instagram", null, { instagram: { handle: "", url: "", reels: [] } }],
    ["instagram", "classic.rotation", { instagram: { handle: "", url: "", reels: [] } }],
    ["instagram", [], { instagram: { handle: "", url: "", reels: [] } }],
    ["instagram", {}, { instagram: { handle: "", url: "", reels: [] } }],
    ["faq", null, { faq: [] }],
    ["faq", "질문", { faq: [] }],
    ["faq", {}, { faq: [] }],
    ["faq", [{ question: "언제인가요?" }, "답변"], { faq: [] }],
    ["legal", null, { legal: {} }],
    ["legal", "법적 고지", { legal: {} }],
    ["legal", [], { legal: {} }]
  ])("falls back safely when %s content has wrong-but-valid JSON shape %#", (blockKey, value, expected) => {
    const db = createDatabase(":memory:");
    seedDatabase(db);
    db.prepare("update content_blocks set value_json = ? where block_key = ?").run(JSON.stringify(value), blockKey);

    expect(getContentBlocks(db)).toMatchObject(expected);
  });

  it("preserves legal content when it is an object", () => {
    const db = createDatabase(":memory:");
    seedDatabase(db);
    const legal = { privacy: "개인정보 처리방침", terms: ["이용약관"] };
    db.prepare("update content_blocks set value_json = ? where block_key = ?").run(JSON.stringify(legal), "legal");

    expect(getContentBlocks(db).legal).toEqual(legal);
  });
});
