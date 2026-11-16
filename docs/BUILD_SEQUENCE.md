# Complira PrivacyOps — The short build sequence (original plan only)

## What is already finished
`index.html` is a **self-contained, functioning HTML demonstration** with seven screens, synthetic MapleStack data, client-side state, deterministic checks, notice versions, reviewer simulations and exports. You can open the HTML in a browser to use it directly. It is not a production-secured SaaS. `src/app.js` contains its working behavior in a separate source file for easier reference. The fixture JSON is the unchanged original baseline.

## Codex Cloud: only ONE master prompt (and an optional continuation)
1. Extract this ZIP and upload the **contents**, not just the ZIP, to a private GitHub repository called `complira-privacyops`. Confirm `AGENTS.md`, `index.html`, `docs/`, `fixtures/`, `src/`, `product/` and `reference/` are at the repository root.
2. Open `https://chatgpt.com/codex`, connect/select the GitHub repository and Cloud environment, and work on a feature branch. No separate Gemini, Groq or OpenAI API key is needed for code generation or for the synthetic runtime.
3. Copy the **single master prompt** from `docs/ONE_MASTER_PROMPT.md` into Codex. It contains three **internal checkpoints** that Codex should work through without further prompts: (A) Next.js app/UI/state; (B) workflows/rules/exports; (C) tests/polish. Do not separately issue 11–16 phases.
4. Check the Codex preview and actual test results. If interrupted or incomplete, paste the **one optional** prompt from `docs/CONTINUE_AND_VERIFY.md`. Ask for the first specific failing test if problems remain.
5. Review and commit/PR the finished code. The HTML remains available as a functional no-build demonstration.

## Your exact walkthrough
- `/demo/overview` starts at 4 activities, 4 vendors, 4 open findings, 3 open actions.
- Create a `New vendor` change titled **Add analytics processor**, link `ACT-003` and `VEN-003`, owner Engineering.
- Get exactly four suggestions: `NOTICE_PURPOSE_MISMATCH`, `VENDOR_CONTRACT_EVIDENCE_MISSING`, `RETENTION_RULE_UNDEFINED`, `VENDOR_ROLE_UNDETERMINED`.
- Record the review request, check again; don't create duplicate tasks/findings.
- As simulated Editor, add evidence metadata and request closure for a new finding; switch to simulated Reviewer to approve/reject with a rationale.
- Draft NOTICE-v3, map ACT-003, submit, and approve as Reviewer. The prior current is archived in the synthetic register.
- Export current CSV/JSON, open Print/PDF, and reset original data.

## Production boundary
A working standalone HTML demonstration or Next.js client-side demo is **not** a production-secured multi-tenant app. A real client pilot requires separate work: authentication and independently enforced roles, organization isolation and tested RLS, secure private documents, input/security reviews, tamper-resistant auditing, backups, monitoring and legal sign-off. Do not claim production readiness until these gates pass. No AI key is necessary for the original MVP; a Supabase project/publishable key may later be used for persistence.
