# Complira PrivacyOps — Original seven-screen MVP

Read `docs/ONE_MASTER_PROMPT.md` before editing. This repository deliberately implements the **original seven modules only**: Overview, Processing Register, Vendors & DPAs, Notice Versions, Change Control, Findings & Actions, Reports. Do not add a separate risk-assessment or DPIA screen, chatbot, consent SDK, or AI dependency. `index.html` is a self-contained **working synthetic UI** and the behavioral reference. `reference/Complyra_PrivacyOps_Interactive_Demo.html` is the older immutable reference.

Preserve design tokens: navy `#071826`, orange `#E86F24`, canvas `#F7F9FB`, 244px sidebar. New application branding is **Complira PrivacyOps**.

Do not upload or store real customer documents or personal data. The interactive HTML uses sessionStorage for synthetic records only; persona switching is explicitly not authentication. No AI key or Supabase is needed for synthetic MVP. Never claim legal compliance or confirmed DPDP breaches; all findings are metadata suggestions requiring human review.

For Codex transformation: implement working Next.js App Router + TypeScript with typed domain operations and tests; preserve the existing source files; do not replace completed functionality with inert mockups. Work in a single task with a compact log. Verify actual test outcomes.
