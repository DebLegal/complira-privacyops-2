# Build log
Reference map: `index.html` and `src/app.js` define seven-screen behavior and visual tokens; normalized fixture defines exact baseline; scenario fixture defines analytics, review, export and reset expectations. Product knowledge base/workflow define metadata-only review and legal limits. Original files are preserved.

A: Next.js App Router, React, TypeScript and fixture-backed session repository.
B: Pure domain transitions, ten register rules, review guards and exports.
C: Validation results recorded after execution below.

Validation (16 November 2026): `npm ci` passed; `npm run typecheck` passed; `npm run lint` passed with zero warnings; `npm test` passed 13/13; `npm run test:e2e` passed 8/8 (4 workflows each on desktop/mobile Chromium); `npm run build` passed and generated all seven routes. Browser error checks passed and both viewport screenshots were inspected. Initial E2E select-label timeout was fixed with explicit accessible names; final runs have no failures or skips. Print control invocation is tested; interactive OS print-dialog completion is not automated. Live tenant scenario SC-10 is outside this synthetic-only application and was not run. See RUN_NEXTJS.md for run instructions and limitations.
Development startup also verified in Chromium. `next.config.ts` explicitly permits the local development origin and disables Next.js automatic agent-file generation, preserving the original AGENTS.md. Production build/browser tests were rerun after this configuration change.
