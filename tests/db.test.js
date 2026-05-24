import { describe, expect, it } from "vitest";
import { createDatabase } from "../src/db/database.js";
import { seedDatabase } from "../src/db/seed.js";

describe("database", () => {
  it("seeds one featured event and editable content", () => {
    const db = createDatabase(":memory:");
    seedDatabase(db);

    const event = db.prepare("select * from events where is_featured = 1").get();
    const faq = db.prepare("select * from content_blocks where block_key = ?").get("faq");

    expect(event.public_title).toBe("클래식을 좋아하세요 6기");
    expect(event.status).toBe("open");
    expect(event.event_date).toBe("6/13 토요일");
    expect(event.region).toBe("서울 강남권");
    expect(event.venue_note).toBe("논현역 인근, 참여 확정자에게 개별 안내");
    expect(event.capacity_note).toBe("최대 10:10");
    expect(event.application_conditions).toBe("92-06년생 남자 / 94-06년생 여자");
    expect(faq.value_json).toContain("선착순");
  });

  it("seeds event time slots and price rows", () => {
    const db = createDatabase(":memory:");
    seedDatabase(db);

    const timeSlots = db
      .prepare("select label, starts_at, ends_at from event_time_slots where event_id = ? order by sort_order")
      .all("classic-rotation-6");
    const priceRows = db
      .prepare("select label, amount from event_price_rows where event_id = ? order by sort_order")
      .all("classic-rotation-6");

    expect(timeSlots).toEqual([
      { label: "1회차", starts_at: "16:00", ends_at: "18:00" },
      { label: "2회차", starts_at: "18:30", ends_at: "20:30" }
    ]);
    expect(priceRows).toEqual([
      { label: "기본", amount: "40,000원" },
      { label: "동반 할인", amount: "32,000원" },
      { label: "이전 기수 할인", amount: "35,000원" },
      { label: "얼리버드 할인", amount: "33,000원" }
    ]);
  });

  it("seeds required editable content blocks", () => {
    const db = createDatabase(":memory:");
    seedDatabase(db);

    const blockKeys = db
      .prepare("select block_key from content_blocks order by block_key")
      .all()
      .map((row) => row.block_key);

    expect(blockKeys).toEqual(["faq", "hero", "instagram", "legal", "participants"]);
  });

  it("prevents more than one featured event", () => {
    const db = createDatabase(":memory:");
    seedDatabase(db);

    expect(() => {
      db.prepare(
        "insert into events (id, internal_name, public_title, generation_label, status, is_featured, is_visible) values (?, ?, ?, ?, ?, ?, ?)"
      ).run("second", "second", "다음 기수", "7기 예정", "scheduled", 1, 1);
    }).toThrow();

    const featured = db.prepare("select count(*) as count from events where is_featured = 1").get();
    expect(featured.count).toBe(1);
  });
});
