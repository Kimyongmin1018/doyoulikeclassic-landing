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

## Operations

- The public page shows one featured event.
- The admin can manage multiple schedules, time slots, price rows, CTA state, landing content, FAQ, Instagram links, and legal/contact placeholders.
- Applicant information is not stored in this app. Applications continue through Google Forms and are handled manually.

## Deployment

See [docs/deployment-raspberry-pi.md](docs/deployment-raspberry-pi.md).
