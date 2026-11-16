# Complira PrivacyOps — Working Original Seven-Module MVP

**Open `index.html` to use the demo immediately.** All seven modules are functional with **fictional MapleStack** data. The demo needs **no AI API key, server, database or installation**. It uses only browser session state; reset restores the original sample. Avoid entering real names, contracts or customer data.

To turn it into the production-structured Next.js **synthetic MVP** using Codex, follow `docs/BUILD_SEQUENCE.md`, and paste the **one** prompt in `docs/ONE_MASTER_PROMPT.md`. If needed, use only the optional follow-up in `docs/CONTINUE_AND_VERIFY.md`.

This kit retains the original HTML reference and the exact original normalized fixtures, including the `ACT-003` + `VEN-003` test. No standalone assessment or DPIA module is added.

A genuinely production-secured SaaS that handles real customers requires separate auth, data isolation, storage and security verification, beyond this initial synthetic prototype.

## Files
- `index.html` — full single-file interactive demo; open in browser.
- `src/app.js` — same application behavior as readable source.
- `reference/` — original supplied HTML design.
- `fixtures/` — original synthetic test data and expected scenarios.
- `product/` — supplied DPDP knowledge base, readiness workflow and product blueprint.
- `docs/ONE_MASTER_PROMPT.md` — **only required Codex prompt**.
- `docs/CONTINUE_AND_VERIFY.md` — optional continuation prompt.
- `tests/browser_smoke.py` — optional Playwright smoke test for the standalone demo (requires Python Playwright and a Chromium installation).
