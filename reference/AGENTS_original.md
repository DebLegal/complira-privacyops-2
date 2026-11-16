# Complira PrivacyOps — Codex repo instructions

## Mission
Rebuild `reference/Complyra_PrivacyOps_Interactive_Demo.html` as a maintainable, production-structured privacy operations application, matching its seven-screen visual/interaction design. Use **Complira** as the new wordmark, but do not change the reference files. The source user documents are in `product/` and govern scope and legal/operating limits.

## Nonnegotiable boundaries
- Maintain a WORKING synthetic `/demo` with fictional MapleStack SaaS data, no secrets, no real uploads, no external AI, no login prerequisite. The synthetic workflow must work end to end.
- Stage the secure live app separately under `/app`; it is disabled until auth, verified tenant RLS, private storage controls, security review, and explicit release authorization.
- No consent manager registration/SDK, no universal compliance score, no automatic legal compliance verdict, no fabricated citations or source quotes, no AI lawyer or compliance certificate.
- Every finding is evidence-linked or marked `Not established from supplied records`; severity is suggested until authorized reviewer confirmation.
- No bypass-RLS service-role key in browser or ordinary user-data pathways. Never commit credentials or use personal data in fixtures.
- Users can create/modify records only according to role authorization, enforced SERVER-SIDE and by DB RLS in live mode. Client-only UI disabling is insufficient.
- No silently inert CTA, no fake audit trail, no simulated approval presented as real authorization.

## Engineering
- Inspect the repo before edits. Favor existing correct code over rewrites.
- Next.js App Router + TypeScript + React; current supported versions from official docs. Tailwind if existing, otherwise CSS modules/global design tokens matching original CSS. Zod for validated mutations. No need for vector DB, n8n, Python API or LLM for v0.
- Build reusable UI, typed domain entities, deterministic rule evaluation, repository ports, and explicit `demo` vs `live` persistence adapters.
- Change-management operations must be idempotent; do not generate the same rule finding for the same subject/evidence version twice.
- Render HTML/Markdown user data safely; never interpolate untrusted strings into raw HTML. CSV exports must be spreadsheet-formula safe.
- Do not hardcode the demo date in production logic. Preserve static demo's synthetic example dates only as seed data.
- Build a versioned legal-reference registry with provenance, effective date and professional verification status.

## Definition of done, every phase
1. Explain changes and affected files.
2. Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e` if scripts exist. Record exact outcomes; never say a command passed if not run.
3. Include test evidence, manual reproduction, known limitations and any blocked steps.
4. Do not move to next phase unless the phase acceptance criteria pass.
5. Keep a phase log in `docs/BUILD_LOG.md` and update it honestly.

Read `docs/MASTER_PROMPT_FOR_CODEX.md`, `docs/PHASE_BY_PHASE_CODEX_PROMPTS.md`, `docs/UI_PARITY_AND_FUNCTIONAL_CONTRACT.md`, `docs/DATA_MODEL_AND_SECURITY.md`, `docs/ACCEPTANCE_TESTS.md`, `docs/DATA_FIXTURE_GUIDE.md`, and `fixtures/test_scenarios_and_expected_results.json` before implementation. The raw data in `fixtures/maplestack_reference_raw.json` is derived exactly from the reference HTML.
