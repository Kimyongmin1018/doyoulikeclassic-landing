import { loadConfig } from "../config.js";
import { createDatabase, withTransaction } from "./database.js";

const EVENT_ID = "classic-rotation-6";

const timeSlots = [
  ["classic-rotation-6-slot-1", "1회차", "16:00", "18:00", 1],
  ["classic-rotation-6-slot-2", "2회차", "18:30", "20:30", 2]
];

const priceRows = [
  ["classic-rotation-6-price-base", "기본", "35,000원", "", 1],
  ["classic-rotation-6-price-companion", "동반 할인", "35,000원", "", 2],
  ["classic-rotation-6-price-alumni", "이전 기수 할인", "35,000원", "", 3],
  ["classic-rotation-6-price-early-bird", "얼리버드 할인", "35,000원", "", 4]
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
  applicationStatus: {
    url: "https://doyoulikeclassic.notion.site/27281544f0928301a650015e4373f855",
    updatedLabel: "서울 강남권 6기 | 2026.05.24 기준",
    maleSummary: "남자 17명",
    femaleSummary: "여자 20명",
    maleRows: [
      "92년생 1명",
      "94년생 2명",
      "95년생 3명",
      "97년생 4명",
      "99년생 3명",
      "02년생 2명",
      "05년생 2명"
    ],
    femaleRows: [
      "94년생 1명",
      "95년생 2명",
      "97년생 3명",
      "98년생 4명",
      "00년생 4명",
      "02년생 3명",
      "05년생 3명"
    ],
    notes: [
      "성비와 연령대는 신청 흐름에 맞춰 수시로 조율합니다.",
      "지원현황은 노션 페이지에서 최신 기준으로 확인할 수 있습니다.",
      "최종 참여자는 구글폼 확인 후 개별 안내합니다."
    ]
  },
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

function migrateSeededChildRowIds(db, tableName, seededRows, identityColumns) {
  const stableRowExists = db.prepare(`select 1 from ${tableName} where id = ?`);
  const identityWhere = identityColumns.map((column) => `and ${column} = ?`).join("\n          ");
  const findLegacyRows = db.prepare(
    `
      select rowid
      from ${tableName}
      where event_id = ?
        ${identityWhere}
        and id <> ?
      order by sort_order, rowid
    `
  );
  const migrateLegacyRow = db.prepare(
    `
      update ${tableName}
      set id = ?
      where rowid = ?
    `
  );
  const deleteLegacyRow = db.prepare(`delete from ${tableName} where rowid = ?`);

  seededRows.forEach((seededRow) => {
    const [id, ...seedValues] = seededRow;
    const identityValues = seedValues.slice(0, identityColumns.length);
    const legacyRows = findLegacyRows.all(EVENT_ID, ...identityValues, id);

    if (!stableRowExists.get(id) && legacyRows.length > 0) {
      const [rowToMigrate, ...duplicateRows] = legacyRows;
      migrateLegacyRow.run(id, rowToMigrate.rowid);
      duplicateRows.forEach((row) => {
        deleteLegacyRow.run(row.rowid);
      });
      return;
    }

    legacyRows.forEach((row) => {
      deleteLegacyRow.run(row.rowid);
    });
  });
}

export function seedDatabase(db) {
  withTransaction(db, () => {
    const existingFeatured = db.prepare("select 1 from events where is_featured = 1 limit 1").get();

    db.prepare(
      `
      insert into events (
        id, internal_name, public_title, generation_label, event_date, region,
        venue_note, capacity_note, application_conditions, status, google_form_url,
        is_featured, is_visible
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(id) do nothing
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
      "https://forms.gle/3jSCCw38u8auqJ7Y6",
      existingFeatured ? 0 : 1,
      1
    );

    migrateSeededChildRowIds(db, "event_time_slots", timeSlots, ["label", "starts_at", "ends_at"]);

    const insertTimeSlot = db.prepare(
      `
        insert into event_time_slots (id, event_id, label, starts_at, ends_at, sort_order)
        values (?, ?, ?, ?, ?, ?)
        on conflict(id) do nothing
      `
    );
    timeSlots.forEach(([id, label, startsAt, endsAt, sortOrder]) => {
      insertTimeSlot.run(id, EVENT_ID, label, startsAt, endsAt, sortOrder);
    });

    migrateSeededChildRowIds(db, "event_price_rows", priceRows, ["label", "amount", "note"]);

    const insertPriceRow = db.prepare(
      `
        insert into event_price_rows (id, event_id, label, amount, note, sort_order)
        values (?, ?, ?, ?, ?, ?)
        on conflict(id) do nothing
      `
    );
    priceRows.forEach(([id, label, amount, note, sortOrder]) => {
      insertPriceRow.run(id, EVENT_ID, label, amount, note, sortOrder);
    });

    const insertContentBlock = db.prepare(
      `
        insert into content_blocks (block_key, value_json)
        values (?, ?)
        on conflict(block_key) do nothing
      `
    );
    Object.entries(contentBlocks).forEach(([key, value]) => {
      insertContentBlock.run(key, JSON.stringify(value));
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
