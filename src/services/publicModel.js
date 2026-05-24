const ctaStates = {
  open: { label: "이번 기수 신청하기", enabled: true },
  "closing-soon": { label: "마감 전 신청하기", enabled: true },
  closed: { label: "모집 마감", enabled: false },
  scheduled: { label: "신청 오픈 예정", enabled: false },
  hidden: { label: "신청 오픈 예정", enabled: false }
};

const contentFallbacks = {
  hero: { headline: "", subheadline: "", badges: [] },
  participants: [],
  instagram: { handle: "", url: "", reels: [] },
  faq: [],
  legal: {}
};

export function getCtaForStatus(status) {
  return ctaStates[status] || ctaStates.scheduled;
}

function parseBlock(row, fallback) {
  if (!row) return fallback;

  try {
    return JSON.parse(row.value_json);
  } catch {
    return fallback;
  }
}

export function getContentBlocks(db) {
  const rows = db.prepare("select block_key, value_json from content_blocks").all();
  const byKey = Object.fromEntries(rows.map((row) => [row.block_key, row]));

  return {
    hero: parseBlock(byKey.hero, contentFallbacks.hero),
    participants: parseBlock(byKey.participants, contentFallbacks.participants),
    instagram: parseBlock(byKey.instagram, contentFallbacks.instagram),
    faq: parseBlock(byKey.faq, contentFallbacks.faq),
    legal: parseBlock(byKey.legal, contentFallbacks.legal)
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
    googleFormUrl: event.google_form_url,
    cta: getCtaForStatus(event.status),
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
    hasOpenApplication: Boolean(featuredEvent?.cta.enabled && featuredEvent.googleFormUrl)
  };
}
