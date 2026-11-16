---
name: dpdp-notice-vendor-review-and-readiness-sprint
version: 1.0.0
description: Step-by-step operating workflow for a solo operator to sell and deliver the DPDP Notice & Vendor Review (Tier 1) and Readiness Sprint (Tier 2). Use with dpdp-readiness-knowledge-base.
triggers: ["DPDP review","notice review","vendor DPA review","readiness sprint","client intake","DPDP proposal"]
requires: ["dpdp-readiness-knowledge-base"]
---

# 0. Operating rules
1. Manual first. No portal, n8n, Supabase or custom app until 5 paid deliveries show the same steps repeating.
2. AI drafts, you decide. Every client-facing sentence has a quote, a provision and your approval.
3. Fixed scope, fixed clock. If files are missing, the clock does not start.
4. No scope discounts. Discount only by a small early-client price, never by dropping deliverables.

# 1. Offer ladder (prices are TESTS, not market facts)
| Tier | Name | Fee | Clock | Inputs | Outputs |
|---|---|---|---|---|---|
| 1 | Notice & Vendor Review | Rs 35,000, then 45-60k after 3 paid | 5 working days | Privacy policy, live consent copy, up to 3 vendor contracts, half-page company description | Gap table (quote, provision, severity), notice markup, comments on 2 weakest vendor clauses, "not reviewed" list |
| 2 | Readiness Sprint | Rs 75k-1.25 lakh, Tier 1 fee credited | 10 working days | Tier 1 inputs + inventory/interview, rights/grievance log, incident SOP/log, retention practice | Findings register, cross-document contradictions, 30/60/90 plan, rights SOP, breach first-response checklist, vendor markups |
| 3 | 90-day implementation | Rs 40-70k/month | 3 months | Sprint plan | Vendor follow-ups, RoPA clean-up, grievance log set-up, tabletop, staff briefing |
| 4 | Quarterly refresh | Rs 20-40k/quarter | 1 week | Updated docs | Re-check, updated risk log, one-page board note |
Payment: 50% before start, 50% before the walkthrough call. Do not release the final report before payment.

# 2. Setup checklist (week 0)
- [ ] Domain email; one-page site (who, May 2027 date, deliverables, price band, booking link)
- [ ] Cal.com or Google Calendar, 25-min discovery slot
- [ ] Razorpay payment link
- [ ] Docs templates: proposal, engagement letter, upload checklist, findings table, report, walkthrough agenda
- [ ] Drive: /Clients/<name>/{01_Inbox,02_Working,03_Deliverables}; no public links
- [ ] Notion or Sheet tracker: prospect, trigger, stage, fee, files received, due date, paid status
- [ ] Claude Project with the knowledge base file; paid API only after cost per review is measured
- [ ] Redacted synthetic sample report (6 pages) from the Nilgiri pack
- [ ] Named advocate/CS reviewer for opinion-grade or escalated matters

# 3. Sales workflow
1. Target: Indian B2B SaaS, edtech, health-tech, D2C, agencies with a published policy and a trigger (customer questionnaire, contract signing, investor diligence, May 2027 date).
2. 15 targeted messages/week. First line names one concrete observation from their public policy; no fake urgency.
3. Discovery call (25 min): data held and whose; who has asked about privacy; vendors touching data; what they need in hand and by when. Qualify out: active breach, regulated bank/insurer, no policy at all (offer drafting instead), no decision-maker.
4. Show one sample page, state fee and clock, send proposal within 2 hours.
5. Close: engagement letter signed + 50% paid.
6. Weekly targets (assumptions): 15 conversations, 4 calls, 2 proposals. If proposals do not close, change proof, price or buyer. Do not build software.

# 4. Delivery workflow - Tier 1 (5 days)
- Day 0: sign, pay, send upload checklist. Start clock when all inputs arrive.
- Day 1: Extract. For each document record clause/row references. AI may extract; you check against source text. Strip personal data of principals before any AI use.
- Day 2: Run knowledge-base rubric (notice, consent, children, rights, vendor clauses). Record each gap as: ID | doc+clause | quote | provision | severity | recommended fix | owner.
- Day 3: Severity pass. HIGH: no standalone notice, no withdrawal path, no processor instructions/security terms, child data with no parental-consent path, no breach owner. MEDIUM: weak retention/grievance wording. LOW: drafting.
- Day 4: Draft notice markup and 2 vendor-clause comments. Mark negotiating positions as such. Red-team: remove anything without a quote or provision.
- Day 5: Pay balance, 45-min walkthrough, deliver PDF + DOCX markups. Close with: "Want the missing documents drafted, or will your team own it?"

# 5. Delivery workflow - Tier 2 (10 days)
Adds: Day 1-2 inventory interview (data categories, purposes, systems, vendors, retention); Day 3-4 cross-document checks 1-6; Day 5 midpoint note to client (top 3 gaps, missing files); Day 6-8 findings register, 30/60/90 plan, rights SOP, breach checklist; Day 9 red-team; Day 10 payment and walkthrough, then retainer ask.

# 6. Report template (fixed order)
1. Scope and documents reviewed (list with dates/versions)
2. What was not reviewed (live systems, security controls, children's operations unless provided)
3. Summary: counts by severity, top 5 gaps
4. Findings table
5. Cross-document contradictions (Tier 2)
6. Statutory ceilings (Act bands, with "maximum, subject to Board inquiry")
7. 30/60/90 plan with owner and date
8. Annexes: notice markup, vendor comments, SOPs
9. Limitations and disclaimer

# 7. Quality gate (must pass before sending)
- [ ] Every finding has a quote or "not established from documents provided"
- [ ] Rule/section cites match the knowledge base [V]/[A] tags; [A] items re-checked on bare Act
- [ ] No claim of compliance, certification, audit or SDF status
- [ ] Negotiating positions labelled as such
- [ ] Penalty text uses "up to" and Act bands only
- [ ] Client personal data removed from AI inputs and working copies
- [ ] Reviewer countersign if opinion-grade

# 8. Automation roadmap (only after evidence)
| Trigger | Add | Tool |
|---|---|---|
| Same intake steps 10+ times | Form creates Drive folder + tracker row | n8n |
| Late payments or missing files repeat | Reminder workflow | n8n |
| Same fields in 5+ reviews | Internal findings form with structured output | Cursor + Sheet/Supabase |
| 10+ paid sprints, same workflow requested by clients | Client evidence room | Cursor/Supabase (RLS), human review gate retained |
Never automate: severity decisions, client-facing legal wording, final sign-off.

# 9. Metrics (track from sale 1)
Hours per review; AI cost per review; findings per review; repeat findings (clause library candidates); proposal-to-close rate; days to collect files; retainer conversion; client-reported use (customer questionnaire answered, deal unblocked). These become the real ROI evidence.

# 10. Stop/escalate rules
Active breach, regulator notice, litigation, financial/health regulated entity, request for "compliance certificate", request to sign as DPO/auditor: stop, escalate to qualified advocate/security specialist, document the limit of your role.
