import { z } from "zod";
import fixture from "../fixtures/maplestack_normalized_demo.json";
export type Persona = "editor" | "reviewer";
const dateOrEmpty = z.union([z.iso.date(), z.literal("")]);
const base = {
  id: z.string().min(1).max(120),
  organization_id: z.string().optional(),
  version: z.number().int().positive().default(1),
  archived: z.boolean().optional(),
};
export const activitySchema = z
  .object({
    ...base,
    name: z.string().trim().min(1).max(200),
    purpose: z.string().trim().min(1).max(4000),
    data_categories: z.array(z.string().max(200)).max(50),
    source_system: z.string().max(200),
    vendor_ids: z.array(z.string()),
    owner_team: z.string().max(200),
    retention_description: z.string().max(4000),
    retention_verified: z.boolean().default(false),
    retention_evidence_reference: z.string().max(500).optional(),
    review_status: z.string().default("requires_document_review"),
  })
  .passthrough();
export const vendorSchema = z
  .object({
    ...base,
    name: z.string().trim().min(1).max(200),
    owner_team: z.string().max(200),
    activity_ids: z.array(z.string()),
    provisional_role: z.string(),
    contract_evidence_status: z.enum([
      "not_established_from_register",
      "provided_pending_review",
      "verified_synthetic_metadata",
    ]),
    contract_evidence_ids: z.array(z.string().max(500)).max(50),
    renewal_date: dateOrEmpty.nullable(),
    next_review_date: dateOrEmpty.nullable(),
    role_verified: z.boolean().default(false),
  })
  .passthrough();
export const noticeSchema = z
  .object({
    ...base,
    notice_id: z.string().default("NOTICE-website"),
    title: z.string().trim().min(1).max(500),
    version_label: z.string().trim().min(1).max(100),
    recorded_date: z.iso.date(),
    mapped_activity_ids: z.array(z.string()),
    recipient_vendor_ids: z.array(z.string()).optional(),
    purpose_summary: z.string(),
    status: z.enum([
      "draft",
      "pending_review",
      "rejected",
      "archived",
      "current_needs_review",
      "current_recorded",
    ]),
    actual_published_notice_verified: z.boolean().default(false),
  })
  .passthrough();
export const changeSchema = z
  .object({
    ...base,
    title: z.string().trim().min(1).max(500),
    owner_team: z.string().trim().min(1).max(200),
    change_type: z.enum([
      "New vendor",
      "New data field",
      "New purpose",
      "Contract renewal",
      "Updated notice",
    ]),
    activity_id: z.string().nullable(),
    vendor_id: z.string().nullable(),
    recorded_date: z.iso.date(),
    state: z.string(),
    notes: z.string().max(4000).optional(),
  })
  .passthrough();
export const findingSchema = z
  .object({
    ...base,
    title: z.string(),
    area: z.string(),
    suggested_severity: z.string(),
    state: z.string(),
    owner_team: z.string().max(200),
    due_date: dateOrEmpty,
    subject_id: z.string(),
    source_a_metadata: z.string(),
    source_b_metadata_or_absence: z.string(),
    suggested_action: z.string(),
    provision_text_unverified: z.string(),
    is_verified_legal_finding: z.literal(false),
    change_id: z.string().optional(),
    rule_id: z.string().optional(),
    fingerprint: z.string().optional(),
  })
  .passthrough();
export const taskSchema = z
  .object({
    ...base,
    finding_id: z.string(),
    title: z.string().trim().min(1).max(500),
    owner_team: z.string().trim().min(1).max(200),
    due_date: dateOrEmpty,
    state: z.enum([
      "open",
      "in_progress",
      "blocked",
      "pending_closure",
      "closed",
    ]),
    evidence_record_ids: z.array(z.string()),
    submitted_for_approval: z.boolean(),
  })
  .passthrough();
const decisionSchema = z.object({
  id: z.string(),
  subject_id: z.string(),
  decision: z.string(),
  reason: z.string(),
  persona: z.enum(["editor", "reviewer"]),
  timestamp: z.string(),
  actor_id: z.string().optional(),
});
const evidenceSchema = z.object({
  id: z.string(),
  finding_id: z.string(),
  reference: z.string(),
  note: z.string(),
  persona: z.enum(["editor", "reviewer"]),
  timestamp: z.string(),
  source_verified: z.literal(false),
  actor_id: z.string().optional(),
});
export const workspaceSchema = z
  .object({
    processing_activities: z.array(activitySchema),
    vendors: z.array(vendorSchema),
    notice_versions: z.array(noticeSchema),
    change_requests: z.array(changeSchema),
    findings: z.array(findingSchema),
    remediation_actions: z.array(taskSchema),
    evidence_records: z.array(evidenceSchema),
    review_decisions: z.array(decisionSchema),
    audit_events: z.array(
      z.object({
        id: z.string(),
        action: z.string(),
        subject_id: z.string(),
        timestamp: z.string(),
        persona: z.enum(["editor", "reviewer", "owner", "admin", "viewer"]),
        actor_role: z.string().optional(),
        actor_id: z.string().optional(),
      }),
    ),
  })
  .passthrough();
export type State = z.infer<typeof workspaceSchema>;
export type Activity = z.infer<typeof activitySchema>;
export type Vendor = z.infer<typeof vendorSchema>;
export type Notice = z.infer<typeof noticeSchema>;
export type Change = z.infer<typeof changeSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type Task = z.infer<typeof taskSchema>;
export const seed = (): State =>
  workspaceSchema.parse(structuredClone(fixture));
export const nextId = (rows: { id: string }[], prefix: string) =>
  `${prefix}-${String(Math.max(0, ...rows.map((r) => Number(r.id.match(/(\d+)$/)?.[1]) || 0)) + 1).padStart(3, "0")}`;
export const currentNotice = (s: State) =>
  s.notice_versions.find((n) => n.status.startsWith("current"));
export const RULE_IDS = [
  "MAP_OWNERSHIP_MISSING",
  "VENDOR_CONTRACT_EVIDENCE_MISSING",
  "VENDOR_RENEWAL_DUE",
  "NOTICE_PURPOSE_MISMATCH",
  "NOTICE_RECIPIENT_MISMATCH",
  "RETENTION_RULE_UNDEFINED",
  "VENDOR_ROLE_UNDETERMINED",
  "EVIDENCE_NOT_VERIFIED",
  "REMEDIATION_OVERDUE",
  "REVIEW_OVERDUE",
] as const;
export type Rule = {
  rule_id: (typeof RULE_IDS)[number];
  subject_id: string;
  source_a_metadata: string;
  source_b_metadata_or_absence: string;
  suggested_action: string;
  suggested_severity: string;
  fingerprint: string;
  record_version: number;
  examined_field: string;
  provisional_owner: string;
};
export function evaluate(s: State, c: Change, date: string): Rule[] {
  const a = s.processing_activities.find((x) => x.id === c.activity_id),
    v = s.vendors.find((x) => x.id === c.vendor_id),
    n = currentNotice(s);
  const hits: Rule[] = [];
  const add = (
    rule_id: Rule["rule_id"],
    subject_id: string,
    source: string,
    action: string,
    severity = "medium",
  ) =>
    hits.push({
      rule_id,
      subject_id,
      record_version: subject_id === a?.id ? a.version : v?.version || 1,
      examined_field: {
        MAP_OWNERSHIP_MISSING: "owner_team",
        VENDOR_CONTRACT_EVIDENCE_MISSING: "contract_evidence_status",
        VENDOR_RENEWAL_DUE: "renewal_date",
        NOTICE_PURPOSE_MISMATCH: "mapped_activity_ids",
        NOTICE_RECIPIENT_MISMATCH: "recipient_vendor_ids",
        RETENTION_RULE_UNDEFINED: "retention_description",
        VENDOR_ROLE_UNDETERMINED: "provisional_role",
        EVIDENCE_NOT_VERIFIED: "contract_evidence_status",
        REMEDIATION_OVERDUE: "remediation_actions.due_date",
        REVIEW_OVERDUE: "next_review_date",
      }[rule_id],
      provisional_owner:
        (subject_id === a?.id ? a.owner_team : v?.owner_team) || c.owner_team,
      source_a_metadata: a
        ? `${a.id} v${a.version}: ${a.name}; ${a.purpose}`
        : v
          ? `${v.id} v${v.version}: ${v.name}`
          : "Activity not linked",
      source_b_metadata_or_absence: source,
      suggested_action: action,
      suggested_severity: severity,
      fingerprint: [
        rule_id,
        subject_id,
        a?.id,
        a?.version,
        v?.id,
        v?.version,
        n?.id,
        n?.version,
      ].join("|"),
    });
  if (a && !a.owner_team.trim())
    add(
      "MAP_OWNERSHIP_MISSING",
      a.id,
      "Owner absent from register",
      "Assign responsible owner",
    );
  if (v && v.contract_evidence_status === "not_established_from_register")
    add(
      "VENDOR_CONTRACT_EVIDENCE_MISSING",
      v.id,
      `${v.id}: evidence not established from register; does not prove no contract exists`,
      "Obtain and verify contract evidence",
      "high",
    );
  if (
    v?.renewal_date &&
    v.renewal_date >= date &&
    (Date.parse(v.renewal_date) - Date.parse(date)) / 86400000 <= 30
  )
    add(
      "VENDOR_RENEWAL_DUE",
      v.id,
      `${v.id}: renewal ${v.renewal_date}`,
      "Review renewal evidence",
    );
  if (a && (!n || !n.mapped_activity_ids.includes(a.id)))
    add(
      "NOTICE_PURPOSE_MISMATCH",
      a.id,
      `${n?.id || "No current notice"}: ${a.id} absent from purpose map`,
      "Verify actual notice and purpose mapping",
      "high",
    );
  if (
    a &&
    v &&
    n?.recipient_vendor_ids &&
    !n.recipient_vendor_ids.includes(v.id)
  )
    add(
      "NOTICE_RECIPIENT_MISMATCH",
      v.id,
      `${n.id}: ${v.id} absent from recipient map`,
      "Review recipient disclosure evidence",
    );
  if (
    a &&
    (!a.retention_description ||
      /not established|undefined|unknown/i.test(a.retention_description))
  )
    add(
      "RETENTION_RULE_UNDEFINED",
      a.id,
      `${a.id}: ${a.retention_description || "Retention absent"}`,
      "Validate retention period and erasure exceptions",
    );
  if (v && /undetermined|unknown/i.test(v.provisional_role))
    add(
      "VENDOR_ROLE_UNDETERMINED",
      v.id,
      `${v.id}: ${v.provisional_role}`,
      "Review roles and contractual allocation",
    );
  if (v?.contract_evidence_status === "provided_pending_review")
    add(
      "EVIDENCE_NOT_VERIFIED",
      v.id,
      `${v.id}: evidence pending review`,
      "Review evidence before relying on metadata",
    );
  const overdue = s.remediation_actions.filter(
    (t) =>
      t.due_date &&
      t.due_date < date &&
      t.state !== "closed" &&
      s.findings.some(
        (f) => f.id === t.finding_id && [a?.id, v?.id].includes(f.subject_id),
      ),
  );
  if (overdue.length)
    add(
      "REMEDIATION_OVERDUE",
      a?.id || v!.id,
      overdue.map((t) => `${t.id}: due ${t.due_date}`).join("; "),
      "Escalate overdue remediation",
    );
  if (v?.next_review_date && v.next_review_date < date)
    add(
      "REVIEW_OVERDUE",
      v.id,
      `${v.id}: review due ${v.next_review_date}`,
      "Schedule vendor review",
    );
  return hits;
}
export type Command =
  | { type: "activity"; record: Activity }
  | { type: "vendor"; record: Vendor }
  | { type: "notice"; record: Notice }
  | { type: "change"; record: Change }
  | { type: "task"; record: Task }
  | {
      type: "archive";
      collection: "processing_activities" | "vendors";
      id: string;
    }
  | { type: "assignment"; id: string; owner_team: string; due_date: string }
  | { type: "record"; id: string; evaluation_date?: string }
  | { type: "submit_notice"; id: string }
  | { type: "closure"; id: string; reference: string; note: string }
  | {
      type: "review";
      id: string;
      target: "notice" | "finding";
      decision: "approve" | "reject" | "reopen";
      reason: string;
    };
function requireThat(ok: unknown, message: string): asserts ok {
  if (!ok) throw Error(message);
}
export function transition(
  state: State,
  cmd: Command,
  persona: Persona,
  timestamp: string,
  actorId?: string,
  actorRole?: string,
): State {
  const s = structuredClone(state);
  const date = timestamp.slice(0, 10);
  const upsert = <T extends { id: string; version: number }>(
    rows: T[],
    record: T,
  ) => {
    const i = rows.findIndex((x) => x.id === record.id);
    if (i >= 0)
      requireThat(
        record.version === rows[i].version,
        "Version conflict: reload the current record",
      );
    const r = { ...record, version: i < 0 ? 1 : rows[i].version + 1 };
    if (i < 0) rows.push(r);
    else rows[i] = r;
  };
  if (cmd.type === "activity") {
    const r = activitySchema.parse(cmd.record);
    requireThat(
      r.vendor_ids.every((id) => s.vendors.some((v) => v.id === id)),
      "Unknown vendor",
    );
    upsert(s.processing_activities, r);
    s.vendors.forEach((v) => {
      const links = v.activity_ids.filter((id) => id !== r.id);
      if (r.vendor_ids.includes(v.id)) links.push(r.id);
      if (links.join() !== v.activity_ids.join()) {
        v.activity_ids = links;
        v.version++;
      }
    });
  }
  if (cmd.type === "vendor") {
    const r = vendorSchema.parse(cmd.record);
    requireThat(
      r.activity_ids.every((id) =>
        s.processing_activities.some((a) => a.id === id),
      ),
      "Unknown activity",
    );
    upsert(s.vendors, r);
    s.processing_activities.forEach((a) => {
      const links = a.vendor_ids.filter((id) => id !== r.id);
      if (r.activity_ids.includes(a.id)) links.push(r.id);
      if (links.join() !== a.vendor_ids.join()) {
        a.vendor_ids = links;
        a.version++;
      }
    });
  }
  if (cmd.type === "assignment") {
    const f = s.findings.find((x) => x.id === cmd.id);
    requireThat(f, "Finding missing");
    requireThat(cmd.owner_team.trim(), "Owner required");
    f.owner_team = cmd.owner_team.trim();
    f.due_date = cmd.due_date;
    f.version++;
  }
  if (cmd.type === "archive") {
    const r = s[cmd.collection].find((x) => x.id === cmd.id);
    requireThat(r, "Record missing");
    r.archived = !r.archived;
    r.version++;
  }
  if (cmd.type === "notice") {
    const old = s.notice_versions.find((n) => n.id === cmd.record.id);
    requireThat(
      !old || ["draft", "rejected"].includes(old.status),
      "Only editable drafts may change",
    );
    requireThat(cmd.record.status === "draft", "Save as draft");
    requireThat(
      cmd.record.mapped_activity_ids.every((id) =>
        s.processing_activities.some((a) => a.id === id),
      ),
      "Unknown activity",
    );
    upsert(
      s.notice_versions,
      noticeSchema.parse({
        ...cmd.record,
        created_by: old?.created_by || actorId,
      }),
    );
  }
  if (cmd.type === "change") {
    requireThat(
      !cmd.record.activity_id ||
        s.processing_activities.some((a) => a.id === cmd.record.activity_id),
      "Unknown activity",
    );
    requireThat(
      !cmd.record.vendor_id ||
        s.vendors.some((v) => v.id === cmd.record.vendor_id),
      "Unknown vendor",
    );
    const oldChange = s.change_requests.find((x) => x.id === cmd.record.id);
    upsert(
      s.change_requests,
      changeSchema.parse({
        ...cmd.record,
        created_by: oldChange?.created_by || actorId,
      }),
    );
  }
  if (cmd.type === "task") {
    requireThat(
      s.findings.some((f) => f.id === cmd.record.finding_id),
      "Finding missing",
    );
    const old = s.remediation_actions.find((t) => t.id === cmd.record.id);
    requireThat(
      !old || !["closed", "pending_closure"].includes(old.state),
      "Use finding review for this action",
    );
    requireThat(
      ["open", "in_progress", "blocked"].includes(cmd.record.state),
      "Review required",
    );
    upsert(s.remediation_actions, taskSchema.parse(cmd.record));
  }
  if (cmd.type === "record") {
    const c = s.change_requests.find((x) => x.id === cmd.id);
    requireThat(c, "Change missing");
    for (const r of evaluate(s, c, cmd.evaluation_date || date)) {
      if (s.findings.some((f) => f.fingerprint === r.fingerprint)) continue;
      const id = nextId(s.findings, "FND");
      s.findings.push({
        ...r,
        id,
        version: 1,
        title: r.rule_id.replaceAll("_", " "),
        area: "Change review",
        state: "suggested_pending_review",
        owner_team: c.owner_team,
        due_date: "",
        change_id: c.id,
        provision_text_unverified:
          "Relevant DPDP provisions require professional verification",
        is_verified_legal_finding: false,
      });
      s.remediation_actions.push({
        id: nextId(s.remediation_actions, "TASK"),
        version: 1,
        finding_id: id,
        title: r.suggested_action,
        owner_team: c.owner_team,
        due_date: "",
        state: "open",
        evidence_record_ids: [],
        submitted_for_approval: false,
      });
    }
    c.state = "review_requested";
    c.version++;
  }
  if (cmd.type === "submit_notice") {
    const n = s.notice_versions.find((x) => x.id === cmd.id);
    requireThat(
      n && ["draft", "rejected"].includes(n.status),
      "Draft required",
    );
    n.status = "pending_review";
    n.submitted_by = actorId;
    n.version++;
  }
  if (cmd.type === "closure") {
    requireThat(persona === "editor", "Editor persona required");
    const f = s.findings.find((x) => x.id === cmd.id);
    requireThat(
      f && !["closed", "pending_closure"].includes(f.state),
      "Open finding required",
    );
    requireThat(
      cmd.reference.trim().length >= 4 && cmd.note.trim().length >= 8,
      "Evidence reference and explanation required",
    );
    const id = nextId(s.evidence_records, "EVD");
    s.evidence_records.push({
      id,
      finding_id: f.id,
      reference: cmd.reference.trim(),
      note: cmd.note.trim(),
      persona,
      timestamp,
      source_verified: false,
      actor_id: actorId,
    });
    f.state = "pending_closure";
    f.closure_requested_by = actorId;
    f.version++;
    s.remediation_actions
      .filter((t) => t.finding_id === f.id)
      .forEach((t) => {
        t.state = "pending_closure";
        t.evidence_record_ids.push(id);
        t.submitted_for_approval = true;
        t.version++;
      });
  }
  if (cmd.type === "review") {
    requireThat(persona === "reviewer", "Reviewer persona required");
    requireThat(
      cmd.reason.trim().length >= 8,
      "Rationale must contain at least 8 characters",
    );
    if (cmd.target === "notice") {
      const n = s.notice_versions.find((x) => x.id === cmd.id);
      requireThat(
        n?.status === "pending_review" && cmd.decision !== "reopen",
        "Pending notice required",
      );
      requireThat(
        !actorId || n.submitted_by !== actorId,
        "Self-approval is prohibited",
      );
      if (cmd.decision === "approve") {
        s.notice_versions
          .filter((x) => x.status.startsWith("current"))
          .forEach((x) => {
            x.status = "archived";
            x.version++;
          });
        n.status = "current_recorded";
      } else n.status = "rejected";
      n.version++;
    } else {
      const f = s.findings.find((x) => x.id === cmd.id);
      requireThat(f, "Finding missing");
      requireThat(
        cmd.decision === "reopen"
          ? f.state === "closed"
          : f.state === "pending_closure" &&
              s.evidence_records.some((e) => e.finding_id === f.id),
        "Valid pending closure and evidence required",
      );
      requireThat(
        !actorId ||
          cmd.decision === "reopen" ||
          f.closure_requested_by !== actorId,
        "Self-approval is prohibited",
      );
      f.state = cmd.decision === "approve" ? "closed" : "open_action";
      f.version++;
      s.remediation_actions
        .filter((t) => t.finding_id === f.id)
        .forEach((t) => {
          t.state = cmd.decision === "approve" ? "closed" : "in_progress";
          t.version++;
          t.submitted_for_approval = false;
        });
    }
    s.review_decisions.push({
      id: nextId(s.review_decisions, "DEC"),
      subject_id: cmd.id,
      decision: cmd.decision,
      reason: cmd.reason.trim(),
      persona,
      timestamp,
      actor_id: actorId,
    });
  }
  s.audit_events.push({
    id: nextId(s.audit_events, "EVT"),
    action: cmd.type,
    subject_id: "id" in cmd ? cmd.id : cmd.record.id,
    persona,
    timestamp,
    actor_id: actorId,
    actor_role: actorRole,
  });
  return workspaceSchema.parse(s);
}
export function csvCell(value: unknown) {
  let s = String(value ?? "");
  if (/^[\s\x00-\x1f]*[=+\-@]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export const exportJson = (s: State, timestamp: string) => ({
  schemaVersion: "complira.export.v1",
  mode: "synthetic_only",
  assumptions: [
    "Register metadata is not reviewed document text",
    "Legal references are unverified and version-specific",
  ],
  outstanding_actions: s.remediation_actions.filter(
    (t) => t.state !== "closed",
  ),
  record_versions: Object.fromEntries(
    [
      s.processing_activities,
      s.vendors,
      s.notice_versions,
      s.change_requests,
      s.findings,
      s.remediation_actions,
    ]
      .flat()
      .map((r) => [r.id, r.version]),
  ),
  disclaimer:
    "SYNTHETIC DATA ONLY — not an audit, certification or legal opinion",
  exported_at: timestamp,
  scope: ["Fictional MapleStack register metadata only"],
  not_reviewed: [
    "Live systems",
    "Real documents",
    "Actual notices",
    "Security controls",
    "Legal sufficiency",
  ],
  workspace: s,
});
export function exportCsv(s: State) {
  return [
    ["SYNTHETIC DATA ONLY — not a legal opinion"],
    [
      "Scope: fictional register metadata. Not reviewed: real documents, live systems, actual notices, security controls.",
    ],
    [
      "Finding ID",
      "Title",
      "Source A",
      "Source B / absence",
      "Suggested severity",
      "State",
      "Owner",
      "Due date",
      "Record version",
      "Linked change",
      "Review decisions",
    ],
    ...s.findings.map((f) => [
      f.id,
      f.title,
      f.source_a_metadata,
      f.source_b_metadata_or_absence,
      f.suggested_severity,
      f.state,
      f.owner_team,
      f.due_date,
      f.version,
      f.change_id || "",
      s.review_decisions
        .filter((d) => d.subject_id === f.id)
        .map((d) => `${d.decision}: ${d.reason}`)
        .join("; "),
    ]),
  ]
    .map((r) => r.map(csvCell).join(","))
    .join("\r\n");
}

export const DEMO_CHECK_DATE = "2026-11-16";
export const emptyWorkspace = (): State =>
  workspaceSchema.parse({
    processing_activities: [],
    vendors: [],
    notice_versions: [],
    change_requests: [],
    findings: [],
    remediation_actions: [],
    evidence_records: [],
    review_decisions: [],
    audit_events: [],
  });
export const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("activity"), record: activitySchema.strip() }),
  z.object({ type: z.literal("vendor"), record: vendorSchema.strip() }),
  z.object({ type: z.literal("notice"), record: noticeSchema.strip() }),
  z.object({ type: z.literal("change"), record: changeSchema.strip() }),
  z.object({ type: z.literal("task"), record: taskSchema.strip() }),
  z.object({
    type: z.literal("archive"),
    collection: z.enum(["processing_activities", "vendors"]),
    id: z.string().min(1),
  }),
  z.object({
    type: z.literal("assignment"),
    id: z.string().min(1),
    owner_team: z.string().trim().min(1).max(200),
    due_date: dateOrEmpty,
  }),
  z.object({ type: z.literal("record"), id: z.string().min(1) }),
  z.object({ type: z.literal("submit_notice"), id: z.string().min(1) }),
  z.object({
    type: z.literal("closure"),
    id: z.string().min(1),
    reference: z.string().trim().min(4).max(500),
    note: z.string().trim().min(8).max(4000),
  }),
  z.object({
    type: z.literal("review"),
    id: z.string().min(1),
    target: z.enum(["notice", "finding"]),
    decision: z.enum(["approve", "reject", "reopen"]),
    reason: z.string().trim().min(8).max(4000),
  }),
]);
