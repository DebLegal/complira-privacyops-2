# ONE MASTER PROMPT — Original Complira PrivacyOps MVP (copy everything inside the code block)

```text
You are a senior full-stack engineer. In THIS task, implement the ORIGINAL seven-module Complira PrivacyOps synthetic MVP as a working Next.js application. Do not stop at an implementation plan. Do not expand product scope.

READ ONLY THESE FIRST: AGENTS.md; index.html; docs/BUILD_SEQUENCE.md; fixtures/maplestack_normalized_demo.json; fixtures/test_scenarios_and_expected_results.json. For legal constraints consult the two files in product/. For older design comparison use reference/Complyra_PrivacyOps_Interactive_Demo.html only if necessary. Do not repeatedly reread huge files: write a short reference map once.

BEHAVIORAL ORACLE: index.html is ALREADY a working standalone seven-module prototype, with the source domain logic also in src/app.js. Preserve its visual language and implement its working behaviors in React, not as an iframe. Use TypeScript, Next.js App Router, React, simple CSS from HTML, Zod for server-side ready validation, and minimal dependencies. No backend or AI integration in this demo. Use a single synthetic client-side repository abstraction; keep all state transitions in pure domain functions, ready for a later Supabase adapter. Synthetic session-only persistence is sufficient.

SEVEN ROUTES: /demo/overview, /demo/processing, /demo/vendors, /demo/notices, /demo/changes, /demo/findings, /demo/reports. Redirect /demo to overview. Branding Complira; navy sidebar 244px (#071826), orange CTA (#E86F24), #F7F9FB canvas, compact white tables/cards, accessible modals, responsive mobile navbar. All seven views must be functional; no dead controls.

FEATURES: seed EXACT fictional MapleStack baseline 4 activities, 4 vendors, 2 notice versions, 4 findings, 3 tasks and 2 changes; reactive Overview and Reset. Activities and vendors: add/edit/search/archive/restore, many-to-many links, purposes, owners, retention, provisional role, contract evidence and renewals. Notices: drafts, version diffs, purpose mapping, submit/reviewer approve/reject with rationale; exactly one current recorded notice and no false public-publication claims. Changes: five types (New vendor, New data field, New purpose, Contract renewal, Updated notice), linked ACT/VEN, preview and submit checks. Findings: assignments, due dates, evidence metadata, Editor request closure; Reviewer (Demo) approve/reject/reopen with rationale, timestamped decision history. Reports: live CSV (escape formula injection), JSON (schema version + scope/limitations), print/PDF. Keep SYNTHETIC DATA ONLY on screen and exports.

IMPLEMENT EXACTLY TEN PURE REGISTER RULES: MAP_OWNERSHIP_MISSING, VENDOR_CONTRACT_EVIDENCE_MISSING, VENDOR_RENEWAL_DUE, NOTICE_PURPOSE_MISMATCH, NOTICE_RECIPIENT_MISMATCH, RETENTION_RULE_UNDEFINED, VENDOR_ROLE_UNDETERMINED, EVIDENCE_NOT_VERIFIED, REMEDIATION_OVERDUE, REVIEW_OVERDUE. Each output has subject IDs, source metadata/absence, rule ID, suggested severity/action, no fabricated document quotes. Use stable fingerprints/versioning so repeated evaluation makes no duplicate actionable findings or tasks. Test ACT-003 + VEN-003 = four review flags (purpose, vendor contract evidence, retention, role); repeat = zero new duplicates.

SECURITY / LEGAL: no real uploads, real data, AI calls, Supabase, payment, GDPR-style universal RoPA claim, automatic breach conclusions, certification or legal opinion. Demo persona dropdown is a SIMULATION, not real auth. Do not activate /app or describe this demo as production-secure. Follow the DPDP legal caveats in product/ and document what has NOT been verified.

EXECUTION — finish in ONE task with 3 internal checkpoints (not 11-16 prompts):
A. Scaffold Next.js/TS, faithfully translate HTML UI, typed fixture/store and seven routes; run build.
B. Implement all domain features/rules, guarded review transitions and exports; write focused unit tests.
C. Run real Playwright E2E checks at desktop/mobile, repair accessibility/UI parity, execute: npm run typecheck; npm run lint; npm test; npm run test:e2e; npm run build. Add missing test scripts and do not claim results for unexecuted commands. Use the fixtures as tests, including editor-denied approval, current notice uniqueness, CSV injection, and reset. Review console errors. Keep docs/BUILD_LOG.md SHORT.

DELIVER: working Next.js code, exact seven screens, actual QA results, preview/run instructions, limitations, and commit/PR-ready changes. Do not keep generating planning prose; implement.
```
