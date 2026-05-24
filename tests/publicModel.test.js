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

  it("returns null featured event and closed application state when no visible featured event exists", () => {
    const db = createDatabase(":memory:");
    seedDatabase(db);
    db.prepare("update events set is_visible = 0 where id = ?").run("classic-rotation-6");

    const model = buildPublicModel(db);

    expect(model.featuredEvent).toBeNull();
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
});
