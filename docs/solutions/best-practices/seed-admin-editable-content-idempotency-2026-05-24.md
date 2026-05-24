---
title: Keep Seed Data Non-Destructive For Admin-Editable Apps
date: 2026-05-24
category: docs/solutions/best-practices
module: seed data and admin-editable content
problem_type: best_practice
component: database
severity: medium
applies_when:
  - building SQLite-backed apps where seed data becomes editable by admins
  - adding child-row seed data such as event time slots, price rows, or content blocks
  - migrating from random seed row IDs to stable IDs
tags: [seed-data, sqlite, idempotency, admin-editing, migrations]
---

# Keep Seed Data Non-Destructive For Admin-Editable Apps

## Context

During the classic rotation landing/admin build, multiple review loops caught the same class of issue in the seed layer: seed data that looked harmless for a demo could overwrite admin edits, duplicate child rows, or fail to reconcile older randomly generated IDs after the app became editable.

The app stores events, time slots, price rows, and landing content in SQLite. Once the admin dashboard can edit those rows, seed code must stop behaving like a reset script.

## Guidance

Treat seed data as initial defaults, not as a source of truth. For admin-editable apps:

- Insert parent seed rows with `on conflict do nothing`.
- Preserve an existing featured event instead of force-promoting the seeded event.
- Give seeded child rows stable IDs.
- Migrate known legacy child rows to stable IDs when possible.
- Prune only duplicate legacy rows that match the seed identity exactly.
- Keep tests that run seeding multiple times after simulated admin edits.

Example pattern:

```js
db.prepare(`
  insert into content_blocks (block_key, value_json)
  values (?, ?)
  on conflict(block_key) do nothing
`).run(key, JSON.stringify(value));
```

For child rows, compare identity columns such as `label`, `starts_at`, `ends_at`, `amount`, and `note` before deleting legacy duplicates. Do not delete rows merely because they belong to the seeded parent.

## Why This Matters

Seed scripts often run during setup, deployment, tests, or recovery. If they overwrite editable production rows, the admin loses live content. If they generate new child row IDs on every run, public pages can show duplicated schedules and prices. If they cannot migrate old seed data, early demos become hard to upgrade safely.

The prevention rule is simple: after a row can be edited by an operator, seed code may create missing defaults, but it must not re-own that row's current value.

## When to Apply

- When a static landing page becomes a B-lite admin app.
- When seed data includes one-to-many child rows.
- When demo data may later survive into production.
- When tests use `seedDatabase(db)` more than once against the same database.

## Examples

Useful tests for this pattern:

- Run `seedDatabase(db)`, edit the featured event title and CTA URL, then run `seedDatabase(db)` again and assert the admin edit remains.
- Run seed multiple times and assert child row counts do not grow.
- Simulate legacy child rows with old IDs, then seed and assert they migrate or prune conservatively.
- Add a new non-seeded event, run seed, and assert the existing featured event remains featured.

## Related

- Seed implementation: `src/db/seed.js`
- Seed regression tests: `tests/db.test.js`
