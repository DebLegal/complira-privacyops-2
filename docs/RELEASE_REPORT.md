# Complira PrivacyOps 3.0 release report

16 November 2026. **Customer release: BLOCKED. Synthetic demo: verified.** No production data was accessed and no live client deployment was made. This is not a claim of production readiness, legal compliance or zero defects.

## Checkpoints and scope

A: preserved prior working implementation in checkpoint commit `bbb48c0`; work is on `feat/complira-privacyops-3`. Original HTML, readable source, fixtures and older reference are unchanged.

B: retained exactly seven primary modules and workflows; added three-step change review, contextual source details/breadcrumbs, change editing, page/record command search, due-work overview, unsaved-edit guards and versioned reports. Demo has exact original 4/4/2/4/3/2 baseline and synthetic-only banners/exports. Demo checks use 16 November 2026 for repeatability; decision timestamps use runtime time. Existing demo session data remains supported. Customer state has a separate empty baseline and never reads demo session storage.

C: added server-side Supabase verified identity/PKCE/cookie refresh code, organization onboarding/member invitations, role checks, PostgreSQL transactional repository, tenant RLS/composite links, optimistic versions, unique fingerprints/current notice, independent reviews, append-only history and audited persisted-state reports. No client service key, fake login or real file upload path exists. `/app`, `/login` and APIs fail closed without the explicit enable flag and complete configuration.

The redesigned HTML and requested UX contract/starter SQL/release tests were absent from the workspace. New contracts document the supplied prompt and available original reference; unseen visual fidelity is not claimed. No existing production schema was available to inspect. The new-install SQL refuses an existing Complira schema; a target-specific incremental migration remains blocked until that target is available.

## Gate results

| Gate | Result | Evidence and limits |
| --- | --- | --- |
| `npm run typecheck` | PASS | TypeScript checks completed |
| `npm run lint` | PASS | Zero errors/warnings |
| `npm test` | PASS | 20 unit/security tests; no skipped tests |
| `npm run build` | PASS | Seven demo routes plus separate gated customer/API/auth routes compile |
| `npm run test:e2e` | PASS | 14 checks: seven workflows on each of 1440px desktop / 375px mobile Chromium |
| `npm run test:db` | PASS | 18 real PostgreSQL integration checks, version 17.12; disposable Docker DB only |
| Fixture reset, all ten rules and four analytics suggestions | PASS | Original scenario fixtures used; repeated checks produce no duplicate actionable records |
| CRUD, links, archive/restore, review/rejection/reopen, task edits, notice comparison/approval | PASS | Unit, browser and relevant repository checks |
| Page/record search, three wizard steps, invalid submission, unsaved edits, focus/Escape/navigation | PASS | Browser checks include source links and retained data across steps |
| CSV formula protection, JSON scope/versions/assumptions, report state | PASS | Six supplied formula payloads plus control prefixes tested; browser downloads inspected |
| Print/PDF | PASS / LIMITED | Print control invocation tested; OS print-dialog completion and printer/PDF output fidelity are not automated |
| Favicon and smooth-scroll metadata warning | PASS | SVG icon HTTP 200; seven-screen sweep has no console errors or prior metadata warning |
| Desktop/mobile rendering | PASS | Expected headings, seven links, no page-wide horizontal overflow; wide tables/nav scroll horizontally |
| Local tenant A/B denial, unknown org, forged actors, public/anon/API-role SQL grants | PASS | Real DB roles/RLS; authenticated SQL writes denied, server identity derived separately |
| Local memberships/invitations | PASS | Owner invitations, email binding, replay/expiry denial, admin escalation denial, viewer/editor invite denial |
| Local concurrency/idempotency and current notice/fingerprint uniqueness | PASS | Same request replay, changed-payload refusal, stale writes, two simultaneous writes yielding one winner and one 409 |
| Local reviewer/no-self-approval, append-only decisions/audit | PASS | Shared domain plus DB triggers, real role checks and actor validation |
| Local RLS/role inventory | PASS | All ten tenant tables ENABLE/FORCE RLS; server role is NOLOGIN/NOBYPASSRLS/non-superuser; no authenticated server-role grant |
| Demo/customer separation and missing credentials | PASS | Customer pages show disabled gate; customer APIs return 503 and no fixture/customer records |
| Source/credential separation | PASS / LIMITED | Server-only modules and blank `.env.example`; build assets checked for server credential names/test bindings. No real hosted secrets were supplied to test |
| Hosted Supabase signup/confirmation/PKCE/refresh/logout | BLOCKED | No supplied project URL/public key/SMTP/redirect configuration |
| Real target inventory, incremental migration, PostgREST JWT/grant/RLS verification | BLOCKED | No target database/project configuration. Local authenticated SQL is not a hosted API verification |
| Target organization onboarding and two independently signed-in customer browser sessions | BLOCKED | Requires hosted auth/database configuration; not simulated as a successful login |
| Real evidence storage, signed URLs, scanning, limits, deletion/retention | BLOCKED / DISABLED | No bucket created; file endpoints refuse access. Metadata-only beta code exists; real files remain unavailable |
| Production monitoring/backups/recovery, deployment TLS/secret injection, legal source verification | BLOCKED | Not configured or independently verified |

## Reproducible problems corrected

- An older focus assertion selected the hidden command-search dialog. It now asserts focus stays inside `dialog[open]`; no assertion was removed.
- A seven-route mobile screenshot sweep exceeded its 30-second budget. That sweep now has a 90-second budget; all route/console/overflow/screenshot assertions remain and final runs passed.
- PostgreSQL initialization briefly exposes a temporary socket. The harness now waits for its final TCP listener, avoiding a readiness race.
- Unchanged closed findings were rewritten with INSERT ON CONFLICT, invoking insert review guards before conflict resolution. Persistence now skips unchanged rows and explicitly updates existing rows. A concurrency test reproduces the regression and verifies the fix.
- Calendar dates and input lengths are validated at the server schema boundary as well as the form UI.

## Screenshots and use

Real screenshots captured by the final browser suite:

- [Desktop overview](screenshots/desktop-overview.png)
- [375px mobile overview](screenshots/mobile-overview.png)
- [Desktop change control](screenshots/desktop-changes.png)
- [Desktop reports](screenshots/desktop-reports.png)
- All seven routes at both viewport sizes are in `docs/screenshots/`.

Run the demo with `npm ci` then `npm run dev` from the checkout. It needs no account or secrets. Tests use port 3100; the app normally uses port 3000. No public URL or working Cloud Desktop proxy is promised by these repository changes.

## Exact next steps / resume

Supply project bindings through secure environment/deployment settings: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or existing ANON_KEY), DATABASE_URL, APP_ORIGIN. Keep COMPLIRA_APP_ENABLED=false until the target authentication, role/RLS, API and browser gates pass. No AI or service-role key is required. Follow LIVE_SETUP.md, inventory the real target before generating/applying an incremental migration, verify provider-specific auth.uid/role ownership behavior, and run the hosted gates using real confirmed test accounts in two organizations. Keep uploads disabled. Do not deploy client access automatically.
