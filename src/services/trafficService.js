import { nanoid } from "nanoid";
import { hashToken } from "./security.js";

const visitorCookieName = "public_visitor";
const visitorCookieMaxAgeMs = 1000 * 60 * 60 * 24 * 180;
const hourMs = 1000 * 60 * 60;
const defaultTrafficHours = 72;

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

export function recordPublicVisit(request, response, now = new Date()) {
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

  const visitorHash = hashToken(visitorToken, request.config.sessionSecret);
  const hourBucket = getHourBucket(now);

  request.db.prepare(`
    insert into traffic_visits (visitor_hash, hour_bucket, path)
    values (?, ?, '/')
    on conflict(visitor_hash, hour_bucket, path) do update set
      visit_count = visit_count + 1,
      last_seen_at = datetime('now')
  `).run(visitorHash, hourBucket);
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

  return {
    hours,
    rows,
    totalUniqueVisitors,
    totalPageViews,
    busiestHour,
    timezoneLabel: "Asia/Seoul"
  };
}
