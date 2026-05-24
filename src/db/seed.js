import { nanoid } from "nanoid";
import { loadConfig } from "../config.js";
import { createDatabase, withTransaction } from "./database.js";

const EVENT_ID = "classic-rotation-6";

const timeSlots = [
  ["1회차", "16:00", "18:00", 1],
  ["2회차", "18:30", "20:30", 2]
];

const priceRows = [
  ["기본", "40,000원", "", 1],
  ["동반 할인", "32,000원", "40,000원에서 32,000원으로 할인", 2],
  ["이전 기수 할인", "35,000원", "40,000원에서 35,000원으로 할인", 3],
  ["얼리버드 할인", "33,000원", "6/3까지 40,000원에서 33,000원으로 할인", 4]
];

const contentBlocks = {
  hero: {
    eyebrow: "국내 최초 클래식 로테이션 소개팅",
    headline: "클래식을 좋아하세요..? 같은 취향이 설렘이 되는 밤.",
    subheadline:
      "클래식을 사랑하는 사람들이 자연스럽게 연결되는 특별한 만남입니다. 좋아하는 음악과 공연 이야기를 나누며 짧지만 깊은 대화 속에서 서로의 분위기와 취향을 알아갑니다.",
    badges: ["누적 신청자 500명 이상", "5-10명 순차 대화", "서울 강남권", "선정자 개별 안내"]
  },
  participants: [
    "클래식 전공자",
    "개발자",
    "교사",
    "연구원",
    "금융권 종사자"
  ],
  instagram: {
    handle: "@doyoulike.classic",
    url: "https://www.instagram.com/doyoulike.classic",
    reels: [
      "https://www.instagram.com/reel/DVKbkOuk1Q8/?igsh=MXY3NDBjeWJpY2Vleg==",
      "https://www.instagram.com/reel/DVyRf8qE-fs/?igsh=ZmkweXUyY2F2dW8=",
      "https://www.instagram.com/reel/DV-68kHk0Jx/?igsh=cWF0Nm5vejQ0Znox",
      "https://www.instagram.com/reel/DWrNwa8k7ZY/?igsh=MmI2emV3c2x3N2l6"
    ]
  },
  faq: [
    {
      question: "신청은 선착순인가요?",
      answer:
        "아니요. 제출해주신 구글폼 내용을 바탕으로 성비와 나이대를 조율한 뒤 최종 참여자 선정 후 개별 연락드립니다."
    },
    {
      question: "클래식 전공자가 아니어도 신청할 수 있나요?",
      answer:
        "네. 클래식을 좋아하거나 공연과 음악 이야기를 자연스럽게 나누고 싶은 분이라면 신청할 수 있습니다."
    },
    {
      question: "결제는 언제 하나요?",
      answer:
        "구글폼 신청 후 참여가 확정된 분께 운영자가 별도로 참가비 안내를 드립니다."
    },
    {
      question: "개인정보는 어디에 저장되나요?",
      answer:
        "신청 정보는 구글폼에서 수집되며, 이 웹사이트 데이터베이스에는 신청자 개인정보를 저장하지 않습니다."
    }
  ],
  legal: {
    businessName: "상호명 입력 예정",
    representative: "대표자 입력 예정",
    registrationNumber: "사업자등록번호 입력 예정",
    contact: "문의 채널 입력 예정",
    domain: "www.doyoulikeclassic.com"
  }
};

export function seedDatabase(db) {
  withTransaction(db, () => {
    db.prepare(
      `
      insert into events (
        id, internal_name, public_title, generation_label, event_date, region,
        venue_note, capacity_note, application_conditions, status, google_form_url,
        is_featured, is_visible
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(id) do update set
        public_title = excluded.public_title,
        generation_label = excluded.generation_label,
        event_date = excluded.event_date,
        region = excluded.region,
        venue_note = excluded.venue_note,
        capacity_note = excluded.capacity_note,
        application_conditions = excluded.application_conditions,
        status = excluded.status,
        google_form_url = excluded.google_form_url,
        is_featured = excluded.is_featured,
        is_visible = excluded.is_visible,
        updated_at = datetime('now')
    `
    ).run(
      EVENT_ID,
      "notion-seed-6",
      "클래식을 좋아하세요 6기",
      "6기 모집",
      "6/13 토요일",
      "서울 강남권",
      "논현역 인근, 참여 확정자에게 개별 안내",
      "최대 10:10",
      "92-06년생 남자 / 94-06년생 여자",
      "open",
      "https://forms.gle/example-replace-before-launch",
      1,
      1
    );

    db.prepare("delete from event_time_slots where event_id = ?").run(EVENT_ID);
    const insertTimeSlot = db.prepare(
      "insert into event_time_slots (id, event_id, label, starts_at, ends_at, sort_order) values (?, ?, ?, ?, ?, ?)"
    );
    timeSlots.forEach(([label, startsAt, endsAt, sortOrder]) => {
      insertTimeSlot.run(nanoid(), EVENT_ID, label, startsAt, endsAt, sortOrder);
    });

    db.prepare("delete from event_price_rows where event_id = ?").run(EVENT_ID);
    const insertPriceRow = db.prepare(
      "insert into event_price_rows (id, event_id, label, amount, note, sort_order) values (?, ?, ?, ?, ?, ?)"
    );
    priceRows.forEach(([label, amount, note, sortOrder]) => {
      insertPriceRow.run(nanoid(), EVENT_ID, label, amount, note, sortOrder);
    });

    const upsertContentBlock = db.prepare(
      `
        insert into content_blocks (block_key, value_json)
        values (?, ?)
        on conflict(block_key) do update set
          value_json = excluded.value_json,
          updated_at = datetime('now')
      `
    );
    Object.entries(contentBlocks).forEach(([key, value]) => {
      upsertContentBlock.run(key, JSON.stringify(value));
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const db = createDatabase(config.dbPath);
  seedDatabase(db);
  db.close();
  console.log(`Seeded database at ${config.dbPath}`);
}
