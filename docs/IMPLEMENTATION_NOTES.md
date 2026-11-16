# PrivacyOps 3.0 implementation

Baseline: original HTML/reference/fixtures preserved; previous working Next.js app checkpoint `bbb48c0` on branch `feat/complira-privacyops-3`. Existing 13 unit tests passed before edits.

Reference map: root index.html = available visual/behavioral reference; lib/domain.ts = shared pure rules/transitions; lib/repository.ts = synthetic session adapter; app/workspace.tsx = existing seven-module React shell; e2e/workflows.spec.ts = retained workflow suite. Requested redesigned HTML, UX_AND_FEATURE_CONTRACT.md, 001_schema_rls.sql and RELEASE_TESTS.md were not supplied anywhere in workspace. New contracts will document this prompt, not claim unseen design fidelity.

A: audit complete. No Supabase URL/key or database connection is injected. Never seed demo into live mode. No production DB is accessed. Test PostgreSQL will use a disposable local container if supported.
B: wizard, global record search, source breadcrumbs/detail, due work, guards, report scope/version metadata and favicon/scroll warning fixes.
C: separate fail-closed authenticated routes; Supabase server auth; PostgreSQL repository with transactions, memberships/RLS, tenant composite links, reviewer/no-self approval and append-only history. Real file uploads remain unavailable (metadata-only beta).
D: record actual test outcomes and remaining release blockers in RELEASE_REPORT.md. Do not deploy automatically.

Implementation complete in place. Added Supabase SSR/JS and pg with lockfile; live auth/cookies remain server-side. SQL migration lives under db/migrations and refuses existing Complira tables. Typed server repository uses repeatable-read transactions, verified actor claims and RLS; customer reports append an export event. Ten tenant tables force RLS. No real files are accepted.

Reproducible fixes during QA: old focus test now targets dialog[open] because search introduces a second dialog; PostgreSQL readiness checks TCP to avoid its temporary initialization socket; mutation persistence skips unchanged records and uses UPDATE for existing records, preventing insert triggers from treating unchanged closed findings as new approvals. Concurrent writes now produce one winner and one 409 conflict. Hosted identity/REST/storage tests remain blocked pending project settings.

Final validation: typecheck/lint/build passed; 20 unit/security tests, 18 real PostgreSQL integration checks and 14 desktop/mobile browser tests passed. Customer release remains BLOCKED pending real Supabase project and target verification. Full results and screenshot links: RELEASE_REPORT.md. No deployment was made.
