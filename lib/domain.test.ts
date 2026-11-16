import { test } from "node:test";
import assert from "node:assert/strict";
import scenarios from "../fixtures/test_scenarios_and_expected_results.json";
import {
  seed,
  transition,
  evaluate,
  currentNotice,
  RULE_IDS,
  csvCell,
  exportCsv,
  exportJson,
  nextId,
  workspaceSchema,
  type State,
  type Command,
} from "./domain";
import { sessionRepository } from "./repository";
const timestamp = "2026-11-16T12:30:00.000Z";
const apply = (s: State, c: Command, p: "editor" | "reviewer" = "editor") =>
  transition(s, c, p, timestamp);
test("exact fixture baseline and immutable transitions", () => {
  const s = seed();
  assert.deepEqual(
    [
      s.processing_activities.length,
      s.vendors.length,
      s.notice_versions.length,
      s.findings.length,
      s.remediation_actions.length,
      s.change_requests.length,
    ],
    [4, 4, 2, 4, 3, 2],
  );
  const before = JSON.stringify(s);
  const n = apply(s, { type: "record", id: "CHG-001" });
  assert.equal(JSON.stringify(s), before);
  assert.equal(n.findings.length, 8);
  assert.equal(n.remediation_actions.length, 7);
});
test("SC-01 four analytics suggestions include source metadata and stable versioned fingerprints", () => {
  const s = seed();
  const results = evaluate(s, s.change_requests[0], timestamp.slice(0, 10));
  assert.deepEqual(
    results.map((x) => x.rule_id).sort(),
    scenarios.scenarios[0].expected_rule_ids!.slice().sort(),
  );
  assert.ok(
    results.every(
      (x) =>
        x.source_a_metadata &&
        x.source_b_metadata_or_absence &&
        x.subject_id &&
        x.suggested_action &&
        x.suggested_severity,
    ),
  );
  assert.equal(new Set(results.map((x) => x.fingerprint)).size, 4);
  assert.deepEqual(results, evaluate(s, s.change_requests[0], "2026-11-16"));
});
test("SC-02 repeated checks and equivalent changes cannot duplicate actionable results; audit retained", () => {
  let s = apply(seed(), { type: "record", id: "CHG-001" });
  s = apply(s, { type: "record", id: "CHG-001" });
  assert.equal(s.findings.length, 8);
  assert.equal(s.remediation_actions.length, 7);
  s = apply(s, {
    type: "change",
    record: { ...s.change_requests[0], id: "CHG-003" },
  });
  s = apply(s, { type: "record", id: "CHG-003" });
  assert.equal(s.findings.length, 8);
  assert.equal(s.audit_events.filter((x) => x.action === "record").length, 3);
});
test("all exactly ten rules exercised with fixed evaluation clock", () => {
  const s = seed();
  const a = s.processing_activities[2],
    v = s.vendors[2];
  a.owner_team = "";
  v.renewal_date = "2026-11-20";
  v.next_review_date = "2026-11-01";
  currentNotice(s)!.recipient_vendor_ids = [];
  s.remediation_actions[2].due_date = "2026-11-01";
  const ids = evaluate(s, s.change_requests[0], "2026-11-16").map(
    (x) => x.rule_id,
  );
  v.contract_evidence_status = "provided_pending_review";
  const all = new Set([
    ...ids,
    ...evaluate(s, s.change_requests[0], "2026-11-16").map((x) => x.rule_id),
  ]);
  assert.deepEqual([...all].sort(), [...RULE_IDS].sort());
  assert.equal(RULE_IDS.length, 10);
});
test("renewal horizon excludes expired or distant renewals, review checks use supplied date", () => {
  const s = seed();
  s.vendors[2].renewal_date = "2026-11-15";
  assert.ok(
    !evaluate(s, s.change_requests[0], "2026-11-16").some(
      (x) => x.rule_id === "VENDOR_RENEWAL_DUE",
    ),
  );
  s.vendors[2].renewal_date = "2026-12-16";
  assert.ok(
    evaluate(s, s.change_requests[0], "2026-11-16").some(
      (x) => x.rule_id === "VENDOR_RENEWAL_DUE",
    ),
  );
});
test("SC-03/04/05 guarded closure, evidence, decisions, rejection and reopen", () => {
  const base = seed();
  assert.throws(
    () =>
      apply(base, {
        type: "review",
        target: "finding",
        id: "FND-003",
        decision: "approve",
        reason: "Reviewed synthetic metadata only",
      }),
    /Reviewer/,
  );
  assert.throws(
    () =>
      apply(
        base,
        {
          type: "review",
          target: "finding",
          id: "FND-003",
          decision: "approve",
          reason: "Reviewed synthetic metadata only",
        },
        "reviewer",
      ),
    /pending/,
  );
  assert.throws(
    () =>
      apply(base, {
        type: "closure",
        id: "FND-003",
        reference: "x",
        note: "short",
      }),
    /Evidence/,
  );
  let s = apply(base, {
    type: "closure",
    id: "FND-003",
    reference: "SYNTH-RETENTION-v1",
    note: "Synthetic retention schedule metadata added",
  });
  assert.equal(s.findings[2].state, "pending_closure");
  assert.equal(s.evidence_records.length, 1);
  assert.equal(s.remediation_actions[2].state, "pending_closure");
  assert.throws(
    () =>
      apply(s, {
        type: "review",
        target: "finding",
        id: "FND-003",
        decision: "approve",
        reason: "Reviewed synthetic metadata only",
      }),
    /Reviewer/,
  );
  s = apply(
    s,
    {
      type: "review",
      target: "finding",
      id: "FND-003",
      decision: "reject",
      reason: "More synthetic evidence needed",
    },
    "reviewer",
  );
  assert.equal(s.findings[2].state, "open_action");
  s = apply(s, {
    type: "closure",
    id: "FND-003",
    reference: "SYNTH-RETENTION-v2",
    note: "Updated synthetic retention schedule metadata",
  });
  s = apply(
    s,
    {
      type: "review",
      target: "finding",
      id: "FND-003",
      decision: "approve",
      reason: "Reviewed synthetic metadata only",
    },
    "reviewer",
  );
  assert.equal(s.findings[2].state, "closed");
  assert.equal(s.remediation_actions[2].state, "closed");
  s = apply(
    s,
    {
      type: "review",
      target: "finding",
      id: "FND-003",
      decision: "reopen",
      reason: "New synthetic metadata requires review",
    },
    "reviewer",
  );
  assert.equal(s.findings[2].state, "open_action");
  assert.equal(s.review_decisions.length, 3);
  assert.ok(
    s.review_decisions.every(
      (d) => d.persona === "reviewer" && d.timestamp === timestamp,
    ),
  );
  assert.equal(s.evidence_records.length, 2);
});
test("SC-06 current notice unchanged until guarded approval; uniqueness and diff", () => {
  let s = seed();
  const old = currentNotice(s)!;
  const draft = {
    ...old,
    id: "NOTICE-v3",
    version_label: "v3.0",
    status: "draft" as const,
    mapped_activity_ids: [...old.mapped_activity_ids, "ACT-003"],
  };
  s = apply(s, { type: "notice", record: draft });
  assert.equal(currentNotice(s)!.id, old.id);
  s = apply(s, { type: "submit_notice", id: draft.id });
  assert.throws(
    () =>
      apply(s, {
        type: "review",
        target: "notice",
        id: draft.id,
        decision: "approve",
        reason: "Reviewed synthetic purpose map",
      }),
    /Reviewer/,
  );
  s = apply(
    s,
    {
      type: "review",
      target: "notice",
      id: draft.id,
      decision: "approve",
      reason: "Reviewed synthetic purpose map",
    },
    "reviewer",
  );
  assert.equal(currentNotice(s)!.id, "NOTICE-v3");
  assert.equal(
    s.notice_versions.filter((n) => n.status.startsWith("current")).length,
    1,
  );
  assert.equal(
    s.notice_versions.find((n) => n.id === old.id)!.status,
    "archived",
  );
  assert.throws(
    () =>
      apply(s, {
        type: "notice",
        record: { ...currentNotice(s)!, status: "draft" },
      }),
    /drafts/,
  );
});
test("SC-07 activity editing preserves links, bidirectional vendor edits, archive and restore", () => {
  let s = seed();
  const a = {
    ...s.processing_activities[0],
    id: nextId(s.processing_activities, "ACT"),
    name: "Trial signup",
    vendor_ids: ["VEN-003"],
  };
  s = apply(s, { type: "activity", record: a });
  assert.ok(s.vendors[2].activity_ids.includes(a.id));
  s = apply(s, {
    type: "change",
    record: { ...s.change_requests[0], id: "CHG-003", activity_id: a.id },
  });
  s = apply(s, {
    type: "activity",
    record: { ...s.processing_activities[4], name: "Trial signup edited" },
  });
  assert.equal(s.change_requests[2].activity_id, a.id);
  s = apply(s, {
    type: "vendor",
    record: { ...s.vendors[2], activity_ids: [] },
  });
  assert.ok(!s.processing_activities[4].vendor_ids.includes("VEN-003"));
  s = apply(s, {
    type: "archive",
    collection: "processing_activities",
    id: a.id,
  });
  assert.equal(s.processing_activities[4].archived, true);
  s = apply(s, {
    type: "archive",
    collection: "processing_activities",
    id: a.id,
  });
  assert.equal(s.processing_activities[4].archived, false);
  assert.throws(
    () =>
      apply(s, { type: "activity", record: { ...a, vendor_ids: ["UNKNOWN"] } }),
    /Unknown/,
  );
});
test("SC-08 absence phrasing and SC-09 CSV formula injection including control and whitespace", () => {
  const s = seed();
  const r = evaluate(
    s,
    { ...s.change_requests[0], activity_id: "ACT-002", vendor_id: "VEN-002" },
    "2026-11-16",
  ).find((x) => x.rule_id === "VENDOR_CONTRACT_EVIDENCE_MISSING")!;
  assert.match(
    r.source_b_metadata_or_absence,
    /does not prove no contract exists/,
  );
  for (const input of scenarios.scenarios.find((x) => x.id === "SC-09")!.input
    .test_strings!) {
    assert.ok(csvCell(input).startsWith("\"'"), input);
  }
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvCell("safe"), '"safe"');
  assert.ok(csvCell("\u0000=1").startsWith("\"'"));
});
test("SC-11 repository reset exact counts, session persistence and invalid saved data rejection", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (k: string) => values.get(k) || null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  } as Storage;
  const repo = sessionRepository(storage);
  repo.save(apply(repo.load(), { type: "record", id: "CHG-001" }));
  assert.equal(repo.load().findings.length, 8);
  assert.deepEqual(repo.reset(), seed());
  assert.deepEqual(repo.load(), seed());
  values.forEach((_, k) => values.set(k, "{}"));
  assert.throws(() => repo.load());
  assert.throws(() => workspaceSchema.parse({}));
});
test("SC-12 live exports preserve decisions, scope, timestamp and state", () => {
  let s = apply(seed(), {
    type: "closure",
    id: "FND-003",
    reference: "SYNTH-v1",
    note: "Synthetic metadata added",
  });
  s = apply(
    s,
    {
      type: "review",
      target: "finding",
      id: "FND-003",
      decision: "approve",
      reason: "Reviewed synthetic metadata",
    },
    "reviewer",
  );
  const json = exportJson(s, timestamp);
  assert.equal(json.schemaVersion, "complira.export.v1");
  assert.equal(json.exported_at, timestamp);
  assert.equal(json.workspace.findings[2].state, "closed");
  assert.ok(json.not_reviewed.includes("Live systems"));
  assert.match(exportCsv(s), /Reviewed synthetic metadata/);
  assert.match(exportCsv(s), /SYNTHETIC DATA ONLY/);
});

test("finding assignments and action updates retain versions and review protections", () => {
  let s = seed();
  s = apply(s, {
    type: "assignment",
    id: "FND-003",
    owner_team: "Synthetic Operations",
    due_date: "2026-12-01",
  });
  assert.equal(s.findings[2].owner_team, "Synthetic Operations");
  assert.equal(s.findings[2].due_date, "2026-12-01");
  assert.equal(s.findings[2].version, 2);
  s = apply(s, {
    type: "task",
    record: {
      ...s.remediation_actions[2],
      owner_team: "Synthetic Operations",
      due_date: "2026-12-01",
      state: "blocked",
    },
  });
  assert.equal(s.remediation_actions[2].state, "blocked");
  s = apply(s, {
    type: "closure",
    id: "FND-003",
    reference: "SYNTH-v1",
    note: "Synthetic evidence metadata",
  });
  assert.throws(
    () =>
      apply(s, {
        type: "task",
        record: { ...s.remediation_actions[2], state: "closed" },
      }),
    /review/,
  );
});

test("notice rejection retains current version and can be edited and resubmitted", () => {
  let s = seed();
  const current = currentNotice(s)!;
  s = apply(s, {
    type: "notice",
    record: { ...current, id: "NOTICE-v3", status: "draft" },
  });
  s = apply(s, { type: "submit_notice", id: "NOTICE-v3" });
  assert.throws(
    () =>
      apply(
        s,
        {
          type: "review",
          target: "notice",
          id: "NOTICE-v3",
          decision: "approve",
          reason: "short",
        },
        "reviewer",
      ),
    /Rationale/,
  );
  s = apply(
    s,
    {
      type: "review",
      target: "notice",
      id: "NOTICE-v3",
      decision: "reject",
      reason: "Purpose map needs revision",
    },
    "reviewer",
  );
  assert.equal(currentNotice(s)!.id, current.id);
  s = apply(s, {
    type: "notice",
    record: {
      ...s.notice_versions[2],
      status: "draft",
      mapped_activity_ids: [...current.mapped_activity_ids, "ACT-003"],
    },
  });
  s = apply(s, { type: "submit_notice", id: "NOTICE-v3" });
  assert.equal(s.notice_versions[2].status, "pending_review");
  assert.equal(s.review_decisions[0].decision, "reject");
});
