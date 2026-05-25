pragma foreign_keys = on;

create table if not exists events (
  id text primary key,
  internal_name text not null,
  public_title text not null,
  generation_label text not null default '',
  event_date text not null default '',
  region text not null default '서울 강남권',
  venue_note text not null default '참여 확정자에게 개별 안내',
  capacity_note text not null default '',
  application_conditions text not null default '',
  status text not null check (status in ('open', 'closing-soon', 'closed', 'scheduled', 'hidden')),
  google_form_url text not null default '',
  is_featured integer not null default 0 check (is_featured in (0, 1)),
  is_visible integer not null default 1 check (is_visible in (0, 1)),
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create unique index if not exists one_featured_event
on events(is_featured)
where is_featured = 1;

create table if not exists event_time_slots (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  label text not null,
  starts_at text not null default '',
  ends_at text not null default '',
  sort_order integer not null default 0
);

create table if not exists event_price_rows (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  label text not null,
  amount text not null,
  note text not null default '',
  sort_order integer not null default 0
);

create table if not exists content_blocks (
  block_key text primary key,
  value_json text not null,
  updated_at text not null default (datetime('now'))
);

create table if not exists admin_sessions (
  token_hash text primary key,
  csrf_token text not null,
  expires_at text not null,
  created_at text not null default (datetime('now'))
);

create table if not exists admin_audit_log (
  id integer primary key autoincrement,
  action text not null,
  detail text not null default '',
  ip_address text not null default '',
  created_at text not null default (datetime('now'))
);

create table if not exists traffic_visits (
  visitor_hash text not null,
  hour_bucket text not null,
  path text not null default '/',
  visit_count integer not null default 1,
  first_seen_at text not null default (datetime('now')),
  last_seen_at text not null default (datetime('now')),
  primary key (visitor_hash, hour_bucket, path)
);

create index if not exists traffic_visits_hour_bucket
on traffic_visits(hour_bucket);
