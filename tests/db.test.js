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

  it("preserves admin edits to seeded event, child rows, and hero content when reseeded", () => {
    const db = createDatabase(":memory:");
    seedDatabase(db);

    const customHero = {
      eyebrow: "관리자 수정",
      headline: "관리자가 바꾼 히어로",
      subheadline: "반복 시딩 후에도 유지되어야 합니다.",
      badges: ["수정 유지"]
    };

    db.prepare(
      "update events set public_title = ?, google_form_url = ? where id = ?"
    ).run("관리자가 수정한 6기", "https://forms.gle/admin-managed", "classic-rotation-6");
    db.prepare(
      "update event_time_slots set starts_at = ?, ends_at = ? where event_id = ? and label = ?"
    ).run("17:00", "19:00", "classic-rotation-6", "1회차");
    db.prepare(
      "update event_price_rows set amount = ?, note = ? where event_id = ? and label = ?"
    ).run("45,000원", "관리자 가격", "classic-rotation-6", "기본");
    db.prepare(
      "update content_blocks set value_json = ? where block_key = ?"
    ).run(JSON.stringify(customHero), "hero");

    seedDatabase(db);

    const event = db
      .prepare("select public_title, google_form_url from events where id = ?")
      .get("classic-rotation-6");
    const timeSlot = db
      .prepare("select starts_at, ends_at from event_time_slots where event_id = ? and label = ?")
      .get("classic-rotation-6", "1회차");
    const priceRow = db
      .prepare("select amount, note from event_price_rows where event_id = ? and label = ?")
      .get("classic-rotation-6", "기본");
    const hero = db.prepare("select value_json from content_blocks where block_key = ?").get("hero");

    expect(event).toEqual({
      public_title: "관리자가 수정한 6기",
      google_form_url: "https://forms.gle/admin-managed"
    });
    expect(timeSlot).toEqual({ starts_at: "17:00", ends_at: "19:00" });
    expect(priceRow).toEqual({ amount: "45,000원", note: "관리자 가격" });
    expect(JSON.parse(hero.value_json)).toEqual(customHero);
  });

  it("preserves renamed seeded child rows without recreating default labels when reseeded", () => {
    const db = createDatabase(":memory:");
    seedDatabase(db);

    db.prepare(
      "update event_time_slots set label = ?, starts_at = ?, ends_at = ? where id = ?"
    ).run("관리자 수정 회차", "17:00", "19:00", "classic-rotation-6-slot-1");
    db.prepare(
      "update event_price_rows set label = ?, amount = ?, note = ? where id = ?"
    ).run("관리자 수정 가격", "45,000원", "관리자 가격", "classic-rotation-6-price-base");

    seedDatabase(db);

    const timeSlots = db
      .prepare("select id, label, starts_at, ends_at from event_time_slots where event_id = ? order by sort_order")
      .all("classic-rotation-6");
    const priceRows = db
      .prepare("select id, label, amount, note from event_price_rows where event_id = ? order by sort_order")
      .all("classic-rotation-6");

    expect(timeSlots).toEqual([
      {
        id: "classic-rotation-6-slot-1",
        label: "관리자 수정 회차",
        starts_at: "17:00",
        ends_at: "19:00"
      },
      {
        id: "classic-rotation-6-slot-2",
        label: "2회차",
        starts_at: "18:30",
        ends_at: "20:30"
      }
    ]);
    expect(priceRows).toEqual([
      {
        id: "classic-rotation-6-price-base",
        label: "관리자 수정 가격",
        amount: "45,000원",
        note: "관리자 가격"
      },
      {
        id: "classic-rotation-6-price-companion",
        label: "동반 할인",
        amount: "32,000원",
        note: "40,000원에서 32,000원으로 할인"
      },
      {
        id: "classic-rotation-6-price-alumni",
        label: "이전 기수 할인",
        amount: "35,000원",
        note: "40,000원에서 35,000원으로 할인"
      },
      {
        id: "classic-rotation-6-price-early-bird",
        label: "얼리버드 할인",
        amount: "33,000원",
        note: "6/3까지 40,000원에서 33,000원으로 할인"
      }
    ]);
  });

  it("preserves an existing featured admin event when reseeded", () => {
    const db = createDatabase(":memory:");
    seedDatabase(db);

    db.prepare("update events set is_featured = 0 where id = ?").run("classic-rotation-6");
    db.prepare(
      "insert into events (id, internal_name, public_title, generation_label, status, is_featured, is_visible) values (?, ?, ?, ?, ?, ?, ?)"
    ).run("admin-featured", "admin-featured", "관리자 대표 이벤트", "7기 예정", "scheduled", 1, 1);

    expect(() => seedDatabase(db)).not.toThrow();

    const featured = db.prepare("select id from events where is_featured = 1").get();
    const seeded = db.prepare("select is_featured from events where id = ?").get("classic-rotation-6");

    expect(featured.id).toBe("admin-featured");
    expect(seeded.is_featured).toBe(0);
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
