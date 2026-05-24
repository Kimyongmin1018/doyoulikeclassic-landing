import { nanoid } from "nanoid";
import { z } from "zod";

const httpsUrl = z
  .string()
  .trim()
  .url("유효한 URL을 입력해 주세요.")
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "https URL만 사용할 수 있습니다.");

export const eventInputSchema = z.object({
  publicTitle: z.string().trim().min(1).max(80),
  generationLabel: z.string().trim().min(1).max(40),
  eventDate: z.string().trim().min(1).max(40),
  region: z.string().trim().min(1).max(40),
  venueNote: z.string().trim().min(1).max(120),
  capacityNote: z.string().trim().min(1).max(60),
  applicationConditions: z.string().trim().min(1).max(120),
  status: z.enum(["open", "closing-soon", "closed", "scheduled", "hidden"]),
  googleFormUrl: httpsUrl,
  timeSlotsText: z.string().optional(),
  priceRowsText: z.string().optional()
});

export const contentInputSchema = z.object({
  heroEyebrow: z.string().trim().min(1).max(80),
  heroHeadline: z.string().trim().min(1).max(140),
  heroSubheadline: z.string().trim().min(1).max(500),
  heroBadgesText: z.string().trim().min(1).max(500),
  participantsText: z.string().trim().min(1).max(500),
  instagramUrl: httpsUrl,
  instagramHandle: z.string().trim().min(1).max(60),
  instagramReelsText: z.string().trim().max(1200).optional().default(""),
  faqText: z.string().trim().min(1).max(3000),
  businessName: z.string().trim().min(1).max(80),
  representative: z.string().trim().min(1).max(80),
  registrationNumber: z.string().trim().min(1).max(80),
  contact: z.string().trim().min(1).max(120),
  domain: z.string().trim().min(1).max(80)
});

export function listEvents(db) {
  return db.prepare("select * from events order by is_featured desc, created_at desc")
    .all()
    .map((event) => mapEventForAdmin(db, event));
}

function getTimeSlotsText(db, eventId) {
  const rows = db.prepare(`
    select label, starts_at as startsAt, ends_at as endsAt
    from event_time_slots
    where event_id = ?
    order by sort_order asc
  `).all(eventId);

  return serializeTimeSlotsText(rows);
}

function getPriceRowsText(db, eventId) {
  const rows = db.prepare(`
    select label, amount, note
    from event_price_rows
    where event_id = ?
    order by sort_order asc
  `).all(eventId);

  return serializePriceRowsText(rows);
}

function mapEventForAdmin(db, event) {
  if (!event) return null;

  return {
    id: event.id,
    publicTitle: event.public_title,
    generationLabel: event.generation_label,
    eventDate: event.event_date,
    region: event.region,
    venueNote: event.venue_note,
    capacityNote: event.capacity_note,
    applicationConditions: event.application_conditions,
    status: event.status,
    googleFormUrl: event.google_form_url,
    timeSlotsText: getTimeSlotsText(db, event.id),
    priceRowsText: getPriceRowsText(db, event.id),
    isFeatured: Boolean(event.is_featured),
    isVisible: Boolean(event.is_visible)
  };
}

export function getFeaturedEventForAdmin(db) {
  const event = db.prepare("select * from events where is_featured = 1 limit 1").get();
  return mapEventForAdmin(db, event);
}

export function getEventForAdmin(db, id) {
  return db.prepare("select * from events where id = ?").get(id) || null;
}

function parseLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseRequiredLines(text, message) {
  const lines = parseLines(text);

  if (lines.length === 0) {
    throw new Error(message);
  }

  return lines;
}

function parseDelimitedRows(text, expectedParts, message, mapper) {
  const lines = parseLines(text);

  if (lines.length === 0) {
    throw new Error(message);
  }

  return lines.map((line) => {
    const parts = line.split("|").map((part) => part.trim());
    const hasExpectedPartCount = Array.isArray(expectedParts)
      ? expectedParts.includes(parts.length)
      : parts.length === expectedParts;

    if (!hasExpectedPartCount) {
      throw new Error(message);
    }

    return mapper(parts, message);
  });
}

export function parseTimeSlotsText(text) {
  return parseDelimitedRows(text, 3, "시간은 label|startsAt|endsAt 형식으로 입력해 주세요.", (parts, message) => {
    const [label, startsAt, endsAt] = parts;
    if (!label || !startsAt || !endsAt) {
      throw new Error(message);
    }

    return { label, startsAt, endsAt };
  });
}

export function parsePriceRowsText(text) {
  return parseDelimitedRows(text, [2, 3], "참가비는 label|amount|note 형식으로 입력해 주세요.", (parts, message) => {
    const [label, amount, note = ""] = parts;
    if (!label || !amount) {
      throw new Error(message);
    }

    return { label, amount, note };
  });
}

export function serializeTimeSlotsText(rows) {
  return rows
    .map((row) => `${row.label}|${row.startsAt}|${row.endsAt}`)
    .join("\n");
}

export function serializePriceRowsText(rows) {
  return rows
    .map((row) => `${row.label}|${row.amount}|${row.note || ""}`)
    .join("\n");
}

function parseHttpsLines(text, message) {
  return parseLines(text).map((line) => {
    const result = httpsUrl.safeParse(line);

    if (!result.success) {
      throw new Error(message);
    }

    return result.data;
  });
}

function parseFaqText(text) {
  return parseRequiredLines(text, "FAQ는 question|answer 형식으로 입력해 주세요.").map((line) => {
    const separatorIndex = line.indexOf("|");

    if (separatorIndex <= 0 || separatorIndex === line.length - 1) {
      throw new Error("FAQ는 question|answer 형식으로 입력해 주세요.");
    }

    const question = line.slice(0, separatorIndex).trim();
    const answer = line.slice(separatorIndex + 1).trim();

    if (!question || !answer) {
      throw new Error("FAQ는 question|answer 형식으로 입력해 주세요.");
    }

    return { question, answer };
  });
}

function serializeLines(rows) {
  return rows.join("\n");
}

function serializeFaqText(rows) {
  return rows
    .map((row) => `${row.question}|${row.answer}`)
    .join("\n");
}

function readJsonBlock(db, key, fallback) {
  const row = db.prepare("select value_json from content_blocks where block_key = ?").get(key);

  if (!row) return fallback;

  try {
    return JSON.parse(row.value_json);
  } catch {
    return fallback;
  }
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function normalizeFaq(value) {
  return Array.isArray(value)
    ? value.filter((item) => item && typeof item.question === "string" && typeof item.answer === "string")
    : [];
}

function upsertContentBlock(db, key, value) {
  db.prepare(`
    insert into content_blocks (block_key, value_json, updated_at)
    values (?, ?, datetime('now'))
    on conflict(block_key) do update set
      value_json = excluded.value_json,
      updated_at = datetime('now')
  `).run(key, JSON.stringify(value));
}

export function getContentForAdmin(db) {
  const hero = readJsonBlock(db, "hero", {});
  const participants = readJsonBlock(db, "participants", []);
  const instagram = readJsonBlock(db, "instagram", {});
  const faq = readJsonBlock(db, "faq", []);
  const legal = readJsonBlock(db, "legal", {});

  return {
    heroEyebrow: typeof hero.eyebrow === "string" ? hero.eyebrow : "",
    heroHeadline: typeof hero.headline === "string" ? hero.headline : "",
    heroSubheadline: typeof hero.subheadline === "string" ? hero.subheadline : "",
    heroBadgesText: serializeLines(normalizeArray(hero.badges)),
    participantsText: serializeLines(normalizeArray(participants)),
    instagramUrl: typeof instagram.url === "string" ? instagram.url : "",
    instagramHandle: typeof instagram.handle === "string" ? instagram.handle : "",
    instagramReelsText: serializeLines(normalizeArray(instagram.reels)),
    faqText: serializeFaqText(normalizeFaq(faq)),
    businessName: typeof legal.businessName === "string" ? legal.businessName : "",
    representative: typeof legal.representative === "string" ? legal.representative : "",
    registrationNumber: typeof legal.registrationNumber === "string" ? legal.registrationNumber : "",
    contact: typeof legal.contact === "string" ? legal.contact : "",
    domain: typeof legal.domain === "string" ? legal.domain : "www.doyoulikeclassic.com"
  };
}

function replaceTimeSlots(db, eventId, rows) {
  db.prepare("delete from event_time_slots where event_id = ?").run(eventId);

  const insert = db.prepare(`
    insert into event_time_slots (id, event_id, label, starts_at, ends_at, sort_order)
    values (?, ?, ?, ?, ?, ?)
  `);

  rows.forEach((row, index) => {
    insert.run(nanoid(), eventId, row.label, row.startsAt, row.endsAt, index + 1);
  });
}

function replacePriceRows(db, eventId, rows) {
  db.prepare("delete from event_price_rows where event_id = ?").run(eventId);

  const insert = db.prepare(`
    insert into event_price_rows (id, event_id, label, amount, note, sort_order)
    values (?, ?, ?, ?, ?, ?)
  `);

  rows.forEach((row, index) => {
    insert.run(nanoid(), eventId, row.label, row.amount, row.note, index + 1);
  });
}

export function updateEvent(db, id, input) {
  const data = eventInputSchema.parse(input);
  const timeSlots = data.timeSlotsText === undefined ? null : parseTimeSlotsText(data.timeSlotsText);
  const priceRows = data.priceRowsText === undefined ? null : parsePriceRowsText(data.priceRowsText);

  return db.transaction(() => {
    const result = db.prepare(`
      update events set
        public_title = ?,
        generation_label = ?,
        event_date = ?,
        region = ?,
        venue_note = ?,
        capacity_note = ?,
        application_conditions = ?,
        status = ?,
        google_form_url = ?,
        updated_at = datetime('now')
      where id = ?
    `).run(
      data.publicTitle,
      data.generationLabel,
      data.eventDate,
      data.region,
      data.venueNote,
      data.capacityNote,
      data.applicationConditions,
      data.status,
      data.googleFormUrl,
      id
    );

    if (result.changes !== 1) return false;

    if (timeSlots) replaceTimeSlots(db, id, timeSlots);
    if (priceRows) replacePriceRows(db, id, priceRows);

    return true;
  })();
}

export function createEvent(db, input) {
  const data = eventInputSchema.parse(input);
  const id = nanoid();
  const timeSlots = data.timeSlotsText === undefined
    ? [{ label: "1회차", startsAt: "16:00", endsAt: "18:00" }]
    : parseTimeSlotsText(data.timeSlotsText);
  const priceRows = data.priceRowsText === undefined
    ? [{ label: "기본", amount: "40,000원", note: "" }]
    : parsePriceRowsText(data.priceRowsText);

  db.transaction(() => {
    db.prepare(`
      insert into events (
        id, internal_name, public_title, generation_label, event_date, region, venue_note,
        capacity_note, application_conditions, status, google_form_url, is_featured, is_visible
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
    `).run(
      id,
      `admin-${id}`,
      data.publicTitle,
      data.generationLabel,
      data.eventDate,
      data.region,
      data.venueNote,
      data.capacityNote,
      data.applicationConditions,
      data.status,
      data.googleFormUrl
    );

    replaceTimeSlots(db, id, timeSlots);
    replacePriceRows(db, id, priceRows);
  })();

  return id;
}

export function featureEvent(db, id) {
  return db.transaction(() => {
    const event = db.prepare("select 1 from events where id = ?").get(id);
    if (!event) return false;

    db.prepare("update events set is_featured = 0, updated_at = datetime('now')").run();
    const result = db.prepare(`
      update events
      set is_featured = 1, is_visible = 1, updated_at = datetime('now')
      where id = ?
    `).run(id);

    return result.changes === 1;
  })();
}

export function updateContent(db, input) {
  const data = contentInputSchema.parse(input);
  const badges = parseRequiredLines(data.heroBadgesText, "히어로 배지를 한 줄 이상 입력해 주세요.");
  const participants = parseRequiredLines(data.participantsText, "참여자 예시를 한 줄 이상 입력해 주세요.");
  const reels = parseHttpsLines(data.instagramReelsText, "인스타그램 릴스 URL은 https 형식으로 입력해 주세요.");
  const faq = parseFaqText(data.faqText);
  const currentHero = readJsonBlock(db, "hero", {});
  const currentInstagram = readJsonBlock(db, "instagram", {});
  const currentLegal = readJsonBlock(db, "legal", {});

  return db.transaction(() => {
    upsertContentBlock(db, "hero", {
      ...currentHero,
      eyebrow: data.heroEyebrow,
      headline: data.heroHeadline,
      subheadline: data.heroSubheadline,
      badges
    });
    upsertContentBlock(db, "participants", participants);
    upsertContentBlock(db, "instagram", {
      ...currentInstagram,
      url: data.instagramUrl,
      handle: data.instagramHandle,
      reels
    });
    upsertContentBlock(db, "faq", faq);
    upsertContentBlock(db, "legal", {
      ...currentLegal,
      businessName: data.businessName,
      representative: data.representative,
      registrationNumber: data.registrationNumber,
      contact: data.contact,
      domain: data.domain
    });
  })();
}
