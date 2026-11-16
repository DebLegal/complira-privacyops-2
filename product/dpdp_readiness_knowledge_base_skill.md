---
name: dpdp-readiness-knowledge-base
version: 1.0.0
description: Verified legal, market and operating knowledge base for a one-person DPDP Notice & Vendor Review and Readiness Sprint service in India. Load before any client work.
last_reviewed: 2026-11-14
status_legend: "[V] checked against Gazette text of DPDP Rules 2025 | [A] from DPDP Act 2023, re-check bare Act before client use | [M] market assumption, test, do not state as fact"
---

# 1. Purpose and limits
- Supports document-based DPDP readiness review. It is NOT an audit, certification, security assessment or legal opinion.
- Operator is a law student. Never claim to be an advocate, DPO, CERT-In empanelled auditor or Data Board-recognised. Have an enrolled advocate or practising CS countersign anything styled as a legal opinion. [Confirm Bar Council / ICSI position before launch.]
- Never promise "compliance", "no penalty" or "audit-ready". Say "documented gaps against the Act and Rules based on the files provided".

# 2. Timeline [V]
- Rules notified in Gazette on 13 Nov 2025 (G.S.R. 846(E)); PIB reports 14 Nov 2025. Note: an earlier internal draft used "G.S.R. 843(E)" - WRONG, use 846(E).
- Rules 1, 2, 17-21: in force on publication.
- Rule 4 (Consent Managers): one year after publication (~13 Nov 2026).
- Rules 3, 5-16, 22, 23: eighteen months after publication (~13 May 2027). This is the sales deadline.
- Until then, Board inquiry and penalties for the substantive duties are not yet operative. Sell readiness, not fear of present fines.

# 3. Rule-by-rule rubric [V unless marked]
| Topic | Provision | What a document review checks | Typical evidence |
|---|---|---|---|
| Notice | Rule 3 | Stands alone; plain language; itemised personal data; specified purpose AND specific goods/services enabled; link to withdraw consent with comparable ease; how to exercise rights; how to complain to Board | Privacy policy, signup screens, consent copy |
| Languages | Act s.5(3) [A] | Option to read notice in English or any Eighth Schedule language. Rule 3 itself does not say 22 languages | Language toggle |
| Legacy users | Act s.5(2) [A] | Notice to those who consented before commencement, as soon as reasonably practicable | Re-notice plan |
| Consent | Act s.6 [A] | Free, specific, informed, unconditional, unambiguous, limited to the purpose; withdrawal as easy as giving | Checkbox design, withdrawal path |
| Consent Manager | Rule 4 | Only if client integrates one. Registration needs Indian company, net worth >= Rs 2 crore etc. Not a first-product area | n/a |
| Security | Rule 6(1)(a)-(g) | Encryption/masking/tokens; access control; logs and monitoring; backups/continuity; logs kept 1 year; processor contract has security provisions; technical and organisational measures | Vendor contracts, policy statements. Controls themselves need a technical reviewer |
| Breach - principals | Rule 7(1) | Without delay, each affected person, via user account/registered contact: nature, extent, timing; likely consequences; mitigation; safety steps; contact person | Incident SOP, templates |
| Breach - Board | Rule 7(2) | Without delay: description, nature, extent, timing, location, likely impact. Within 72 hours (or longer if Board allows on written request): updated detail, facts and reasons, mitigation, findings on who caused it, remedial steps, report on principal notifications | Incident SOP, past incident files |
| CERT-In | 2022 Directions [M-verify] | 6-hour reporting for listed incident types; parallel to DPDP, not replaced by it | SOP cross-reference |
| Erasure | Rule 8(1)-(2) | Only for classes in Third Schedule (large e-commerce, online gaming, social media): erase after inactivity period; 48-hour prior warning. Verify thresholds in the Schedule text before telling a client it applies | Retention schedule |
| Log retention | Rule 8(3) | Retain personal data, traffic data and processing logs at least 1 year for Seventh Schedule purposes, then erase unless law requires longer; must also hold at processors (Gazette illustration: cloud provider) | Retention schedule, hosting contract |
| Contact | Rule 9 | Publish business contact of DPO (if applicable) or person who can answer; repeat in every rights response | Footer, policy |
| Children | Act s.9 [A]; Rules 10-12 | Child = under 18. Verifiable parental consent; parent must be an identifiable adult via existing reliable details or details/virtual token from authorised entity (incl. Digital Locker). Lawful guardian for persons with disability (Rule 11). No tracking, behavioural monitoring or targeted ads to children, subject to Fourth Schedule exemptions (Rule 12) | Signup flow, analytics tags |
| Rights | Act ss.11-14 [A]; Rule 14 | Publish how to make requests and any identifier needed; grievance response period published, not exceeding 90 days; nomination right | Rights page, grievance log |
| SDF | Act s.10 [A]; Rule 13 | Only if notified. India-based DPO, independent data auditor, annual DPIA + audit report to Board, algorithmic due diligence, possible localisation. Do NOT tell a client they are an SDF; say "possible, depends on Government notification" | Volume/sensitivity data |
| Cross-border | Act s.16 [A]; Rule 15 | Transfers allowed unless restricted by Government; must meet requirements Government specifies. Do not assert a "blacklist" exists | Hosting region clauses |
| Processor | Act s.8(1)-(2) [A] | Fiduciary stays responsible regardless of any agreement or processor failure; processors only under valid contract | Every vendor contract |
| Government info calls | Rule 23 | Central Government may call for information under Seventh Schedule. This is not the Board; do not cite Rule 23 for "Board inquiry cooperation" | n/a |

# 4. Penalty bands [A] - quote the Act, never compute a client-specific fine
- Failure of reasonable security safeguards: up to Rs 250 crore.
- Failure to notify Board/principals of breach: up to Rs 200 crore.
- Children's obligations: up to Rs 200 crore.
- SDF additional obligations: up to Rs 150 crore.
- Residual breaches: up to Rs 50 crore.
- Penalties are maxima, set after Board inquiry. Use phrasing: "statutory ceiling", never "you will be fined".

# 5. Cross-document contradiction checks (the differentiator)
1. Notice vs inventory: data or retention in the inventory missing from the notice.
2. Notice vs vendor contracts: "we never share" vs vendor rights to use data for analytics or improvement.
3. Inventory vs incident file: data labelled encrypted/restricted vs incident showing exposure.
4. Rights log vs vendor contracts: erasure or withdrawal requests with no processor deletion duty or timeline.
5. Incident SOP vs hosting contract: vendor breach notice window longer than the client's own Rule 7 timeline.
6. Grievance log vs published response period: requests older than the published period, or over 90 days.
Each finding must hold: quote A (doc, clause/row), quote B or "absence", provision, severity, owner, action. If no quote exists, write "not established from documents provided".

# 6. Vendor clause checklist (12)
Role limited to documented instructions; Rule 6 safeguards named not "industry standard"; breach notice to client in hours not days (state a number that lets client meet Rule 7); sub-processor consent and flow-down; erasure/withdrawal propagation SLA; 1-year log retention carve-out; client may disclose processor identity to principals; India-hosting or s.16-compliant transfers; no tracking of under-18 data; return and certified deletion on exit; cooperation with client's regulatory enquiries; liability cap carve-out for statutory penalties and breach costs. Proposed numbers (12h, 72h, 15 days) are NEGOTIATING POSITIONS, not legal requirements. Label them so.

# 7. Market intelligence
- Platforms: Privy by IDfy (10-module enterprise platform, custom pricing, large BFSI customers), Redacto (discovery + privacy ops, enterprise sales), Jupitice Shivault, Consentin, WSO2. Enterprise software, not your lane. [M]
- Justis checks: notice and consent, children's data, security and breaches, vendor contracts, retention and erasure, individuals' rights, sample documents. It is an AI review tool; you add human sign-off and fixes.
- NYAI gives away a 45-question assessment: do not compete on free checklists.
- EY survey: ~48% of organisations have begun gap assessments; ~70% find the Act hard to interpret; budget limits ~45%. [web EY, Oct 2026]
- Consultant price signals: Rs 1.5-2 lakh small company; Rs 2-4 lakh MSME; some start at Rs 3 lakh. [M]
- Unverified numbers in earlier drafts - DO NOT use in sales: "90% non-compliant", "35-45% visitor conversion", "14-22% diagnostic-to-paid", "90% gross margin", "ComplyDP Rs 4L / Rs 40k per DPA". Treat as hypotheses to measure.

# 8. Benchmark pack (synthetic, label it so)
Nilgiri Learn privacy policy and notices; Nilgiri Edulabs inventory (Sept 2026); incident IR-2026-07 (exposed bucket, student voice recordings, NSAT docs); data request and grievance log Jan-Aug 2026; Clevercast messaging agreement (executed); Orbitly SaaS agreement (vendor draft); Stratacore hosting agreement (executed). Use only as demo. Never show a real client's data as a sample.

# 9. Professional-risk rules
- Engagement letter: scope, exclusions, "not a legal opinion/audit/certification", reliance only on files provided, client confidentiality, fee, 10-day clock, liability cap, governing law.
- Do not upload client personal data to AI tools. Ask clients to redact principals' names/IDs from logs. Use a paid API tier with no-training terms; record that in the engagement letter.
- Keep client folders separate, no public links, delete on agreed date.
- Escalate to a qualified lawyer and a security specialist: live breach, regulator notice, SDF question, financial-sector overlay (RBI/SEBI/IRDAI), health data.
