# Classic Rotation Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Raspberry Pi-ready landing page and B-lite admin system for "클래식을 좋아하세요" with Google Form application CTAs and no applicant data storage.

**Architecture:** Use a small Node.js Express app with EJS server-rendered pages, SQLite persistence, admin-only JSON/form mutations, and static assets. The public landing page renders one featured event while the admin can manage multiple events, content blocks, FAQ, social links, legal placeholders, and CTA states.

**Tech Stack:** Node.js 20+, Express, EJS, better-sqlite3, Vitest, Supertest, Playwright, Helmet, express-rate-limit, cookie-parser, nanoid, Zod, vanilla CSS/JS.

---

## File Structure

- Create: `package.json` - scripts and dependencies.
- Create: `.gitignore` - ignore local environment, generated DB, dependencies, logs, and brainstorm temp files.
- Create: `.env.example` - documented environment values.
- Create: `server.js` - production entrypoint.
- Create: `src/app.js` - Express app factory used by server and tests.
- Create: `src/config.js` - environment parsing and defaults.
- Create: `src/db/database.js` - SQLite connection helpers and transaction utilities.
- Create: `src/db/schema.sql` - database schema.
- Create: `src/db/seed.js` - idempotent seed data from Notion.
- Create: `src/services/publicModel.js` - featured event selection and landing-page model.
- Create: `src/services/adminService.js` - event/content mutation helpers.
- Create: `src/services/security.js` - password comparison, session token hashing, CSRF helpers.
- Create: `src/middleware/adminAuth.js` - admin authentication and CSRF middleware.
- Create: `src/routes/public.js` - public landing page route.
- Create: `src/routes/admin.js` - admin login, logout, dashboard, and mutation routes.
- Create: `views/layout.ejs` - shared layout shell.
- Create: `views/index.ejs` - landing page.
- Create: `views/admin-login.ejs` - admin login page.
- Create: `views/admin-dashboard.ejs` - admin management page.
- Create: `public/styles.css` - Design.md-compliant UI.
- Create: `public/admin.js` - small admin dashboard helpers.
- Create: `public/site.js` - small landing interactions.
- Create: `public/assets/images/README.md` - generated image prompts and replacement guidance.
- Create: `tests/publicModel.test.js` - CTA/model unit tests.
- Create: `tests/db.test.js` - schema and featured event tests.
- Create: `tests/adminAuth.test.js` - admin auth/security tests.
- Create: `tests/render.test.js` - public/admin render smoke tests.
- Create: `tests/playwright/landing.spec.js` - desktop/mobile browser checks.
- Create: `docs/deployment-raspberry-pi.md` - deployment guide.
- Create: `docs/security-checklist.md` - operating checklist.

## Task 1: Scaffold Node App And Baseline Test

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `server.js`
- Create: `src/config.js`
- Create: `src/app.js`
- Create: `tests/render.test.js`

- [ ] **Step 1: Create the failing render smoke test**

```js
// tests/render.test.js
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("rendering", () => {
  it("renders the public landing page", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true });
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("클래식을 좋아하세요");
    expect(response.text).toContain("이번 기수 신청하기");
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test -- tests/render.test.js`

Expected: failure because `package.json`, Vitest, and `src/app.js` do not exist.

- [ ] **Step 3: Create the project package and scripts**

```json
{
  "name": "classic-rotation-landing",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "node --watch server.js",
    "start": "node server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:browser": "playwright test",
    "db:seed": "node src/db/seed.js"
  },
  "dependencies": {
    "better-sqlite3": "^11.8.1",
    "cookie-parser": "^1.4.7",
    "dotenv": "^16.4.7",
    "ejs": "^3.1.10",
    "express": "^4.21.2",
    "express-rate-limit": "^7.5.0",
    "helmet": "^8.0.0",
    "nanoid": "^5.0.9",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.1",
    "supertest": "^7.0.0",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`

Expected: `node_modules/` and `package-lock.json` are created.

- [ ] **Step 5: Add local ignore rules**

```gitignore
# .gitignore
node_modules/
.env
.env.local
data/*.sqlite
data/*.sqlite-*
logs/
coverage/
playwright-report/
test-results/
.DS_Store
.superpowers/
```

- [ ] **Step 6: Add environment sample**

```bash
# .env.example
NODE_ENV=development
PORT=3000
DATABASE_PATH=data/classic-rotation.sqlite
ADMIN_PASSWORD=change-this-before-production
SESSION_SECRET=replace-with-a-long-random-string
PUBLIC_BASE_URL=http://localhost:3000
```

- [ ] **Step 7: Add config and entrypoint**

```js
// src/config.js
import "dotenv/config";

export function loadConfig(overrides = {}) {
  const env = { ...process.env, ...overrides };

  return {
    nodeEnv: env.NODE_ENV || "development",
    port: Number(env.PORT || 3000),
    dbPath: env.DATABASE_PATH || "data/classic-rotation.sqlite",
    adminPassword: env.ADMIN_PASSWORD || "change-this-before-production",
    sessionSecret: env.SESSION_SECRET || "dev-session-secret",
    publicBaseUrl: env.PUBLIC_BASE_URL || "http://localhost:3000",
    secureCookies: (env.NODE_ENV || "development") === "production"
  };
}
```

```js
// server.js
import { createApp } from "./src/app.js";
import { loadConfig } from "./src/config.js";

const config = loadConfig();
const app = createApp(config);

app.listen(config.port, () => {
  console.log(`Classic rotation landing running at ${config.publicBaseUrl}`);
});
```

- [ ] **Step 8: Add a minimal app factory**

```js
// src/app.js
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

export function createApp(overrides = {}) {
  const config = loadConfig(overrides);
  const app = express();

  app.set("view engine", "ejs");
  app.set("views", path.join(rootDir, "views"));
  app.locals.config = config;

  app.use(helmet());
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(express.static(path.join(rootDir, "public")));

  app.get("/", (_request, response) => {
    response.status(200).send("<!doctype html><title>클래식을 좋아하세요</title><a>이번 기수 신청하기</a>");
  });

  return app;
}
```

- [ ] **Step 9: Run the smoke test**

Run: `npm test -- tests/render.test.js`

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example server.js src/config.js src/app.js tests/render.test.js
git commit -m "chore: scaffold express app"
```

## Task 2: Add SQLite Schema And Seed Data

**Files:**
- Create: `src/db/schema.sql`
- Create: `src/db/database.js`
- Create: `src/db/seed.js`
- Create: `tests/db.test.js`
- Modify: `src/app.js`

- [ ] **Step 1: Write the failing database test**

```js
// tests/db.test.js
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
    expect(faq.value_json).toContain("선착순");
  });

  it("prevents more than one featured event", () => {
    const db = createDatabase(":memory:");
    seedDatabase(db);

    expect(() => {
      db.prepare("insert into events (id, internal_name, public_title, generation_label, status, is_featured, is_visible) values (?, ?, ?, ?, ?, ?, ?)").run(
        "second",
        "second",
        "다음 기수",
        "7기 예정",
        "scheduled",
        1,
        1
      );
    }).toThrow();

    const featured = db.prepare("select count(*) as count from events where is_featured = 1").get();
    expect(featured.count).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test -- tests/db.test.js`

Expected: FAIL because database helpers do not exist.

- [ ] **Step 3: Add SQLite schema**

```sql
-- src/db/schema.sql
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
```

- [ ] **Step 4: Add database helper**

```js
// src/db/database.js
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, "schema.sql");

export function createDatabase(dbPath) {
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(schemaPath, "utf8"));
  return db;
}

export function withTransaction(db, callback) {
  return db.transaction(callback)();
}
```

- [ ] **Step 5: Add idempotent seed data**

```js
// src/db/seed.js
import { nanoid } from "nanoid";
import { createDatabase, withTransaction } from "./database.js";
import { loadConfig } from "../config.js";

const EVENT_ID = "classic-rotation-6";

export function seedDatabase(db) {
  withTransaction(db, () => {
    db.prepare(`
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
    `).run(
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
    [
      ["1회차", "16:00", "18:00", 1],
      ["2회차", "18:30", "20:30", 2]
    ].forEach(([label, startsAt, endsAt, sortOrder]) => {
      db.prepare("insert into event_time_slots (id, event_id, label, starts_at, ends_at, sort_order) values (?, ?, ?, ?, ?, ?)").run(
        nanoid(),
        EVENT_ID,
        label,
        startsAt,
        endsAt,
        sortOrder
      );
    });

    db.prepare("delete from event_price_rows where event_id = ?").run(EVENT_ID);
    [
      ["기본", "40,000원", "", 1],
      ["동반 할인", "32,000원", "기본가 40,000원에서 할인", 2],
      ["이전 기수 할인", "35,000원", "기존 참여자 대상", 3],
      ["얼리버드 할인", "33,000원", "관리자에서 마감일 수정", 4]
    ].forEach(([label, amount, note, sortOrder]) => {
      db.prepare("insert into event_price_rows (id, event_id, label, amount, note, sort_order) values (?, ?, ?, ?, ?, ?)").run(
        nanoid(),
        EVENT_ID,
        label,
        amount,
        note,
        sortOrder
      );
    });

    const blocks = {
      hero: {
        headline: "클래식을 좋아하세요? 같은 취향이 설렘이 되는 밤.",
        subheadline: "클래식을 사랑하는 사람들이 서울 강남권의 조용한 공간에서 1:1로 대화하는 로테이션 소개팅.",
        badges: ["누적 신청 500명+", "5-10명 순차 대화", "서울 강남권", "선정자 개별 안내"]
      },
      participants: ["클래식 전공자", "개발자", "교사", "연구원", "금융권 종사자"],
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
        { question: "신청은 선착순인가요?", answer: "아니요. 제출해주신 내용을 바탕으로 성비와 나이대를 조율한 뒤 참여 확정자에게 개별 연락드립니다." },
        { question: "클래식 전공자가 아니어도 신청할 수 있나요?", answer: "네. 클래식을 좋아하거나 공연과 음악 이야기를 자연스럽게 나누고 싶은 분이라면 신청할 수 있습니다." },
        { question: "결제는 언제 하나요?", answer: "구글폼 신청 후 참여가 확정된 분께 운영자가 별도로 참가비 안내를 드립니다." },
        { question: "개인정보는 어디에 저장되나요?", answer: "신청 정보는 구글폼에서 수집되며, 이 웹사이트 데이터베이스에는 신청자 개인정보를 저장하지 않습니다." }
      ],
      legal: {
        businessName: "상호명 입력 예정",
        representative: "대표자 입력 예정",
        registrationNumber: "사업자등록번호 입력 예정",
        contact: "문의 채널 입력 예정",
        domain: "www.doyoulikeclassic.com"
      }
    };

    Object.entries(blocks).forEach(([key, value]) => {
      db.prepare(`
        insert into content_blocks (block_key, value_json)
        values (?, ?)
        on conflict(block_key) do update set value_json = excluded.value_json, updated_at = datetime('now')
      `).run(key, JSON.stringify(value));
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
```

- [ ] **Step 6: Run database tests**

Run: `npm test -- tests/db.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/db tests/db.test.js
git commit -m "feat: add sqlite schema and seed data"
```

## Task 3: Build Public Model Service

**Files:**
- Create: `src/services/publicModel.js`
- Create: `tests/publicModel.test.js`

- [ ] **Step 1: Write failing model tests**

```js
// tests/publicModel.test.js
import { describe, expect, it } from "vitest";
import { buildPublicModel, getCtaForStatus } from "../src/services/publicModel.js";
import { createDatabase } from "../src/db/database.js";
import { seedDatabase } from "../src/db/seed.js";

describe("public model", () => {
  it.each([
    ["open", { label: "이번 기수 신청하기", enabled: true }],
    ["closing-soon", { label: "마감 전 신청하기", enabled: true }],
    ["closed", { label: "모집 마감", enabled: false }],
    ["scheduled", { label: "신청 오픈 예정", enabled: false }],
    ["hidden", { label: "신청 오픈 예정", enabled: false }]
  ])("maps %s to CTA state", (status, expected) => {
    expect(getCtaForStatus(status)).toMatchObject(expected);
  });

  it("returns a landing model without applicant data", () => {
    const db = createDatabase(":memory:");
    seedDatabase(db);

    const model = buildPublicModel(db);

    expect(model.featuredEvent.publicTitle).toBe("클래식을 좋아하세요 6기");
    expect(model.featuredEvent.timeSlots).toHaveLength(2);
    expect(JSON.stringify(model)).not.toContain("admin_sessions");
    expect(JSON.stringify(model)).not.toContain("token_hash");
  });
});
```

- [ ] **Step 2: Run the tests and confirm failure**

Run: `npm test -- tests/publicModel.test.js`

Expected: FAIL because `src/services/publicModel.js` does not exist.

- [ ] **Step 3: Implement public model service**

```js
// src/services/publicModel.js
export function getCtaForStatus(status) {
  const states = {
    open: { label: "이번 기수 신청하기", enabled: true },
    "closing-soon": { label: "마감 전 신청하기", enabled: true },
    closed: { label: "모집 마감", enabled: false },
    scheduled: { label: "신청 오픈 예정", enabled: false },
    hidden: { label: "신청 오픈 예정", enabled: false }
  };

  return states[status] || states.scheduled;
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
    hero: parseBlock(byKey.hero, { headline: "", subheadline: "", badges: [] }),
    participants: parseBlock(byKey.participants, []),
    instagram: parseBlock(byKey.instagram, { handle: "", url: "", reels: [] }),
    faq: parseBlock(byKey.faq, []),
    legal: parseBlock(byKey.legal, {})
  };
}

export function getFeaturedEvent(db) {
  const event = db.prepare(`
    select * from events
    where is_featured = 1 and is_visible = 1 and status != 'hidden'
    limit 1
  `).get();

  if (!event) return null;

  const timeSlots = db.prepare(`
    select label, starts_at as startsAt, ends_at as endsAt
    from event_time_slots
    where event_id = ?
    order by sort_order asc
  `).all(event.id);

  const priceRows = db.prepare(`
    select label, amount, note
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
  const content = getContentBlocks(db);
  const featuredEvent = getFeaturedEvent(db);

  return {
    serviceName: "클래식을 좋아하세요",
    featuredEvent,
    content,
    hasOpenApplication: Boolean(featuredEvent?.cta.enabled && featuredEvent.googleFormUrl)
  };
}
```

- [ ] **Step 4: Run public model tests**

Run: `npm test -- tests/publicModel.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/publicModel.js tests/publicModel.test.js
git commit -m "feat: build public landing model"
```

## Task 4: Render Public Landing Page

**Files:**
- Modify: `src/app.js`
- Create: `src/routes/public.js`
- Create: `views/layout.ejs`
- Create: `views/index.ejs`
- Create: `public/styles.css`
- Create: `public/site.js`
- Modify: `tests/render.test.js`

- [ ] **Step 1: Update render test for full landing content**

```js
// tests/render.test.js
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("rendering", () => {
  it("renders the public landing page from seeded content", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true });
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("클래식을 좋아하세요");
    expect(response.text).toContain("같은 취향이 설렘이 되는 밤");
    expect(response.text).toContain("서울 강남권");
    expect(response.text).toContain("누적 신청 500명+");
    expect(response.text).toContain("이번 기수 신청하기");
    expect(response.text).toContain("개인정보는 구글폼에서 수집");
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails against the minimal route**

Run: `npm test -- tests/render.test.js`

Expected: FAIL because the route still returns minimal HTML.

- [ ] **Step 3: Wire database and public route into app factory**

```js
// src/app.js
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { createDatabase } from "./db/database.js";
import { seedDatabase } from "./db/seed.js";
import { publicRouter } from "./routes/public.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

export function createApp(overrides = {}) {
  const config = loadConfig(overrides);
  const app = express();
  const db = createDatabase(config.dbPath);

  if (config.seed) {
    seedDatabase(db);
  }

  app.set("view engine", "ejs");
  app.set("views", path.join(rootDir, "views"));
  app.locals.config = config;
  app.locals.serviceName = "클래식을 좋아하세요";

  app.use(helmet());
  app.use(cookieParser(config.sessionSecret));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(express.static(path.join(rootDir, "public")));

  app.use((request, _response, next) => {
    request.db = db;
    request.config = config;
    next();
  });

  app.use("/", publicRouter);

  return app;
}
```

- [ ] **Step 4: Add public route**

```js
// src/routes/public.js
import { Router } from "express";
import { buildPublicModel } from "../services/publicModel.js";

export const publicRouter = Router();

publicRouter.get("/", (request, response) => {
  const model = buildPublicModel(request.db);
  response.render("index", {
    title: "클래식을 좋아하세요",
    model
  });
});
```

- [ ] **Step 5: Add shared layout**

```ejs
<!-- views/layout.ejs -->
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><%= title %></title>
  <meta name="description" content="클래식을 사랑하는 사람들을 위한 서울 강남권 로테이션 소개팅">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <%- body %>
  <script src="/site.js" defer></script>
</body>
</html>
```

- [ ] **Step 6: Configure EJS layout rendering without a layout dependency**

Replace the `response.render("index"...` call in `src/routes/public.js` with:

```js
publicRouter.get("/", (request, response) => {
  const model = buildPublicModel(request.db);
  response.render("index", { title: "클래식을 좋아하세요", model }, (error, html) => {
    if (error) throw error;
    response.render("layout", {
      title: "클래식을 좋아하세요",
      body: html
    });
  });
});
```

- [ ] **Step 7: Add landing template**

```ejs
<!-- views/index.ejs -->
<header class="site-header">
  <a class="wordmark" href="#top">클래식을 좋아하세요</a>
  <nav class="nav-links" aria-label="주요 섹션">
    <a href="#event">일정</a>
    <a href="#process">진행 방식</a>
    <a href="#faq">FAQ</a>
  </nav>
  <% if (model.featuredEvent && model.featuredEvent.cta.enabled) { %>
    <a class="button button-primary" href="<%= model.featuredEvent.googleFormUrl %>" target="_blank" rel="noreferrer"><%= model.featuredEvent.cta.label %></a>
  <% } else { %>
    <span class="button button-disabled"><%= model.featuredEvent?.cta.label || "신청 오픈 예정" %></span>
  <% } %>
</header>

<main id="top">
  <section class="hero section">
    <div class="section-inner hero-grid">
      <div class="hero-copy">
        <p class="eyebrow">Classic Rotation Meeting</p>
        <h1><%= model.content.hero.headline %></h1>
        <p class="hero-subtitle"><%= model.content.hero.subheadline %></p>
        <div class="badge-row">
          <% model.content.hero.badges.forEach((badge) => { %>
            <span class="badge"><%= badge %></span>
          <% }) %>
        </div>
        <div class="hero-actions">
          <% if (model.featuredEvent?.cta.enabled) { %>
            <a class="button button-primary button-large" href="<%= model.featuredEvent.googleFormUrl %>" target="_blank" rel="noreferrer"><%= model.featuredEvent.cta.label %></a>
          <% } else { %>
            <span class="button button-disabled button-large"><%= model.featuredEvent?.cta.label || "신청 오픈 예정" %></span>
          <% } %>
          <a class="text-link" href="#process">진행 방식 보기</a>
        </div>
      </div>
      <div class="hero-media">
        <img src="/assets/images/classic-salon-hero.jpg" alt="클래식 살롱 분위기의 테이블과 악기">
      </div>
    </div>
  </section>

  <section id="event" class="section event-band">
    <div class="section-inner">
      <p class="eyebrow">Now Recruiting</p>
      <h2>현재 모집 중인 일정</h2>
      <% if (model.featuredEvent) { %>
        <article class="event-panel">
          <div>
            <span class="status-pill status-<%= model.featuredEvent.status %>"><%= model.featuredEvent.generationLabel %></span>
            <h3><%= model.featuredEvent.publicTitle %></h3>
            <p><%= model.featuredEvent.eventDate %> · <%= model.featuredEvent.region %></p>
            <p><%= model.featuredEvent.venueNote %></p>
          </div>
          <dl class="event-list">
            <div><dt>신청 조건</dt><dd><%= model.featuredEvent.applicationConditions %></dd></div>
            <div><dt>정원</dt><dd><%= model.featuredEvent.capacityNote %></dd></div>
            <div><dt>시간</dt><dd><%= model.featuredEvent.timeSlots.map((slot) => `${slot.label} ${slot.startsAt}-${slot.endsAt}`).join(" / ") %></dd></div>
          </dl>
          <div class="price-grid">
            <% model.featuredEvent.priceRows.forEach((row) => { %>
              <div class="price-row"><span><%= row.label %></span><strong><%= row.amount %></strong></div>
            <% }) %>
          </div>
          <p class="notice">신청 후 내부 검토를 거쳐 참여 확정자에게 개별 결제 안내를 드립니다.</p>
        </article>
      <% } else { %>
        <article class="event-panel"><h3>다음 일정 준비 중</h3><p>신청 오픈 시 인스타그램을 통해 안내됩니다.</p></article>
      <% } %>
    </div>
  </section>

  <section class="section">
    <div class="section-inner split-copy">
      <div>
        <p class="eyebrow">Why Classic</p>
        <h2>처음 만나는 사람과도 음악 이야기는 자연스럽습니다.</h2>
      </div>
      <p>단순한 소개팅이 아니라, 같은 취향과 감도를 가진 사람들이 만나는 자리입니다. 좋아하는 음악과 공연 이야기를 나누며 짧지만 깊은 대화 속에서 서로의 분위기와 취향을 알아갑니다.</p>
    </div>
  </section>

  <section id="process" class="section process-band">
    <div class="section-inner">
      <p class="eyebrow">Process</p>
      <h2>진행 방식</h2>
      <ol class="process-list">
        <li><strong>구글폼 신청</strong><span>가능한 시간대를 모두 선택해 주세요.</span></li>
        <li><strong>내부 검토</strong><span>성비와 나이대를 고려해 참여자를 선정합니다.</span></li>
        <li><strong>개별 안내</strong><span>확정자에게 장소와 결제 안내를 드립니다.</span></li>
        <li><strong>1:1 로테이션 대화</strong><span>안내에 따라 여러 이성과 순차적으로 대화합니다.</span></li>
      </ol>
    </div>
  </section>

  <section class="section">
    <div class="section-inner media-grid">
      <img src="/assets/images/rotation-conversation.jpg" alt="로테이션 대화가 진행되는 조용한 테이블">
      <div>
        <p class="eyebrow">Members</p>
        <h2>서로 다른 일상, 같은 음악의 감도</h2>
        <div class="badge-row">
          <% model.content.participants.forEach((participant) => { %>
            <span class="badge badge-aqua"><%= participant %></span>
          <% }) %>
        </div>
      </div>
    </div>
  </section>

  <section class="section social-band">
    <div class="section-inner">
      <p class="eyebrow">Scenes</p>
      <h2>현장 분위기</h2>
      <div class="reel-grid">
        <% model.content.instagram.reels.forEach((url, index) => { %>
          <a class="reel-card" href="<%= url %>" target="_blank" rel="noreferrer">Instagram Reel <%= index + 1 %></a>
        <% }) %>
      </div>
    </div>
  </section>

  <section id="faq" class="section">
    <div class="section-inner">
      <p class="eyebrow">FAQ</p>
      <h2>자주 묻는 질문</h2>
      <div class="faq-list">
        <% model.content.faq.forEach((item) => { %>
          <details>
            <summary><%= item.question %></summary>
            <p><%= item.answer %></p>
          </details>
        <% }) %>
      </div>
      <p class="notice">개인정보는 구글폼에서 수집되며, 이 사이트 데이터베이스에는 신청자 개인정보를 저장하지 않습니다.</p>
    </div>
  </section>
</main>

<footer class="site-footer">
  <div class="section-inner footer-grid">
    <div>
      <strong>클래식을 좋아하세요</strong>
      <p><a href="<%= model.content.instagram.url %>" target="_blank" rel="noreferrer"><%= model.content.instagram.handle %></a></p>
    </div>
    <div>
      <p><%= model.content.legal.domain %></p>
      <p><%= model.content.legal.businessName %> · <%= model.content.legal.representative %> · <%= model.content.legal.registrationNumber %></p>
    </div>
  </div>
</footer>

<% if (model.featuredEvent) { %>
  <div class="mobile-cta">
    <% if (model.featuredEvent.cta.enabled) { %>
      <a class="button button-primary" href="<%= model.featuredEvent.googleFormUrl %>" target="_blank" rel="noreferrer"><%= model.featuredEvent.cta.label %></a>
    <% } else { %>
      <span class="button button-disabled"><%= model.featuredEvent.cta.label %></span>
    <% } %>
  </div>
<% } %>
```

- [ ] **Step 8: Add Design.md-compliant CSS**

```css
/* public/styles.css */
:root {
  --color-storm-gray: #111118;
  --color-canvas-white: #ffffff;
  --color-pale-mist: #f0f6ff;
  --color-electric-blue: #2727e6;
  --color-vivid-green: #16ab59;
  --color-lemon-zest: #ffda00;
  --color-sky-tint: #e1edff;
  --color-cool-aqua: #91d8ec;
  --color-coral-glow: #ffbac4;
  --color-sunset-orange: #ff7715;
  --color-flame-red: #ff4141;
  --font-haas-grot-text: "Haas Grot Text", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-haas-grot-disp: "Haas Grot Disp", "Neue Haas Grotesk Display", Inter, ui-sans-serif, system-ui, sans-serif;
  --font-martian-mono: "Martian Mono", "Space Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; color: var(--color-storm-gray); background: var(--color-canvas-white); font-family: var(--font-haas-grot-text); font-size: 16px; line-height: 1.35; }
a { color: inherit; text-decoration: none; }
img { display: block; max-width: 100%; }

.site-header { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 24px; justify-content: space-between; padding: 16px clamp(16px, 4vw, 48px); background: rgba(255,255,255,.92); backdrop-filter: blur(16px); border-bottom: 1px solid var(--color-pale-mist); }
.wordmark { font-family: var(--font-haas-grot-disp); font-size: 24px; line-height: 1.25; letter-spacing: -0.72px; }
.nav-links { display: flex; gap: 20px; font-size: 16px; }
.section { padding: 64px clamp(16px, 4vw, 48px); }
.section-inner { width: min(1120px, 100%); margin: 0 auto; }
.hero { position: relative; overflow: hidden; background: linear-gradient(180deg, var(--color-canvas-white), var(--color-sky-tint)); }
.hero::before { content: ""; position: absolute; width: 220px; height: 220px; right: 4vw; top: 72px; background: var(--color-lemon-zest); border-radius: 48px; transform: rotate(12deg); opacity: .9; }
.hero-grid { position: relative; display: grid; grid-template-columns: 1fr minmax(320px, 500px); gap: 48px; align-items: center; }
.hero h1, h2 { font-family: var(--font-haas-grot-disp); font-weight: 400; letter-spacing: -0.84px; line-height: 1.05; margin: 0; }
.hero h1 { font-size: clamp(42px, 7vw, 92px); letter-spacing: -1.44px; }
h2 { font-size: clamp(35px, 4vw, 62px); }
h3 { font-family: var(--font-haas-grot-disp); font-size: 35px; font-weight: 400; line-height: 1.15; margin: 8px 0; letter-spacing: -0.7px; }
.eyebrow { font-family: var(--font-martian-mono); font-size: 12px; text-transform: uppercase; margin: 0 0 12px; }
.hero-subtitle { font-size: 20px; line-height: 1.4; max-width: 640px; }
.badge-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 24px 0; }
.badge { display: inline-flex; align-items: center; min-height: 38px; padding: 8px 16px; border-radius: 5000px; background: var(--color-canvas-white); }
.badge-aqua { background: var(--color-cool-aqua); }
.button { display: inline-flex; align-items: center; justify-content: center; min-height: 40px; padding: 6px 16px; border-radius: 32px; font-family: var(--font-haas-grot-disp); font-size: 20px; line-height: 1.1; border: 0; }
.button-primary { background: var(--color-electric-blue); color: var(--color-canvas-white); }
.button-disabled { background: var(--color-pale-mist); color: var(--color-storm-gray); }
.button-large { min-height: 52px; padding: 10px 22px; border-radius: 48px; font-size: 24px; }
.hero-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.text-link { font-size: 20px; }
.hero-media img, .media-grid img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; border-radius: 24px; }
.event-band, .process-band { background: var(--color-sky-tint); }
.event-panel { display: grid; gap: 24px; margin-top: 24px; padding: 24px; background: var(--color-canvas-white); border-radius: 24px; border: 1px solid var(--color-pale-mist); }
.event-list { display: grid; gap: 12px; margin: 0; }
.event-list div, .price-row { display: flex; justify-content: space-between; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--color-pale-mist); }
.event-list dt { font-weight: 700; }
.event-list dd { margin: 0; text-align: right; }
.price-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.price-row { display: grid; background: var(--color-pale-mist); border: 0; border-radius: 16px; padding: 16px; }
.status-pill { display: inline-flex; padding: 8px 16px; border-radius: 5000px; background: var(--color-lemon-zest); font-family: var(--font-martian-mono); }
.split-copy, .media-grid { display: grid; grid-template-columns: .9fr 1.1fr; gap: 48px; align-items: center; }
.split-copy p { font-size: 22px; line-height: 1.35; }
.process-list { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; padding: 0; margin: 32px 0 0; list-style: none; }
.process-list li { min-height: 180px; padding: 20px; border-radius: 24px; background: var(--color-canvas-white); }
.process-list strong { display: block; font-family: var(--font-haas-grot-disp); font-size: 24px; margin-bottom: 12px; }
.social-band { background: var(--color-pale-mist); }
.reel-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 24px; }
.reel-card { display: flex; align-items: end; min-height: 160px; padding: 16px; border-radius: 24px; background: var(--color-coral-glow); font-family: var(--font-haas-grot-disp); font-size: 24px; }
.faq-list { display: grid; gap: 12px; margin-top: 24px; }
details { padding: 20px; border-radius: 24px; background: var(--color-pale-mist); }
summary { cursor: pointer; font-family: var(--font-haas-grot-disp); font-size: 24px; }
.notice { margin-top: 16px; font-size: 16px; color: rgba(17,17,24,.72); }
.site-footer { padding: 40px clamp(16px, 4vw, 48px); background: var(--color-storm-gray); color: var(--color-canvas-white); }
.footer-grid { display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.mobile-cta { display: none; }

@media (max-width: 820px) {
  .nav-links, .site-header > .button { display: none; }
  .hero-grid, .split-copy, .media-grid { grid-template-columns: 1fr; }
  .price-grid, .process-list, .reel-grid { grid-template-columns: 1fr; }
  .section { padding: 48px 16px; }
  .mobile-cta { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; display: block; padding: 12px 16px; background: rgba(255,255,255,.92); backdrop-filter: blur(16px); border-top: 1px solid var(--color-pale-mist); }
  .mobile-cta .button { width: 100%; min-height: 52px; }
  body { padding-bottom: 76px; }
}
```

- [ ] **Step 9: Add landing JS**

```js
// public/site.js
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const target = document.querySelector(anchor.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
```

- [ ] **Step 10: Add temporary image placeholders**

Create `public/assets/images/README.md`:

```md
# Landing Images

Final demo images are generated in Task 9.

Expected files:
- `classic-salon-hero.jpg`
- `rotation-conversation.jpg`
- `classic-detail.jpg`

Use the same filenames when replacing demo images with real event photos.
```

Use a temporary copy of the Notion image until generated images are produced:

Run:

```bash
mkdir -p public/assets/images
cp "기존notion/[클래식 로테이션 소개팅] 클래식을 좋아하세요/소개팅.jpg" public/assets/images/classic-salon-hero.jpg
cp public/assets/images/classic-salon-hero.jpg public/assets/images/rotation-conversation.jpg
cp public/assets/images/classic-salon-hero.jpg public/assets/images/classic-detail.jpg
```

- [ ] **Step 11: Run render tests**

Run: `npm test -- tests/render.test.js tests/publicModel.test.js`

Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add src/app.js src/routes/public.js views public tests/render.test.js
git commit -m "feat: render public landing page"
```

## Task 5: Add Admin Sessions, Login, And CSRF

**Files:**
- Create: `src/services/security.js`
- Create: `src/middleware/adminAuth.js`
- Create: `src/routes/admin.js`
- Create: `views/admin-login.ejs`
- Modify: `src/app.js`
- Create: `tests/adminAuth.test.js`

- [ ] **Step 1: Write failing admin auth tests**

```js
// tests/adminAuth.test.js
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("admin auth", () => {
  it("blocks unauthenticated dashboard access", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const response = await request(app).get("/admin");

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/admin/login");
  });

  it("rejects wrong admin password", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const response = await request(app).post("/admin/login").send("password=wrong");

    expect(response.status).toBe(401);
    expect(response.text).toContain("비밀번호");
  });

  it("logs in with the configured password and sets an httpOnly cookie", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const response = await request(app).post("/admin/login").send("password=secret");

    expect(response.status).toBe(302);
    expect(response.headers["set-cookie"].join(";")).toContain("HttpOnly");
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- tests/adminAuth.test.js`

Expected: FAIL because admin routes do not exist.

- [ ] **Step 3: Add security helpers**

```js
// src/services/security.js
import crypto from "node:crypto";
import { nanoid } from "nanoid";

export function safeCompareText(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function hashToken(token, secret) {
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

export function createSession(db, secret) {
  const token = nanoid(48);
  const csrfToken = nanoid(32);
  const tokenHash = hashToken(token, secret);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString();

  db.prepare("insert into admin_sessions (token_hash, csrf_token, expires_at) values (?, ?, ?)").run(tokenHash, csrfToken, expiresAt);

  return { token, csrfToken, expiresAt };
}

export function findSession(db, token, secret) {
  if (!token) return null;
  const tokenHash = hashToken(token, secret);
  const session = db.prepare("select * from admin_sessions where token_hash = ?").get(tokenHash);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare("delete from admin_sessions where token_hash = ?").run(tokenHash);
    return null;
  }
  return session;
}

export function destroySession(db, token, secret) {
  if (!token) return;
  db.prepare("delete from admin_sessions where token_hash = ?").run(hashToken(token, secret));
}
```

- [ ] **Step 4: Add admin auth middleware**

```js
// src/middleware/adminAuth.js
import { findSession } from "../services/security.js";

export function attachAdmin(request, _response, next) {
  const token = request.signedCookies.admin_session;
  const session = findSession(request.db, token, request.config.sessionSecret);
  request.adminSession = session;
  next();
}

export function requireAdmin(request, response, next) {
  if (!request.adminSession) {
    return response.redirect("/admin/login");
  }
  return next();
}

export function requireCsrf(request, response, next) {
  const submitted = request.get("x-csrf-token") || request.body.csrfToken;
  if (!request.adminSession || submitted !== request.adminSession.csrf_token) {
    return response.status(403).send("CSRF token mismatch");
  }
  return next();
}
```

- [ ] **Step 5: Add admin routes**

```js
// src/routes/admin.js
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { attachAdmin, requireAdmin } from "../middleware/adminAuth.js";
import { createSession, destroySession, safeCompareText } from "../services/security.js";

export const adminRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
});

adminRouter.use(attachAdmin);

adminRouter.get("/login", (request, response) => {
  response.render("admin-login", { title: "관리자 로그인", error: "" }, (error, html) => {
    if (error) throw error;
    response.render("layout", { title: "관리자 로그인", body: html });
  });
});

adminRouter.post("/login", loginLimiter, (request, response) => {
  const password = request.body.password || "";
  if (!safeCompareText(password, request.config.adminPassword)) {
    request.db.prepare("insert into admin_audit_log (action, detail, ip_address) values (?, ?, ?)").run("login_failed", "wrong password", request.ip);
    return response.status(401).render("admin-login", { title: "관리자 로그인", error: "비밀번호를 확인해 주세요." }, (error, html) => {
      if (error) throw error;
      response.render("layout", { title: "관리자 로그인", body: html });
    });
  }

  const session = createSession(request.db, request.config.sessionSecret);
  response.cookie("admin_session", session.token, {
    httpOnly: true,
    signed: true,
    sameSite: "lax",
    secure: request.config.secureCookies,
    expires: new Date(session.expiresAt)
  });
  request.db.prepare("insert into admin_audit_log (action, detail, ip_address) values (?, ?, ?)").run("login_success", "", request.ip);
  response.redirect("/admin");
});

adminRouter.post("/logout", requireAdmin, (request, response) => {
  destroySession(request.db, request.signedCookies.admin_session, request.config.sessionSecret);
  response.clearCookie("admin_session");
  response.redirect("/admin/login");
});

adminRouter.get("/", requireAdmin, (request, response) => {
  response.render("admin-dashboard", { title: "관리자", csrfToken: request.adminSession.csrf_token }, (error, html) => {
    if (error) throw error;
    response.render("layout", { title: "관리자", body: html });
  });
});
```

- [ ] **Step 6: Wire admin routes**

Add to `src/app.js`:

```js
import { adminRouter } from "./routes/admin.js";
```

Then mount it before the public router:

```js
app.use("/admin", adminRouter);
app.use("/", publicRouter);
```

- [ ] **Step 7: Add admin login and temporary dashboard views**

```ejs
<!-- views/admin-login.ejs -->
<main class="admin-shell">
  <form class="admin-card" method="post" action="/admin/login">
    <p class="eyebrow">Admin</p>
    <h1>관리자 로그인</h1>
    <% if (error) { %><p class="form-error"><%= error %></p><% } %>
    <label>
      비밀번호
      <input name="password" type="password" autocomplete="current-password" required>
    </label>
    <button class="button button-primary" type="submit">로그인</button>
  </form>
</main>
```

```ejs
<!-- views/admin-dashboard.ejs -->
<main class="admin-shell">
  <section class="admin-card">
    <p class="eyebrow">Admin</p>
    <h1>운영 대시보드</h1>
    <p>신청자 개인정보는 구글폼에서 관리하고, 이 사이트는 행사와 콘텐츠 설정만 저장합니다.</p>
    <form method="post" action="/admin/logout">
      <button class="button button-disabled" type="submit">로그아웃</button>
    </form>
    <input type="hidden" id="csrf-token" value="<%= csrfToken %>">
  </section>
</main>
```

- [ ] **Step 8: Add admin CSS additions**

Append to `public/styles.css`:

```css
.admin-shell { min-height: 100vh; display: grid; place-items: center; padding: 32px 16px; background: var(--color-sky-tint); }
.admin-card { width: min(720px, 100%); display: grid; gap: 16px; padding: 24px; border-radius: 24px; background: var(--color-canvas-white); }
.admin-card h1 { margin: 0; font-family: var(--font-haas-grot-disp); font-weight: 400; font-size: 42px; letter-spacing: -0.84px; }
.admin-card label { display: grid; gap: 8px; font-size: 16px; }
.admin-card input, .admin-card textarea, .admin-card select { width: 100%; border: 0; border-radius: 5000px; padding: 12px 16px; background: var(--color-pale-mist); color: var(--color-storm-gray); font: inherit; }
.admin-card textarea { min-height: 96px; border-radius: 24px; resize: vertical; }
.form-error { padding: 12px 16px; border-radius: 24px; background: var(--color-coral-glow); }
```

- [ ] **Step 9: Run admin auth tests**

Run: `npm test -- tests/adminAuth.test.js tests/render.test.js`

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/services/security.js src/middleware/adminAuth.js src/routes/admin.js src/app.js views/admin-login.ejs views/admin-dashboard.ejs public/styles.css tests/adminAuth.test.js
git commit -m "feat: add secure admin login"
```

## Task 6: Add Admin Event And Content Management

**Files:**
- Create: `src/services/adminService.js`
- Modify: `src/routes/admin.js`
- Modify: `views/admin-dashboard.ejs`
- Create: `public/admin.js`
- Create: `tests/adminManagement.test.js`

- [ ] **Step 1: Write failing admin management tests**

```js
// tests/adminManagement.test.js
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

async function login(agent) {
  await agent.post("/admin/login").send("password=secret");
  const dashboard = await agent.get("/admin");
  const csrfToken = dashboard.text.match(/name="csrfToken" value="([^"]+)"/)?.[1];
  return csrfToken;
}

describe("admin management", () => {
  it("updates the featured event and renders the change publicly", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const agent = request.agent(app);
    const csrfToken = await login(agent);

    const update = await agent.post("/admin/events/classic-rotation-6")
      .send({
        csrfToken,
        publicTitle: "클래식을 좋아하세요 7기",
        generationLabel: "7기 모집",
        eventDate: "7/20 토요일",
        region: "서울 강남권",
        venueNote: "참여 확정자 개별 안내",
        capacityNote: "최대 10:10",
        applicationConditions: "93-06년생 남자 / 94-06년생 여자",
        status: "closing-soon",
        googleFormUrl: "https://forms.gle/demo"
      });

    expect(update.status).toBe(302);
    const publicPage = await request(app).get("/");
    expect(publicPage.text).toContain("클래식을 좋아하세요 7기");
    expect(publicPage.text).toContain("마감 전 신청하기");
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- tests/adminManagement.test.js`

Expected: FAIL because update route and hidden CSRF input are missing.

- [ ] **Step 3: Add admin service validation and mutations**

```js
// src/services/adminService.js
import { z } from "zod";

const httpsUrl = z.string().url().refine((value) => value.startsWith("https://"), "https URL만 사용할 수 있습니다.");

export const eventInputSchema = z.object({
  publicTitle: z.string().min(1).max(80),
  generationLabel: z.string().min(1).max(40),
  eventDate: z.string().min(1).max(40),
  region: z.string().min(1).max(40),
  venueNote: z.string().min(1).max(120),
  capacityNote: z.string().min(1).max(60),
  applicationConditions: z.string().min(1).max(120),
  status: z.enum(["open", "closing-soon", "closed", "scheduled", "hidden"]),
  googleFormUrl: httpsUrl
});

export function listEvents(db) {
  return db.prepare("select * from events order by is_featured desc, created_at desc").all();
}

export function getEventForAdmin(db, id) {
  const event = db.prepare("select * from events where id = ?").get(id);
  if (!event) return null;
  return event;
}

export function updateEvent(db, id, input) {
  const data = eventInputSchema.parse(input);
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

  return result.changes === 1;
}
```

- [ ] **Step 4: Update admin route with event form and CSRF**

Add imports to `src/routes/admin.js`:

```js
import { requireCsrf } from "../middleware/adminAuth.js";
import { buildPublicModel } from "../services/publicModel.js";
import { getEventForAdmin, listEvents, updateEvent } from "../services/adminService.js";
```

Replace the dashboard route:

```js
adminRouter.get("/", requireAdmin, (request, response) => {
  const model = buildPublicModel(request.db);
  const events = listEvents(request.db);
  response.render("admin-dashboard", {
    title: "관리자",
    csrfToken: request.adminSession.csrf_token,
    model,
    events,
    error: ""
  }, (error, html) => {
    if (error) throw error;
    response.render("layout", { title: "관리자", body: html });
  });
});
```

Add update route:

```js
adminRouter.post("/events/:id", requireAdmin, requireCsrf, (request, response) => {
  const event = getEventForAdmin(request.db, request.params.id);
  if (!event) return response.status(404).send("Event not found");

  try {
    updateEvent(request.db, request.params.id, request.body);
    request.db.prepare("insert into admin_audit_log (action, detail, ip_address) values (?, ?, ?)").run("event_updated", request.params.id, request.ip);
    return response.redirect("/admin");
  } catch (error) {
    const model = buildPublicModel(request.db);
    const events = listEvents(request.db);
    return response.status(400).render("admin-dashboard", {
      title: "관리자",
      csrfToken: request.adminSession.csrf_token,
      model,
      events,
      error: error.message
    }, (renderError, html) => {
      if (renderError) throw renderError;
      response.render("layout", { title: "관리자", body: html });
    });
  }
});
```

- [ ] **Step 5: Replace dashboard view with event editor**

```ejs
<!-- views/admin-dashboard.ejs -->
<main class="admin-page">
  <header class="admin-topbar">
    <div>
      <p class="eyebrow">Admin</p>
      <h1>운영 대시보드</h1>
      <p>신청자 개인정보는 구글폼에서 관리하고, 이 사이트는 행사와 콘텐츠 설정만 저장합니다.</p>
    </div>
    <form method="post" action="/admin/logout">
      <button class="button button-disabled" type="submit">로그아웃</button>
    </form>
  </header>

  <% if (error) { %><p class="form-error"><%= error %></p><% } %>

  <section class="admin-grid">
    <article class="admin-card">
      <h2>대표 모집 행사</h2>
      <% const event = model.featuredEvent; %>
      <% if (event) { %>
        <form method="post" action="/admin/events/<%= event.id %>" class="admin-form">
          <input type="hidden" name="csrfToken" value="<%= csrfToken %>">
          <label>공개 제목<input name="publicTitle" value="<%= event.publicTitle %>" required></label>
          <label>기수 라벨<input name="generationLabel" value="<%= event.generationLabel %>" required></label>
          <label>날짜<input name="eventDate" value="<%= event.eventDate %>" required></label>
          <label>지역<input name="region" value="<%= event.region %>" required></label>
          <label>장소 안내<input name="venueNote" value="<%= event.venueNote %>" required></label>
          <label>정원<input name="capacityNote" value="<%= event.capacityNote %>" required></label>
          <label>신청 조건<input name="applicationConditions" value="<%= event.applicationConditions %>" required></label>
          <label>모집 상태
            <select name="status">
              <% ["open", "closing-soon", "closed", "scheduled", "hidden"].forEach((status) => { %>
                <option value="<%= status %>" <%= event.status === status ? "selected" : "" %>><%= status %></option>
              <% }) %>
            </select>
          </label>
          <label>구글폼 링크<input name="googleFormUrl" value="<%= event.googleFormUrl %>" required></label>
          <button class="button button-primary" type="submit">행사 저장</button>
        </form>
      <% } %>
    </article>

    <article class="admin-card">
      <h2>등록된 일정</h2>
      <div class="admin-list">
        <% events.forEach((item) => { %>
          <p><strong><%= item.public_title %></strong><br><%= item.event_date %> · <%= item.status %> · <%= item.is_featured ? "대표" : "보관" %></p>
        <% }) %>
      </div>
    </article>
  </section>
</main>
```

- [ ] **Step 6: Add admin page CSS**

Append to `public/styles.css`:

```css
.admin-page { min-height: 100vh; padding: 32px clamp(16px, 4vw, 48px); background: var(--color-sky-tint); }
.admin-topbar { width: min(1120px, 100%); margin: 0 auto 24px; display: flex; justify-content: space-between; gap: 16px; align-items: center; }
.admin-topbar h1 { margin: 0; font-family: var(--font-haas-grot-disp); font-size: 52px; font-weight: 400; letter-spacing: -0.94px; }
.admin-grid { width: min(1120px, 100%); margin: 0 auto; display: grid; grid-template-columns: 1.4fr .8fr; gap: 24px; align-items: start; }
.admin-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.admin-form label:nth-child(8), .admin-form label:nth-child(9), .admin-form button { grid-column: 1 / -1; }
.admin-list { display: grid; gap: 12px; }
@media (max-width: 820px) { .admin-topbar, .admin-grid, .admin-form { grid-template-columns: 1fr; display: grid; } }
```

- [ ] **Step 7: Run management tests**

Run: `npm test -- tests/adminManagement.test.js tests/adminAuth.test.js tests/render.test.js`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/services/adminService.js src/routes/admin.js views/admin-dashboard.ejs public/styles.css tests/adminManagement.test.js
git commit -m "feat: add admin event management"
```

## Task 7: Add Multiple Event Creation, Featured Selection, Time Slots, And Prices

**Files:**
- Modify: `src/services/adminService.js`
- Modify: `src/routes/admin.js`
- Modify: `views/admin-dashboard.ejs`
- Modify: `tests/adminManagement.test.js`

- [ ] **Step 1: Extend failing tests for multiple schedules**

Add to `tests/adminManagement.test.js`:

```js
it("creates a second schedule and can make it featured", async () => {
  const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
  const agent = request.agent(app);
  const csrfToken = await login(agent);

  const create = await agent.post("/admin/events")
    .send({
      csrfToken,
      publicTitle: "클래식을 좋아하세요 7기",
      generationLabel: "7기 예정",
      eventDate: "7/20 토요일",
      region: "서울 강남권",
      venueNote: "참여 확정자 개별 안내",
      capacityNote: "최대 10:10",
      applicationConditions: "93-06년생 남자 / 94-06년생 여자",
      status: "scheduled",
      googleFormUrl: "https://forms.gle/next"
    });

  expect(create.status).toBe(302);

  const eventRow = app.locals.db.prepare("select id from events where public_title = ?").get("클래식을 좋아하세요 7기");
  await agent.post(`/admin/events/${eventRow.id}/feature`).send({ csrfToken });

  const publicPage = await request(app).get("/");
  expect(publicPage.text).toContain("클래식을 좋아하세요 7기");
  expect(publicPage.text).toContain("신청 오픈 예정");
});
```

- [ ] **Step 2: Expose database for tests**

Add to `src/app.js` after database creation:

```js
app.locals.db = db;
```

- [ ] **Step 3: Run tests and confirm failure**

Run: `npm test -- tests/adminManagement.test.js`

Expected: FAIL because create and feature routes do not exist.

- [ ] **Step 4: Add creation and feature helpers**

Append to `src/services/adminService.js`:

```js
import { nanoid } from "nanoid";

export function createEvent(db, input) {
  const data = eventInputSchema.parse(input);
  const id = nanoid();
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

  db.prepare("insert into event_time_slots (id, event_id, label, starts_at, ends_at, sort_order) values (?, ?, ?, ?, ?, ?)").run(
    nanoid(),
    id,
    "1회차",
    "16:00",
    "18:00",
    1
  );

  db.prepare("insert into event_price_rows (id, event_id, label, amount, sort_order) values (?, ?, ?, ?, ?)").run(
    nanoid(),
    id,
    "기본",
    "40,000원",
    1
  );

  return id;
}

export function featureEvent(db, id) {
  return db.transaction(() => {
    db.prepare("update events set is_featured = 0").run();
    const result = db.prepare("update events set is_featured = 1, is_visible = 1, updated_at = datetime('now') where id = ?").run(id);
    return result.changes === 1;
  })();
}
```

- [ ] **Step 5: Add create and feature routes**

Add imports:

```js
import { createEvent, featureEvent } from "../services/adminService.js";
```

Add routes in `src/routes/admin.js`:

```js
adminRouter.post("/events", requireAdmin, requireCsrf, (request, response) => {
  try {
    const id = createEvent(request.db, request.body);
    request.db.prepare("insert into admin_audit_log (action, detail, ip_address) values (?, ?, ?)").run("event_created", id, request.ip);
    response.redirect("/admin");
  } catch (error) {
    response.status(400).send(error.message);
  }
});

adminRouter.post("/events/:id/feature", requireAdmin, requireCsrf, (request, response) => {
  const ok = featureEvent(request.db, request.params.id);
  if (!ok) return response.status(404).send("Event not found");
  request.db.prepare("insert into admin_audit_log (action, detail, ip_address) values (?, ?, ?)").run("event_featured", request.params.id, request.ip);
  response.redirect("/admin");
});
```

- [ ] **Step 6: Add create and feature controls to dashboard**

Add inside `views/admin-dashboard.ejs` after the registered events list:

```ejs
<form method="post" action="/admin/events" class="admin-form compact-form">
  <input type="hidden" name="csrfToken" value="<%= csrfToken %>">
  <input name="publicTitle" placeholder="새 일정 제목" required>
  <input name="generationLabel" placeholder="기수 라벨" required>
  <input name="eventDate" placeholder="날짜" required>
  <input name="region" value="서울 강남권" required>
  <input name="venueNote" value="참여 확정자 개별 안내" required>
  <input name="capacityNote" value="최대 10:10" required>
  <input name="applicationConditions" placeholder="신청 조건" required>
  <select name="status"><option value="scheduled">scheduled</option><option value="open">open</option></select>
  <input name="googleFormUrl" value="https://forms.gle/demo" required>
  <button class="button button-primary" type="submit">새 일정 추가</button>
</form>

<% events.forEach((item) => { %>
  <% if (!item.is_featured) { %>
    <form method="post" action="/admin/events/<%= item.id %>/feature">
      <input type="hidden" name="csrfToken" value="<%= csrfToken %>">
      <button class="button button-disabled" type="submit"><%= item.public_title %> 대표 지정</button>
    </form>
  <% } %>
<% }) %>
```

- [ ] **Step 7: Run tests**

Run: `npm test -- tests/adminManagement.test.js tests/db.test.js`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app.js src/services/adminService.js src/routes/admin.js views/admin-dashboard.ejs tests/adminManagement.test.js
git commit -m "feat: manage multiple schedules"
```

## Task 8: Add Editable Content Blocks And Legal Placeholders

**Files:**
- Modify: `src/services/adminService.js`
- Modify: `src/routes/admin.js`
- Modify: `views/admin-dashboard.ejs`
- Modify: `tests/adminManagement.test.js`

- [ ] **Step 1: Add failing content update test**

Add to `tests/adminManagement.test.js`:

```js
it("updates hero and legal content blocks", async () => {
  const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
  const agent = request.agent(app);
  const csrfToken = await login(agent);

  const response = await agent.post("/admin/content")
    .send({
      csrfToken,
      heroHeadline: "클래식으로 시작하는 새로운 인연",
      heroSubheadline: "서울 강남권에서 만나는 취향 기반 로테이션 소개팅",
      instagramUrl: "https://www.instagram.com/doyoulike.classic",
      instagramHandle: "@doyoulike.classic",
      businessName: "상호명 입력 예정",
      representative: "대표자 입력 예정",
      registrationNumber: "사업자등록번호 입력 예정",
      contact: "문의 채널 입력 예정"
    });

  expect(response.status).toBe(302);
  const publicPage = await request(app).get("/");
  expect(publicPage.text).toContain("클래식으로 시작하는 새로운 인연");
  expect(publicPage.text).toContain("상호명 입력 예정");
});
```

- [ ] **Step 2: Run test and confirm failure**

Run: `npm test -- tests/adminManagement.test.js`

Expected: FAIL because content route does not exist.

- [ ] **Step 3: Add content update helper**

Append to `src/services/adminService.js`:

```js
export const contentInputSchema = z.object({
  heroHeadline: z.string().min(1).max(120),
  heroSubheadline: z.string().min(1).max(220),
  instagramUrl: httpsUrl,
  instagramHandle: z.string().min(1).max(40),
  businessName: z.string().min(1).max(80),
  representative: z.string().min(1).max(80),
  registrationNumber: z.string().min(1).max(80),
  contact: z.string().min(1).max(120)
});

export function updateContent(db, input) {
  const data = contentInputSchema.parse(input);
  const currentHero = JSON.parse(db.prepare("select value_json from content_blocks where block_key = 'hero'").get().value_json);
  const currentInstagram = JSON.parse(db.prepare("select value_json from content_blocks where block_key = 'instagram'").get().value_json);

  const blocks = {
    hero: { ...currentHero, headline: data.heroHeadline, subheadline: data.heroSubheadline },
    instagram: { ...currentInstagram, url: data.instagramUrl, handle: data.instagramHandle },
    legal: {
      businessName: data.businessName,
      representative: data.representative,
      registrationNumber: data.registrationNumber,
      contact: data.contact,
      domain: "www.doyoulikeclassic.com"
    }
  };

  Object.entries(blocks).forEach(([key, value]) => {
    db.prepare("update content_blocks set value_json = ?, updated_at = datetime('now') where block_key = ?").run(JSON.stringify(value), key);
  });
}
```

- [ ] **Step 4: Add content route**

Import:

```js
import { updateContent } from "../services/adminService.js";
```

Add to `src/routes/admin.js`:

```js
adminRouter.post("/content", requireAdmin, requireCsrf, (request, response) => {
  try {
    updateContent(request.db, request.body);
    request.db.prepare("insert into admin_audit_log (action, detail, ip_address) values (?, ?, ?)").run("content_updated", "hero/legal", request.ip);
    response.redirect("/admin");
  } catch (error) {
    response.status(400).send(error.message);
  }
});
```

- [ ] **Step 5: Add content editor to dashboard**

Add after the event cards in `views/admin-dashboard.ejs`:

```ejs
<section class="admin-card content-editor">
  <h2>홈 콘텐츠 / 법무 정보</h2>
  <form method="post" action="/admin/content" class="admin-form">
    <input type="hidden" name="csrfToken" value="<%= csrfToken %>">
    <label>히어로 제목<input name="heroHeadline" value="<%= model.content.hero.headline %>" required></label>
    <label>히어로 설명<input name="heroSubheadline" value="<%= model.content.hero.subheadline %>" required></label>
    <label>인스타그램 URL<input name="instagramUrl" value="<%= model.content.instagram.url %>" required></label>
    <label>인스타그램 핸들<input name="instagramHandle" value="<%= model.content.instagram.handle %>" required></label>
    <label>상호명<input name="businessName" value="<%= model.content.legal.businessName %>" required></label>
    <label>대표자<input name="representative" value="<%= model.content.legal.representative %>" required></label>
    <label>사업자등록번호<input name="registrationNumber" value="<%= model.content.legal.registrationNumber %>" required></label>
    <label>문의 채널<input name="contact" value="<%= model.content.legal.contact %>" required></label>
    <button class="button button-primary" type="submit">콘텐츠 저장</button>
  </form>
</section>
```

- [ ] **Step 6: Run tests**

Run: `npm test -- tests/adminManagement.test.js tests/render.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/services/adminService.js src/routes/admin.js views/admin-dashboard.ejs tests/adminManagement.test.js
git commit -m "feat: edit landing content from admin"
```

## Task 9: Generate Demo-Quality Images

**Files:**
- Create/Replace: `public/assets/images/classic-salon-hero.jpg`
- Create/Replace: `public/assets/images/rotation-conversation.jpg`
- Create/Replace: `public/assets/images/classic-detail.jpg`
- Modify: `public/assets/images/README.md`

- [ ] **Step 1: Generate hero image**

Use the image generation skill/tool and save the result to `public/assets/images/classic-salon-hero.jpg`.

Prompt:

```text
Bright refined Seoul classic salon interior for a premium but approachable rotation dating landing page, upright piano, violin and sheet music on a small table, soft daylight mixed with warm table lamps, elegant cafe seating for quiet conversation, clean modern Korean editorial photography, high-end but not dark, no readable text, no identifiable faces, no logos, spacious composition for web hero, 4:5 portrait crop.
```

- [ ] **Step 2: Generate rotation conversation image**

Save to `public/assets/images/rotation-conversation.jpg`.

Prompt:

```text
Elegant small-group rotation dating setup in a bright classic music salon, several small tables arranged for guided one-on-one conversations, subtle silhouettes from behind only, no identifiable faces, piano and music stands in the background, refined warm atmosphere, clean modern editorial photo, bright canvas-friendly palette, no text, no logos, 4:5 portrait crop.
```

- [ ] **Step 3: Generate detail image**

Save to `public/assets/images/classic-detail.jpg`.

Prompt:

```text
Close-up still life for a classical music dating event, violin, sheet music, two coffee cups, small flowers, warm candle-like table lights, bright clean surface, refined romantic but professional mood, modern Korean editorial photography, no text, no logos, 4:5 portrait crop.
```

- [ ] **Step 4: Update image README**

```md
# Landing Images

Generated demo images:

- `classic-salon-hero.jpg` - hero salon image.
- `rotation-conversation.jpg` - guided rotation conversation scene.
- `classic-detail.jpg` - sheet music and instrument detail.

Replacement rule: keep these filenames and approximate 4:5 crops when swapping in real event photos so the layout does not change.

All generated images intentionally avoid identifiable faces and logos.
```

- [ ] **Step 5: Verify image files exist**

Run:

```bash
test -s public/assets/images/classic-salon-hero.jpg
test -s public/assets/images/rotation-conversation.jpg
test -s public/assets/images/classic-detail.jpg
```

Expected: all commands exit with code 0.

- [ ] **Step 6: Commit**

```bash
git add public/assets/images
git commit -m "feat: add demo landing imagery"
```

## Task 10: Add Browser Tests And Visual Checks

**Files:**
- Create: `playwright.config.js`
- Create: `tests/playwright/landing.spec.js`
- Modify: `package.json`

- [ ] **Step 1: Add Playwright config**

```js
// playwright.config.js
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/playwright",
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: "test",
      PORT: "3000",
      DATABASE_PATH: "data/test-playwright.sqlite",
      ADMIN_PASSWORD: "secret",
      SESSION_SECRET: "test-secret",
      PUBLIC_BASE_URL: "http://127.0.0.1:3000"
    }
  },
  projects: [
    { name: "Desktop Chrome", use: { ...devices["Desktop Chrome"] } },
    { name: "Mobile Safari", use: { ...devices["iPhone 13"] } }
  ]
});
```

- [ ] **Step 2: Ensure production startup seeds database when empty**

Add to `server.js` before `createApp`:

```js
import fs from "node:fs";
import { createDatabase } from "./src/db/database.js";
import { seedDatabase } from "./src/db/seed.js";
```

Replace startup body:

```js
const config = loadConfig();
const shouldSeed = !fs.existsSync(config.dbPath);
if (shouldSeed) {
  const db = createDatabase(config.dbPath);
  seedDatabase(db);
  db.close();
}
const app = createApp(config);
```

- [ ] **Step 3: Write Playwright checks**

```js
// tests/playwright/landing.spec.js
import { expect, test } from "@playwright/test";

test("landing page is readable and has working CTA state", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /클래식을 좋아하세요/ })).toBeVisible();
  await expect(page.getByText("누적 신청 500명+")).toBeVisible();
  await expect(page.getByRole("link", { name: "이번 기수 신청하기" }).first()).toBeVisible();
  await expect(page.locator("img[alt*='클래식 살롱']")).toBeVisible();
});

test("admin login page renders", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: "관리자 로그인" })).toBeVisible();
  await expect(page.getByLabel("비밀번호")).toBeVisible();
});
```

- [ ] **Step 4: Run all unit tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Install browsers if needed**

Run: `npx playwright install chromium webkit`

Expected: browsers installed or already present.

- [ ] **Step 6: Run browser tests**

Run: `npm run test:browser`

Expected: PASS on desktop and mobile projects.

- [ ] **Step 7: Commit**

```bash
git add playwright.config.js tests/playwright package.json package-lock.json server.js
git commit -m "test: add browser verification"
```

## Task 11: Add Raspberry Pi Deployment And Security Docs

**Files:**
- Create: `docs/deployment-raspberry-pi.md`
- Create: `docs/security-checklist.md`
- Modify: `README.md`

- [ ] **Step 1: Write deployment guide**

```md
# Raspberry Pi Deployment

## Runtime

- Node.js 20 or newer
- Nginx
- SQLite database stored at `/var/www/classic-rotation/data/classic-rotation.sqlite`
- Domain: `www.doyoulikeclassic.com`

## First Setup

```bash
sudo mkdir -p /var/www/classic-rotation
sudo chown -R $USER:$USER /var/www/classic-rotation
git clone <repo-url> /var/www/classic-rotation
cd /var/www/classic-rotation
npm ci --omit=dev
cp .env.example .env
nano .env
npm run db:seed
```

Use strong values for:

- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `DATABASE_PATH=/var/www/classic-rotation/data/classic-rotation.sqlite`
- `PUBLIC_BASE_URL=https://www.doyoulikeclassic.com`

## Systemd Service

Create `/etc/systemd/system/classic-rotation.service`:

```ini
[Unit]
Description=Classic Rotation Landing
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/classic-rotation
EnvironmentFile=/var/www/classic-rotation/.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

Enable:

```bash
sudo systemctl daemon-reload
sudo systemctl enable classic-rotation
sudo systemctl start classic-rotation
sudo systemctl status classic-rotation
```

## Nginx

Create `/etc/nginx/sites-available/classic-rotation`:

```nginx
server {
  listen 80;
  server_name www.doyoulikeclassic.com doyoulikeclassic.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/classic-rotation /etc/nginx/sites-enabled/classic-rotation
sudo nginx -t
sudo systemctl reload nginx
```

## HTTPS

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d www.doyoulikeclassic.com -d doyoulikeclassic.com
```

## Backup

```bash
mkdir -p ~/classic-rotation-backups
sqlite3 /var/www/classic-rotation/data/classic-rotation.sqlite ".backup '$HOME/classic-rotation-backups/classic-rotation-$(date +%F).sqlite'"
```
```

- [ ] **Step 2: Write security checklist**

```md
# Security Checklist

- Use HTTPS before sharing `/admin` publicly.
- Replace `ADMIN_PASSWORD` before launch.
- Use a long random `SESSION_SECRET`.
- Keep Google Form URL editable only through admin.
- Do not add applicant fields or applicant records to this app.
- Back up SQLite before editing production content.
- Rotate the admin password after demos.
- Confirm `.env` is not committed.
- Confirm `data/*.sqlite` is not committed.
- Keep the Raspberry Pi OS and Node.js updated.
- Restrict SSH access to key-based login.
- Use firewall rules that expose only SSH, HTTP, and HTTPS.
```

- [ ] **Step 3: Add README**

```md
# 클래식을 좋아하세요 Landing

Professional landing page and B-lite admin for a classic-themed rotation dating event.

## Local Development

```bash
npm install
cp .env.example .env
npm run db:seed
npm run dev
```

Open:

- Public: http://localhost:3000
- Admin: http://localhost:3000/admin

## Tests

```bash
npm test
npm run test:browser
```

## Deployment

See `docs/deployment-raspberry-pi.md`.

## Privacy Boundary

The site stores event/content settings only. Applicant personal information remains in Google Forms and is handled manually by the operator.
```

- [ ] **Step 4: Run docs sanity check**

Run: `rg -n "PLACEHOLDER|REPLACE_ME|<repo-url>" README.md docs`

Expected: only `<repo-url>` appears in deployment guide as an intentional placeholder for the eventual repository remote. Replace it before actual deployment.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/deployment-raspberry-pi.md docs/security-checklist.md
git commit -m "docs: add deployment and security guidance"
```

## Task 12: Final Verification And Demo Run

**Files:**
- Modify only if verification reveals a real defect.

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: all Vitest tests pass.

- [ ] **Step 2: Run browser tests**

Run: `npm run test:browser`

Expected: Playwright desktop and mobile checks pass.

- [ ] **Step 3: Start local server**

Run: `npm run dev`

Expected: server starts at `http://localhost:3000`.

- [ ] **Step 4: Manual browser verification**

Open:

- `http://localhost:3000`
- `http://localhost:3000/admin/login`

Check:

- Hero image renders.
- CTA links to the configured Google Form.
- Event card shows date, region, conditions, times, prices, and selection notice.
- Mobile width shows sticky CTA.
- Admin login works with `.env` password.
- Updating event title changes public page.
- No text overlaps at 390px, 768px, and 1440px widths.

- [ ] **Step 5: Confirm privacy boundary**

Run:

```bash
rg -n "applicant|phone|birth|contact_number|personal" src views public tests
```

Expected: no applicant storage fields exist. Mentions about privacy boundary are acceptable.

- [ ] **Step 6: Commit final fixes if any**

If files changed during verification:

```bash
git add <changed-files>
git commit -m "fix: polish landing demo verification"
```

If no files changed, do not create an empty commit.

## Self-Review

- Spec coverage: The plan covers public landing page, B-lite admin, multiple stored events with one featured event, Google Form CTA, no applicant data storage, generated demo images, security baseline, tests, and Raspberry Pi deployment docs.
- Placeholder scan: The only intentional deployment placeholder is `<repo-url>` in the Raspberry Pi guide because the remote repository URL is not known in this local project. The plan tells the implementer to replace it before production deployment.
- Type consistency: Event status values are consistently `open`, `closing-soon`, `closed`, `scheduled`, and `hidden`. Main service functions are consistently named `buildPublicModel`, `getCtaForStatus`, `updateEvent`, `createEvent`, `featureEvent`, and `updateContent`.
- Scope check: Native applicant forms, payment, matching, messaging, and applicant storage remain out of scope.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-24-classic-rotation-landing.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, faster iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.
