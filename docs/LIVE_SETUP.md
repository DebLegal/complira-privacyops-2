# Customer workspace setup (release-gated)

The demo needs no environment variables or account. Customer routes are disabled unless COMPLIRA_APP_ENABLED=true and every required binding exists; no demo records are ever copied to live mode. Do not enable merely because a build passes.

## New project candidate

Use a separately supplied Supabase project and reviewed PostgreSQL connection. Configure verified-email Supabase Auth, Site URL, allowed confirmation/PKCE redirects to APP_ORIGIN/auth/callback, appropriate provider rate limits, SMTP/email delivery and MFA requirements before live review. No real customer documents during setup tests.

Inspect existing database schemas, RLS, grants and owners first. `db/migrations/001_private_beta.sql` is a new-install migration that refuses any existing Complira tables. It creates isolated `complira` tables, policies and trusted onboarding/invitation functions. Do not apply it to replace a production schema or to overwrite existing data. Existing installations require a target-specific incremental migration and backup/rollback plan.

The PostgreSQL server connection must be able to SET LOCAL ROLE complira_server. Give a dedicated server-only login only membership in complira_server and connection privileges; do not use a client-exposed service key. The role is NOLOGIN/NOBYPASSRLS and is never granted to authenticated/anon. Request transactions SET LOCAL the authenticated user's verified UUID claim and reset automatically on commit/rollback. Provider ownership/BYPASSRLS assumptions must be checked in the real target; local tests run migrations as disposable PostgreSQL superuser. Verify SSL certificates; never disable verification.

Required secure settings: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or existing ANON_KEY), DATABASE_URL, APP_ORIGIN (HTTPS in production), COMPLIRA_APP_ENABLED=false until approved gates pass. Server database credentials stay server-only. No SUPABASE_SERVICE_ROLE_KEY or AI key is needed. `.env.example` contains names only; put values in secure deployment settings, never chat or Git.

## Customer flow after verification

`/login`: real Supabase email/password signup/signin. Confirmation uses PKCE callback. `/app/setup`: create an empty organization or select an existing one. `/app/members?org=UUID`: owner/admin creates a single-use, email-bound 48-hour invite link to share privately. No invitations are emailed automatically. Invited users sign in/confirm their email and reopen the invitation link to accept it. No self-service role promotion; owner cannot grant owner through invites, and admins cannot grant admin. The independent reviewer must be a different account from the requester; selecting a demo persona has no effect here.

`/app/{overview,processing,vendors,notices,changes,findings,reports}?org=UUID`: same seven workflows backed by tenant-scoped PostgreSQL transactions. Owners/admins/editors manage register records; reviewer makes decisions; viewer is read-only. Domain and database checks refuse self-approval. All mutations require same-origin cookies, verified identity, membership, expected workspace version and idempotency UUID. A version conflict requires reloading current records. Reports read the persisted current tenant state; CSV escapes formula-like strings. Requests and history remain tenant-scoped.

Private evidence is metadata only: no bucket is created, and file endpoints refuse uploads. Target storage policies have not been inspected or proven safe. Keep files unavailable until the storage release gate passes.

Missing credentials, failed identity verification or unknown organizations must not return customer records. A configuration gate is shown instead. No live client access is deployed automatically. Release report distinguishes local checks from hosted verification blockers.
