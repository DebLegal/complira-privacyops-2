# Run the synthetic Next.js MVP

Use Node.js 20.9+ (validated with Node 24.22.1) and npm. From the repository root:

```sh
npm ci
npm run dev
```

Open `/demo/overview` on the development server (port 3000 by default). `/demo` redirects there. The seven routes are overview, processing, vendors, notices, changes, findings, and reports. `/app` is intentionally absent. For a production build use `npm run build` then `npm start`.

The synthetic demo needs no environment variables, database, authentication service or AI key. Customer mode is implemented separately and remains disabled; see LIVE_SETUP.md. The original `index.html`, `src/app.js`, fixtures and reference are preserved.

Records use the single session repository in `lib/repository.ts`; tab-session data survives route navigation and reload. Reset restores the exact fixture. Closing the browser session clears session data. Persona selection simulates Editor/Reviewer and grants no real authorization. Store and pure domain operations can be replaced by a future adapter, but server enforcement must be designed separately. Zod validates stored and edited data.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

E2E runs against the production build and starts its own server on port 3100. Keep that port free. It uses system Chromium at `/usr/bin/chromium`; on another machine set `CHROMIUM_PATH` to a Chromium executable, or install Playwright Chromium with `npx playwright install chromium`; when system Chromium is absent, the config uses that bundled browser. The managed environment already has system Chromium. Test artifacts live in ignored `test-results/`. Tests use desktop and mobile Chromium, not a claim of Safari support.

## Walkthrough

1. Overview starts with 4 activities, 4 vendors, 4 open findings and 3 open actions.
2. In Change control create **Add analytics processor**, type **New vendor**, activity `ACT-003`, vendor `VEN-003`, owner Engineering. Review checks shows exactly four metadata suggestions on 16 November 2026: purpose mapping, contract evidence, retention and vendor role. Demo checks are pinned to 16 November 2026; customer-mode checks use the actual server date.
3. Record the review request and repeat. Four findings and four actions are added once; repeated evaluation remains in history. Stable fingerprints span equivalent changes and include source versions.
4. In Findings & actions assign owners/dates, edit linked actions, request closure with synthetic evidence metadata as Editor, then switch to Reviewer to approve/reject with rationale. Reopen closed findings as Reviewer. History includes reasons, persona and timestamps.
5. In Notice versions create v3, map ACT-003, compare with current, submit, then review. Approval archives the prior current version inside the register. Rejected drafts can be edited and resubmitted.
6. Reports exports live CSV and JSON, and Print / PDF uses the browser print dialog. CSV prefixes formula-like cells including whitespace/control prefixes. JSON includes schema version, scope, timestamp, limitations and current workspace.

## Boundaries and unverified items

SYNTHETIC DATA ONLY. Do not enter real names, documents, contracts or customer information. Real uploads and AI calls are unavailable. Server authentication, tenant repository and RLS code now exist behind the disabled customer gate; their target deployment, secure storage, backups and monitoring have not been verified. SC-10 is now exercised locally against real PostgreSQL tenant policies; hosted Supabase/API/browser identity checks remain blocked. `/app` exists but fails closed without verified configuration. Demo role guards are tested as domain behavior, not a security boundary. No actual documents, public notices, live systems, security controls, statutory applicability or legal sufficiency have been verified. Suggestions are not confirmed breaches, compliance certification, audits or legal opinions. Notice approval does not publish anything to a public website. Legal references retained from fixtures are explicitly unverified.
