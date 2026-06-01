import { z } from "zod";

const ctaStates = {
  open: { label: "이번 기수 신청하기", enabled: true },
  "closing-soon": { label: "마감 전 신청하기", enabled: true },
  closed: { label: "모집 마감", enabled: false },
  scheduled: { label: "신청 오픈 예정", enabled: false },
  hidden: { label: "신청 오픈 예정", enabled: false }
};

const contentFallbacks = {
  hero: { headerTitle: "", eyebrow: "", headline: "", subheadline: "", badges: [], nextCtaLabel: "" },
  participants: [],
  applicationStatus: {
    url: "",
    updatedLabel: "",
    maleSummary: "",
    femaleSummary: "",
    maleRows: [],
    femaleRows: [],
    notes: []
  },
  instagram: { handle: "", url: "", reels: [] },
  faq: [],
  legal: {},
  seo: {
    title: "",
    description: "",
    imageUrl: "",
    imageAlt: "",
    naverVerification: ""
  }
};

const contentSchemas = {
  hero: z.object({
    headerTitle: z.string().optional(),
    eyebrow: z.string().optional(),
    headline: z.string(),
    subheadline: z.string(),
    badges: z.array(z.string()),
    nextCtaLabel: z.string().optional()
  }),
  participants: z.array(z.string()),
  applicationStatus: z.object({
    url: z.string(),
    updatedLabel: z.string(),
    maleSummary: z.string(),
    femaleSummary: z.string(),
    maleRows: z.array(z.string()),
    femaleRows: z.array(z.string()),
    notes: z.array(z.string())
  }),
  instagram: z.object({
    handle: z.string(),
    url: z.string(),
    reels: z.array(z.string())
  }),
  faq: z.array(z.object({
    question: z.string(),
    answer: z.string()
  })),
  legal: z.object({}).passthrough(),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    imageAlt: z.string().optional(),
    naverVerification: z.string().optional()
  })
};

function normalizeHttpsUrl(value) {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  if (!/^https:\/\//i.test(trimmed)) return "";

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" && url.hostname ? trimmed : "";
  } catch {
    return "";
  }
}

function normalizeGoogleFormUrl(value) {
  const url = normalizeHttpsUrl(value);
  if (!url) return "";

  const { hostname, pathname } = new URL(url);
  const normalizedHost = hostname.toLowerCase();

  if (normalizedHost === "forms.gle") return url;
  if (normalizedHost === "docs.google.com" && pathname.startsWith("/forms/")) return url;

  return "";
}

export function getCtaForStatus(status) {
  return ctaStates[status] || ctaStates.scheduled;
}

function parseBlock(row, fallback, schema) {
  if (!row) return fallback;

  try {
    const parsed = JSON.parse(row.value_json);
    const result = schema.safeParse(parsed);
    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
}

export function getContentBlocks(db) {
  const rows = db.prepare("select block_key, value_json from content_blocks").all();
  const byKey = Object.fromEntries(rows.map((row) => [row.block_key, row]));
  const applicationStatus = parseBlock(
    byKey.applicationStatus,
    contentFallbacks.applicationStatus,
    contentSchemas.applicationStatus
  );
  const instagram = parseBlock(byKey.instagram, contentFallbacks.instagram, contentSchemas.instagram);

  return {
    hero: parseBlock(byKey.hero, contentFallbacks.hero, contentSchemas.hero),
    participants: parseBlock(byKey.participants, contentFallbacks.participants, contentSchemas.participants),
    applicationStatus: {
      ...applicationStatus,
      url: normalizeHttpsUrl(applicationStatus.url),
      maleRows: applicationStatus.maleRows.map((row) => row.trim()).filter(Boolean),
      femaleRows: applicationStatus.femaleRows.map((row) => row.trim()).filter(Boolean),
      notes: applicationStatus.notes.map((note) => note.trim()).filter(Boolean)
    },
    instagram: {
      ...instagram,
      url: normalizeHttpsUrl(instagram.url),
      reels: instagram.reels.map(normalizeHttpsUrl).filter(Boolean)
    },
    faq: parseBlock(byKey.faq, contentFallbacks.faq, contentSchemas.faq),
    legal: parseBlock(byKey.legal, contentFallbacks.legal, contentSchemas.legal),
    seo: parseBlock(byKey.seo, contentFallbacks.seo, contentSchemas.seo)
  };
}

export function getFeaturedEvent(db) {
  const event = db.prepare(`
    select
      id,
      public_title,
      generation_label,
      event_date,
      region,
      venue_note,
      capacity_note,
      application_conditions,
      status,
      google_form_url
    from events
    where is_featured = 1
      and is_visible = 1
      and status != 'hidden'
    limit 1
  `).get();

  if (!event) return null;

  const cta = getCtaForStatus(event.status);
  const timeSlots = db.prepare(`
    select
      label,
      starts_at as startsAt,
      ends_at as endsAt
    from event_time_slots
    where event_id = ?
    order by sort_order asc
  `).all(event.id);

  const priceRows = db.prepare(`
    select
      label,
      amount,
      note
    from event_price_rows
    where event_id = ?
    order by sort_order asc
  `).all(event.id);

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
    googleFormUrl: cta.enabled ? normalizeGoogleFormUrl(event.google_form_url) : "",
    cta,
    timeSlots,
    priceRows
  };
}

export function buildPublicModel(db) {
  const featuredEvent = getFeaturedEvent(db);

  return {
    serviceName: "클래식을 좋아하세요",
    featuredEvent,
    content: getContentBlocks(db),
    hasOpenApplication: Boolean(featuredEvent?.googleFormUrl)
  };
}
