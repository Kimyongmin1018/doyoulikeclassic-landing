# Classic Rotation Landing Page Design

## Goal

Build a professional landing page and lightweight admin system for the "클래식을 좋아하세요" classic-themed rotation dating event. The first version should be strong enough for a sales demo, practical enough to run on a Raspberry Pi, and structured so the business can update event information without editing HTML.

## Approved Direction

The brand expression should combine:

- A refined, trustworthy classic salon mood.
- A warm, lightly romantic "shared taste" atmosphere.
- A clear service landing page structure optimized for application conversion.

The official service name on the page is **클래식을 좋아하세요**. Hero copy may use the softer question form, such as "클래식을 좋아하세요? 같은 취향이 설렘이 되는 밤."

## Source Context

Existing Notion content provides:

- Concept: domestic classic rotation dating event for people who love classical music.
- Current proof point: 500+ accumulated applicants.
- Format: 5-10 opposite-sex participants met sequentially in a rotation format.
- Current audience examples: classical music majors, developers, teachers, researchers, finance professionals.
- Current sample event: 6th event, up to 10:10, Seoul Gangnam/Nohyeon area, two time slots, selected applicants contacted individually.
- Current pricing: base 40,000 KRW, friend discount 32,000 KRW, returning participant discount 35,000 KRW, early bird 33,000 KRW.
- Current channel: Instagram `@doyoulike.classic`.
- Existing media: Instagram reels and the local Notion image.

Competitor references inform the structure:

- MORA uses trust, verification, process explanation, reviews, FAQ, terms, and privacy sections as conversion support: https://www.morameeting.com/index.php
- 러브매칭 uses accumulated participation stats, schedule CTAs, contact information, and business information to establish legitimacy: https://www.lovematching.kr/
- 감정적인 오렌지들 uses program lists, beginner guidance, and reassuring copy for users who are new or nervous about rotation dating: https://emotional0ranges.com/date

The design should borrow these structural patterns, but the differentiator must remain the classic music taste-based concept rather than a generic dating platform.

## Scope

### In Scope

- Public landing page.
- B-lite admin page at `/admin`.
- Multiple schedules/events in admin.
- One featured current recruiting event shown prominently on the landing page.
- Google Form application link managed through admin.
- Admin-managed event state and CTA behavior.
- Admin-managed homepage content, FAQ, social links, pricing, trust text, and legal/contact placeholders.
- Demo-quality generated images that can later be replaced with real event photos.
- Raspberry Pi-friendly deployment structure and documentation.
- Security baseline suitable for a small admin-only content system.

### Out of Scope

- Storing applicant personal data in the site database.
- Replacing Google Forms with a native application form.
- Payment processing.
- Automated applicant selection, matching, messaging, or participant management.
- Multi-region expansion workflows.
- Complex CMS roles and permissions.

## Public Landing Page Structure

### 1. Header

The header should be sticky and minimal:

- Left: "클래식을 좋아하세요" wordmark.
- Right: section anchors and a primary application button.
- Mobile: compact menu and persistent bottom CTA.

The CTA state must follow the featured event status.

### 2. Hero

The hero should communicate the concept immediately:

- Brand name as first-viewport signal.
- Main copy: "클래식을 좋아하세요? 같은 취향이 설렘이 되는 밤."
- Supporting copy: "클래식을 사랑하는 사람들이 서울 강남권의 조용한 공간에서 1:1로 대화하는 로테이션 소개팅."
- Trust badges: "누적 신청 500명+", "5-10명 순차 대화", "서울 강남권", "선정자 개별 안내".
- Primary CTA: "이번 기수 신청하기".
- Secondary link: "진행 방식 보기".

Hero media should show a bright refined classic salon atmosphere, with piano or strings, sheet music, small tables, and warm conversational lighting. It should avoid identifiable faces.

### 3. Featured Event

The featured event is the primary conversion block. It should show:

- Event generation/title, such as "6기 모집".
- Event date.
- Region, defaulting to "서울 강남권".
- Venue note, such as "참여 확정자에게 개별 안내".
- Time slots.
- Application conditions by gender/age range.
- Capacity note, such as "최대 10:10".
- Price and discounts.
- Recruiting status.
- Google Form CTA.

The landing page shows one featured event, but admin can store multiple events and designate which event is featured.

### 4. Differentiation

Explain why this is not just another blind date:

- People start with a shared taste in classical music.
- The conversation has a natural topic from the beginning.
- Participants can meet several people without the pressure of a long one-on-one date.
- The mood is calm, elegant, and guided.

This section should be emotional, but concise.

### 5. Process

Show a clear step-by-step flow:

1. Submit Google Form.
2. Internal review and age/gender balance check.
3. Selected participants receive individual message.
4. Attend the event and sit according to host guidance.
5. Rotate through 1:1 conversations.
6. Submit preference or follow-up information according to the operator's current process.

The payment flow is: application first, selected participants receive separate payment instructions manually. The site should not imply instant payment or automatic confirmation.

### 6. Participants And Atmosphere

Use Notion-provided participant examples:

- Classical music majors.
- Developers.
- Teachers.
- Researchers.
- Finance professionals.

The copy should reassure users that participants have different daily lives but share the same musical sensibility.

### 7. Pricing

The pricing block should show:

- Base price: 40,000 KRW.
- Friend discount: 32,000 KRW.
- Returning participant discount: 35,000 KRW.
- Early bird discount: 33,000 KRW.

Admin can modify all labels and amounts. The section must include a note that payment instructions are sent only after participation is confirmed.

### 8. Media And Social Proof

Use demo images for the first build:

- Main classic salon image.
- Rotation conversation atmosphere image.
- Detail image with sheet music, string instrument, table setting, or piano.

Existing Instagram reels should be shown as external links or preview cards:

- https://www.instagram.com/reel/DVKbkOuk1Q8/?igsh=MXY3NDBjeWJpY2Vleg==
- https://www.instagram.com/reel/DVyRf8qE-fs/?igsh=ZmkweXUyY2F2dW8=
- https://www.instagram.com/reel/DV-68kHk0Jx/?igsh=cWF0Nm5vejQ0Znox
- https://www.instagram.com/reel/DWrNwa8k7ZY/?igsh=MmI2emV3c2x3N2l6

### 9. FAQ And Notices

The FAQ should answer:

- Is application first-come, first-served?
- What happens after I submit the form?
- Can I apply if I am not a classical music major?
- Where is the venue?
- How is payment handled?
- How is personal information handled?
- What should I do if I cannot attend after confirmation?
- Will my face or personal information be publicly shown?

Notices should clearly state:

- Participation is not first-come, first-served.
- The operator reviews applications and sends individual confirmation.
- Time and location should be checked before applying.
- Personal information is collected through Google Forms, not stored in this site.

### 10. Footer

Footer should include:

- Instagram `@doyoulike.classic`.
- Domain `www.doyoulikeclassic.com`.
- Contact placeholder.
- Business information placeholders for demo.
- Terms, privacy policy, refund/cancellation notice links or modal placeholders.

Known information from Notion should be filled. Unknown legal/business fields should remain visibly structured placeholders for replacement before production.

## Visual Design

The implementation must follow `DESIGN.md` as the primary design system.

### Color

- Use Canvas White and Sky Tint as the main page surfaces.
- Use Electric Blue for all primary CTAs and active states.
- Use Storm Gray for text.
- Use Lemon Zest, Vivid Green, Coral Glow, Cool Aqua, Sunset Orange, and Flame Red as geometric accent shapes.
- Avoid a brown/gold-heavy classic palette. The classic concept should come from imagery, copy, and typography rather than overriding the design system.

### Typography

- Use the `Haas Grot Text`, `Haas Grot Disp`, and `Martian Mono` font stacks from `DESIGN.md`.
- Use display typography for the hero and major section headings.
- Use readable text sizes for schedule, FAQ, and admin content.
- Keep Korean copy compact and scan-friendly.

### Layout

- Use full-width sections with constrained inner content.
- Avoid card nesting.
- Use cards only for repeated schedule/FAQ/media/pricing items.
- Keep the current event block close to the hero to improve conversion.
- Use a persistent mobile CTA whose label and enabled state follows the featured event.

### Imagery

Generate demo-quality raster images:

1. Bright Seoul classic salon hero scene, piano or strings, elegant table setting, no identifiable faces.
2. Small guided rotation conversation setting, refined and warm, no identifiable faces.
3. Detail still life with sheet music, violin or cello, flowers or table lights, bright enough to fit the SuperHi design.

Images should be easy to replace later without layout changes.

## Admin Design

### Login

Admin access starts at `/admin`.

- Login with password.
- No public registration.
- Password configured through environment variable.
- Session-based authentication.

### Dashboard

The admin dashboard should provide:

- Featured event status summary.
- Quick links to edit event, pricing, FAQ, and social/legal information.
- Reminder that applicant data is handled in Google Forms.

### Event Management

Admin can create and edit multiple events. Each event has:

- Internal name.
- Public title.
- Generation label.
- Date.
- Region.
- Venue note.
- Capacity note.
- Gender/age application conditions.
- One or more time slots.
- Price rows.
- Status.
- Google Form URL.
- Featured flag.
- Visibility flag.

Only one event can be featured at a time. If no event is featured, the public page should show an "upcoming schedule" state with disabled application CTA.

### Status Behavior

Supported event statuses:

- `open`: button enabled, label "이번 기수 신청하기".
- `closing-soon`: button enabled, label "마감 전 신청하기".
- `closed`: button disabled or replaced with "모집 마감".
- `scheduled`: button disabled or replaced with "신청 오픈 예정".
- `hidden`: not shown publicly.

### Content Management

Admin can edit:

- Hero headline and subheadline.
- Trust badges.
- Differentiation copy.
- Participant examples.
- FAQ entries.
- Instagram links.
- Footer/contact/legal placeholders.

The initial content should be seeded from the existing Notion page.

## Data Model

Use SQLite for local persistence.

Suggested tables:

- `events`: event-level settings and featured/visibility/status fields.
- `event_time_slots`: one row per time slot.
- `event_price_rows`: one row per price or discount.
- `content_blocks`: editable key/value JSON for hero, badges, sections, FAQ, social links, and legal placeholders.
- `admin_audit_log`: timestamped records for login attempts and content changes.

Applicant records are not stored.

## Technical Architecture

Use a Raspberry Pi-friendly Node.js Express app with SQLite and static assets.

Recommended structure:

- `server.js`: Express app setup.
- `src/db/`: SQLite connection, schema, seed data.
- `src/routes/public.js`: public page/config routes.
- `src/routes/admin.js`: admin auth and content APIs.
- `src/services/`: event/content normalization.
- `public/`: CSS, client JS, generated images, static assets.
- `views/`: server-rendered HTML templates for landing/admin screens.
- `docs/`: setup and deployment notes.

The public landing page and admin screens should be server-rendered by Express templates. Admin mutations should use small JSON APIs. This keeps the Raspberry Pi deployment simple and avoids building a separate frontend app.

## Security Requirements

- Do not store applicant personal data.
- Keep Google Form URL editable only by authenticated admin.
- Use environment variables for admin password and session secret.
- Use `httpOnly` session cookies.
- Use `sameSite` cookies.
- Use `secure` cookies in production behind HTTPS.
- Add CSRF protection for admin mutations.
- Add rate limiting for login and admin APIs.
- Add Helmet or equivalent security headers.
- Validate and sanitize admin input.
- Restrict URL fields to `https://` links.
- Log failed login attempts.
- Include deployment guidance for Nginx HTTPS, firewall basics, database backup, and password rotation.

## Testing And Verification

Implementation should include:

- Unit tests for featured event selection and CTA state mapping.
- Tests for public config not exposing admin-only fields.
- Auth tests for admin API access control.
- Tests for only one featured event at a time.
- Tests for status behavior.
- Basic HTML rendering smoke test.
- Browser verification on desktop and mobile viewports.
- Visual check that generated images load and text does not overlap.

## Deployment Assumptions

Deployment is not final. The first version should support:

- Local development.
- Raspberry Pi hosting.
- Later domain connection for `www.doyoulikeclassic.com`.

Expected production outline:

- Raspberry Pi runs the Node app as a service.
- Nginx reverse proxies traffic to the app.
- DNS A record points `www.doyoulikeclassic.com` to the server's public IP.
- HTTPS is configured through Let's Encrypt or equivalent.
- SQLite database is backed up regularly.

## Acceptance Criteria

- A visitor can understand the concept, event schedule, application conditions, pricing, and application flow without reading the old Notion page.
- The page looks professional enough for a sales demo and follows `DESIGN.md`.
- The page uses demo images that are high quality and replaceable.
- The current featured event is visible and has correct CTA behavior.
- Admin can log in and update featured event information without code changes.
- Admin can keep multiple schedules but expose only the featured one on the main landing page.
- The application CTA sends users to Google Forms.
- The site stores no applicant personal data.
- Footer/legal/contact placeholders are present and clearly replaceable before production.
- The app can run locally and has a documented path to Raspberry Pi deployment.
