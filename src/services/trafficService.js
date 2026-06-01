import { nanoid } from "nanoid";
import { hashToken } from "./security.js";

const visitorCookieName = "public_visitor";
const visitorCookieMaxAgeMs = 1000 * 60 * 60 * 24 * 180;
const hourMs = 1000 * 60 * 60;
const defaultTrafficHours = 72;
const allowedEventTypes = new Set(["apply_click", "menu_click"]);
const searchParamNames = ["utm_term", "q", "query", "keyword", "n_query", "search_query"];

function getHourBucket(date = new Date()) {
  const timestamp = date instanceof Date ? date.getTime() : new Date(date).getTime();
  return new Date(Math.floor(timestamp / hourMs) * hourMs).toISOString();
}

function getSeoulParts(hourBucket) {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    hour12: false
  }).formatToParts(new Date(hourBucket));
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = byType.hour === "24" ? "00" : byType.hour;

  return {
    dateLabel: `${byType.month}/${byType.day}`,
    weekdayLabel: byType.weekday,
    hourLabel: `${hour}시`,
    fullLabel: `${byType.month}/${byType.day} ${byType.weekday} ${hour}시`
  };
}

function buildHourBuckets(hours, now = new Date()) {
  const end = new Date(Math.floor(now.getTime() / hourMs) * hourMs);
  const start = new Date(end.getTime() - (hours - 1) * hourMs);
  const buckets = [];

  for (let timestamp = start.getTime(); timestamp <= end.getTime(); timestamp += hourMs) {
    buckets.push(new Date(timestamp).toISOString());
  }

  return buckets;
}

function truncateText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function getRequestPath(request) {
  const rawPath = typeof request.path === "string" ? request.path : "/";
  return rawPath.startsWith("/") ? rawPath.slice(0, 120) : "/";
}

function normalizeHostname(hostname) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function getSearchTermFromUrl(url) {
  for (const name of searchParamNames) {
    const value = url.searchParams.get(name);
    if (value) return truncateText(value, 120);
  }

  return "";
}

function classifySource(request) {
  const landingUrl = new URL(request.originalUrl || request.url || "/", "https://doyoulikeclassic.com");
  const utmSource = truncateText(landingUrl.searchParams.get("utm_source") || "", 80);
  const utmMedium = truncateText(landingUrl.searchParams.get("utm_medium") || "", 80);
  const utmTerm = getSearchTermFromUrl(landingUrl);
  const referrer = truncateText(request.get("referer") || request.get("referrer") || "", 500);

  if (utmSource) {
    return {
      referrer,
      source: utmMedium ? `${utmSource} / ${utmMedium}` : utmSource,
      searchTerm: utmTerm
    };
  }

  if (!referrer) {
    return { referrer: "", source: "direct", searchTerm: utmTerm };
  }

  try {
    const referrerUrl = new URL(referrer);
    const hostname = normalizeHostname(referrerUrl.hostname);
    const source = hostname.includes("naver.")
      ? "naver"
      : hostname.includes("google.")
        ? "google"
        : hostname.includes("instagram.")
          ? "instagram"
          : hostname.includes("facebook.")
            ? "facebook"
            : hostname.includes("kakao.")
              ? "kakao"
              : hostname;

    return {
      referrer,
      source,
      searchTerm: utmTerm || getSearchTermFromUrl(referrerUrl)
    };
  } catch {
    return { referrer, source: "unknown", searchTerm: utmTerm };
  }
}

function getVisitorIdentity(request, response) {
  let visitorToken = request.signedCookies[visitorCookieName];

  if (typeof visitorToken !== "string" || visitorToken.length < 20) {
    visitorToken = nanoid(32);
    response.cookie(visitorCookieName, visitorToken, {
      httpOnly: true,
      signed: true,
      sameSite: "lax",
      secure: request.config.secureCookies,
      maxAge: visitorCookieMaxAgeMs
    });
  }

  return hashToken(visitorToken, request.config.sessionSecret);
}

function insertTrafficEvent(db, row) {
  db.prepare(`
    insert into traffic_events (
      visitor_hash, event_type, event_label, event_value, path, referrer, source, search_term, hour_bucket
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    row.visitorHash,
    row.eventType,
    row.eventLabel,
    row.eventValue,
    row.path,
    row.referrer,
    row.source,
    row.searchTerm,
    row.hourBucket
  );
}

export function recordPublicVisit(request, response, now = new Date()) {
  const visitorHash = getVisitorIdentity(request, response);
  const hourBucket = getHourBucket(now);
  const sourceInfo = classifySource(request);

  request.db.prepare(`
    insert into traffic_visits (visitor_hash, hour_bucket, path)
    values (?, ?, '/')
    on conflict(visitor_hash, hour_bucket, path) do update set
      visit_count = visit_count + 1,
      last_seen_at = datetime('now')
  `).run(visitorHash, hourBucket);

  insertTrafficEvent(request.db, {
    visitorHash,
    eventType: "visit",
    eventLabel: sourceInfo.source,
    eventValue: "",
    path: getRequestPath(request),
    referrer: sourceInfo.referrer,
    source: sourceInfo.source,
    searchTerm: sourceInfo.searchTerm,
    hourBucket
  });
}

export function recordTrafficEvent(request, response, now = new Date()) {
  const eventType = truncateText(request.body?.eventType, 40);
  if (!allowedEventTypes.has(eventType)) {
    return false;
  }

  const sourceInfo = classifySource(request);

  insertTrafficEvent(request.db, {
    visitorHash: getVisitorIdentity(request, response),
    eventType,
    eventLabel: truncateText(request.body?.label, 120),
    eventValue: truncateText(request.body?.value, 240),
    path: truncateText(request.body?.path, 120) || getRequestPath(request),
    referrer: sourceInfo.referrer,
    source: sourceInfo.source,
    searchTerm: truncateText(request.body?.searchTerm, 120) || sourceInfo.searchTerm,
    hourBucket: getHourBucket(now)
  });

  return true;
}

function getTopRows(db, sql, params = []) {
  return db.prepare(sql).all(...params).map((row) => ({
    ...row,
    count: Number(row.count || 0),
    uniqueVisitors: Number(row.uniqueVisitors || 0)
  }));
}

export function getTrafficLog(db, options = {}) {
  const hours = options.hours || defaultTrafficHours;
  const now = options.now || new Date();
  const buckets = buildHourBuckets(hours, now);
  const startBucket = buckets[0];
  const rawRows = db.prepare(`
    select
      hour_bucket as hourBucket,
      count(*) as uniqueVisitors,
      coalesce(sum(visit_count), 0) as pageViews
    from traffic_visits
    where path = '/'
      and hour_bucket >= ?
    group by hour_bucket
    order by hour_bucket asc
  `).all(startBucket);
  const byBucket = new Map(rawRows.map((row) => [row.hourBucket, row]));
  const maxVisitors = rawRows.reduce((max, row) => Math.max(max, row.uniqueVisitors), 0);
  const rows = buckets.map((hourBucket) => {
    const row = byBucket.get(hourBucket) || { uniqueVisitors: 0, pageViews: 0 };
    const labels = getSeoulParts(hourBucket);

    return {
      hourBucket,
      ...labels,
      uniqueVisitors: Number(row.uniqueVisitors || 0),
      pageViews: Number(row.pageViews || 0),
      barPercent: maxVisitors > 0 ? Math.max(8, Math.round((row.uniqueVisitors / maxVisitors) * 100)) : 0
    };
  });
  const busiestHour = rows.reduce((busiest, row) => {
    if (!busiest || row.uniqueVisitors > busiest.uniqueVisitors) return row;
    return busiest;
  }, null);
  const totalUniqueVisitors = rawRows.reduce((sum, row) => sum + Number(row.uniqueVisitors || 0), 0);
  const totalPageViews = rawRows.reduce((sum, row) => sum + Number(row.pageViews || 0), 0);
  const eventSummaryRows = getTopRows(db, `
    select event_type as eventType, count(*) as count, count(distinct visitor_hash) as uniqueVisitors
    from traffic_events
    where hour_bucket >= ?
    group by event_type
  `, [startBucket]);
  const eventCounts = Object.fromEntries(eventSummaryRows.map((row) => [row.eventType, row]));
  const sourceRows = getTopRows(db, `
    select source, count(*) as count, count(distinct visitor_hash) as uniqueVisitors
    from traffic_events
    where event_type = 'visit'
      and hour_bucket >= ?
    group by source
    order by uniqueVisitors desc, count desc, source asc
    limit 10
  `, [startBucket]);
  const searchTermRows = getTopRows(db, `
    select search_term as searchTerm, count(*) as count, count(distinct visitor_hash) as uniqueVisitors
    from traffic_events
    where event_type = 'visit'
      and hour_bucket >= ?
      and search_term != ''
    group by search_term
    order by count desc, uniqueVisitors desc, search_term asc
    limit 10
  `, [startBucket]);
  const menuClickRows = getTopRows(db, `
    select event_label as label, count(*) as count, count(distinct visitor_hash) as uniqueVisitors
    from traffic_events
    where event_type = 'menu_click'
      and hour_bucket >= ?
    group by event_label
    order by count desc, uniqueVisitors desc, event_label asc
    limit 10
  `, [startBucket]);
  const applyClickRows = getTopRows(db, `
    select event_label as label, count(*) as count, count(distinct visitor_hash) as uniqueVisitors
    from traffic_events
    where event_type = 'apply_click'
      and hour_bucket >= ?
    group by event_label
    order by count desc, uniqueVisitors desc, event_label asc
    limit 10
  `, [startBucket]);

  return {
    hours,
    rows,
    totalUniqueVisitors,
    totalPageViews,
    busiestHour,
    timezoneLabel: "Asia/Seoul",
    applyClickCount: eventCounts.apply_click?.count || 0,
    menuClickCount: eventCounts.menu_click?.count || 0,
    sourceRows,
    searchTermRows,
    menuClickRows,
    applyClickRows
  };
}
