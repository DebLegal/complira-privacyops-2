import { test } from "node:test";
import assert from "node:assert/strict";
import {
  authorizeCommand,
  mutationSchema,
  requireSameOrigin,
  invitationSchema,
} from "./live-policy";
import {
  seed,
  transition,
  evaluate,
  commandSchema,
  DEMO_CHECK_DATE,
  exportJson,
} from "./domain";
const timestamp = "2026-11-16T12:00:00.000Z";
test("viewer cannot mutate, editor/admin/owner cannot act as reviewer", () => {
  for (const role of ["viewer", "editor", "admin", "owner"] as const)
    assert.throws(() =>
      authorizeCommand(role, {
        type: "review",
        id: "FND-003",
        target: "finding",
        decision: "approve",
        reason: "Synthetic review rationale",
      }),
    );
  assert.doesNotThrow(() =>
    authorizeCommand("reviewer", {
      type: "review",
      id: "FND-003",
      target: "finding",
      decision: "approve",
      reason: "Synthetic review rationale",
    }),
  );
  assert.throws(() =>
    authorizeCommand("reviewer", {
      type: "closure",
      id: "FND-003",
      reference: "SYNTH-v1",
      note: "Synthetic metadata",
    }),
  );
});
test("server command schema strips forged actors, tenant fields cannot select auth identity", () => {
  const s = seed();
  const parsed = commandSchema.parse({
    type: "notice",
    record: {
      ...s.notice_versions[0],
      status: "draft",
      created_by: "forged-user",
      submitted_by: "forged-user",
    },
  });
  assert.equal(
    "created_by" in ("record" in parsed ? parsed.record : {}),
    false,
  );
  assert.equal(
    "submitted_by" in ("record" in parsed ? parsed.record : {}),
    false,
  );
  assert.throws(() =>
    mutationSchema.parse({
      organizationId: "forged",
      expectedVersion: 1,
      requestId: "forged",
      command: { type: "record", id: "CHG-001" },
    }),
  );
  assert.throws(() =>
    invitationSchema.parse({
      organizationId: "11111111-1111-4111-8111-111111111111",
      email: "test@synthetic.invalid",
      role: "owner",
    }),
  );
});
test("self-approval rejected for notices and findings by shared transition", () => {
  let s = seed();
  s = transition(
    s,
    {
      type: "closure",
      id: "FND-003",
      reference: "SYNTH-v1",
      note: "Synthetic metadata for review",
    },
    "editor",
    timestamp,
    "actor-A",
  );
  assert.throws(
    () =>
      transition(
        s,
        {
          type: "review",
          id: "FND-003",
          target: "finding",
          decision: "approve",
          reason: "Synthetic independent rationale",
        },
        "reviewer",
        timestamp,
        "actor-A",
      ),
    /Self-approval/,
  );
  const n = {
    ...s.notice_versions[0],
    id: "NOTICE-v3",
    status: "draft" as const,
  };
  s = transition(
    s,
    { type: "notice", record: n },
    "editor",
    timestamp,
    "actor-A",
  );
  s = transition(
    s,
    { type: "submit_notice", id: n.id },
    "editor",
    timestamp,
    "actor-A",
  );
  assert.throws(
    () =>
      transition(
        s,
        {
          type: "review",
          id: n.id,
          target: "notice",
          decision: "approve",
          reason: "Synthetic independent rationale",
        },
        "reviewer",
        timestamp,
        "actor-A",
      ),
    /Self-approval/,
  );
});
test("stale record updates fail without mutating the source", () => {
  const s = seed();
  const cmd = {
    type: "activity" as const,
    record: {
      ...s.processing_activities[0],
      name: "Updated synthetic registration",
    },
  };
  const updated = transition(s, cmd, "editor", timestamp);
  assert.throws(
    () => transition(updated, cmd, "editor", timestamp),
    /Version conflict/,
  );
  assert.equal(s.processing_activities[0].version, 1);
});
test("same-origin checks reject absent, forged, subdomain and malformed origins", () => {
  for (const origin of [
    null,
    "https://attacker.invalid",
    "https://app.synthetic.invalid.attacker.invalid",
    "null",
  ])
    assert.throws(() =>
      requireSameOrigin(origin, "https://app.synthetic.invalid"),
    );
  assert.doesNotThrow(() =>
    requireSameOrigin(
      "https://app.synthetic.invalid",
      "https://app.synthetic.invalid",
    ),
  );
});
test("rules expose precise fields, versions, owners and deterministic demo date; report versions", () => {
  const s = seed();
  const rules = evaluate(s, s.change_requests[0], DEMO_CHECK_DATE);
  assert.equal(rules.length, 4);
  assert.ok(
    rules.every(
      (r) => r.examined_field && r.record_version === 1 && r.provisional_owner,
    ),
  );
  const report = exportJson(s, timestamp);
  assert.equal(report.record_versions["ACT-003"], 1);
  assert.equal(report.outstanding_actions.length, 3);
  assert.ok(report.assumptions.length);
});

test("server validation rejects invalid calendar dates and oversized record fields", () => {
  const s = seed();
  assert.equal(
    commandSchema.safeParse({
      type: "vendor",
      record: { ...s.vendors[0], renewal_date: "2026-99-99" },
    }).success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({
      type: "task",
      record: { ...s.remediation_actions[0], due_date: "not-a-date" },
    }).success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({
      type: "activity",
      record: { ...s.processing_activities[0], name: "x".repeat(201) },
    }).success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({
      type: "notice",
      record: { ...s.notice_versions[0], version_label: "" },
    }).success,
    false,
  );
});
