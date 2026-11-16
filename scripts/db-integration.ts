import { Pool } from "pg";
import assert from "node:assert/strict";
import {
  createOrganization,
  loadWorkspace,
  mutateWorkspace,
  inviteMember,
  acceptInvitation,
  generateReport,
} from "../server/workspace";
import { emptyWorkspace } from "../lib/domain";
import { randomUUID } from "node:crypto";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ownerA = "10000000-0000-4000-8000-000000000001",
  ownerB = "20000000-0000-4000-8000-000000000002",
  editor = "30000000-0000-4000-8000-000000000003",
  reviewer = "40000000-0000-4000-8000-000000000004",
  viewer = "50000000-0000-4000-8000-000000000005",
  admin = "60000000-0000-4000-8000-000000000006";
let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log("PASS PostgreSQL:", name);
}
async function sql(
  user: string,
  role: string,
  text: string,
  values: unknown[] = [],
) {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query(
      `set local role ${role === "authenticated" ? "authenticated" : role === "anon" ? "anon" : "complira_server"}`,
    );
    await c.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: user, role }),
    ]);
    const result = await c.query(text, values);
    await c.query("commit");
    return result;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
async function main() {
  try {
    console.log(
      "PostgreSQL version:",
      (await pool.query("show server_version")).rows[0].server_version,
    );
    const orgA = await createOrganization(ownerA, "Synthetic organization A"),
      orgB = await createOrganization(ownerB, "Synthetic organization B");
    await check(
      "onboarding creates an empty tenant; no MapleStack records leak",
      async () => {
        const w = await loadWorkspace(ownerA, orgA);
        assert.deepEqual(w.state, emptyWorkspace());
        assert.equal(w.role, "owner");
      },
    );
    await check(
      "organization B cannot read or mutate organization A",
      async () => {
        await assert.rejects(loadWorkspace(ownerB, orgA));
        assert.equal(
          (
            await sql(
              ownerB,
              "authenticated",
              "select * from complira.records where organization_id=$1",
              [orgA],
            )
          ).rowCount,
          0,
        );
        await assert.rejects(
          sql(
            ownerB,
            "complira_server",
            "insert into complira.records values($1,'vendors','VEN-999','{\"id\":\"VEN-999\"}',1)",
            [orgA],
          ),
        );
      },
    );
    await check(
      "invitations are email-bound, role-controlled and single-use",
      async () => {
        for (const [user, email, role] of [
          [editor, "editor@synthetic.invalid", "editor"],
          [reviewer, "reviewer@synthetic.invalid", "reviewer"],
          [viewer, "viewer@synthetic.invalid", "viewer"],
          [admin, "admin@synthetic.invalid", "admin"],
        ] as const) {
          const token = await inviteMember(ownerA, {
            organizationId: orgA,
            email,
            role,
          });
          await assert.rejects(
            acceptInvitation(user, "wrong@synthetic.invalid", token),
          );
          assert.equal(await acceptInvitation(user, email, token), orgA);
          await assert.rejects(acceptInvitation(user, email, token));
        }
        await assert.rejects(
          inviteMember(editor, {
            organizationId: orgA,
            email: "other@synthetic.invalid",
            role: "reviewer",
          }),
        );
        await assert.rejects(
          inviteMember(admin, {
            organizationId: orgA,
            email: "elevated@synthetic.invalid",
            role: "admin",
          }),
        );
        await assert.rejects(
          inviteMember(viewer, {
            organizationId: orgA,
            email: "new@synthetic.invalid",
            role: "editor",
          }),
        );
        const expired = await inviteMember(ownerA, {
          organizationId: orgA,
          email: "expired@synthetic.invalid",
          role: "editor",
        });
        await pool.query(
          "update complira.invitations set expires_at=now()-interval '1 minute' where organization_id=$1 and email='expired@synthetic.invalid'",
          [orgA],
        );
        await assert.rejects(
          acceptInvitation(editor, "expired@synthetic.invalid", expired),
        );
        await assert.rejects(
          sql(
            ownerA,
            "authenticated",
            "select complira.create_organization('Forged organization')",
          ),
        );
      },
    );
    const first = {
      type: "activity",
      record: {
        id: "ACT-001",
        name: "Synthetic registration",
        purpose: "Synthetic account access",
        data_categories: ["Fictional category"],
        source_system: "Synthetic system",
        vendor_ids: [],
        owner_team: "Test team",
        retention_description: "Not established",
        retention_verified: false,
        review_status: "requires_document_review",
        version: 1,
      },
    };
    let state = await loadWorkspace(editor, orgA);
    const request = {
      organizationId: orgA,
      expectedVersion: state.version,
      requestId: randomUUID(),
      command: first,
    };
    await check(
      "transaction persists records, increments workspace version and records audit",
      async () => {
        state = await mutateWorkspace(editor, request);
        assert.equal(state.state.processing_activities.length, 1);
        assert.equal(state.version, 2);
        assert.equal(state.state.audit_events.length, 1);
      },
    );
    await check(
      "same idempotency key replays response; changed payload is refused",
      async () => {
        const result = await mutateWorkspace(editor, request);
        assert.equal(result.version, 2);
        await assert.rejects(
          mutateWorkspace(editor, {
            ...request,
            command: { ...first, record: { ...first.record, name: "Changed" } },
          }),
        );
        assert.equal(
          (await loadWorkspace(editor, orgA)).state.audit_events.length,
          1,
        );
      },
    );
    await check("concurrent stale workspace writes are refused", async () => {
      await assert.rejects(
        mutateWorkspace(editor, { ...request, requestId: randomUUID() }),
        /version conflict/i,
      );
    });
    await check(
      "viewer reads own tenant, cannot mutate; anon/direct API writes refused",
      async () => {
        assert.equal(
          (await loadWorkspace(viewer, orgA)).state.processing_activities
            .length,
          1,
        );
        await assert.rejects(
          mutateWorkspace(viewer, {
            ...request,
            requestId: randomUUID(),
            expectedVersion: 2,
          }),
        );
        await assert.rejects(
          sql(
            editor,
            "authenticated",
            "update complira.records set version=99",
          ),
        );
        await assert.rejects(
          sql(ownerA, "anon", "select * from complira.records"),
        );
      },
    );
    const mutate = async (user: string, command: unknown) => {
      const w = await loadWorkspace(user, orgA);
      return mutateWorkspace(user, {
        organizationId: orgA,
        expectedVersion: w.version,
        requestId: randomUUID(),
        command,
      });
    };
    state = await mutate(editor, {
      type: "change",
      record: {
        id: "CHG-001",
        version: 1,
        title: "Synthetic review",
        owner_team: "Test team",
        change_type: "New purpose",
        activity_id: "ACT-001",
        vendor_id: null,
        recorded_date: "2026-11-16",
        state: "new",
      },
    });
    state = await mutate(editor, { type: "record", id: "CHG-001" });
    await check(
      "rules persist unique fingerprints with tenant-composite source links",
      async () => {
        const count = state.state.findings.length;
        state = await mutate(editor, { type: "record", id: "CHG-001" });
        assert.equal(state.state.findings.length, count);
        assert.equal(count, 2);
      },
    );
    const finding = state.state.findings[0];
    state = await mutate(editor, {
      type: "closure",
      id: finding.id,
      reference: "SYNTH-EVIDENCE-v1",
      note: "Synthetic metadata for independent review",
    });
    await check(
      "editor cannot approve; reviewer self-approval denied by SQL",
      async () => {
        await assert.rejects(
          mutate(editor, {
            type: "review",
            target: "finding",
            id: finding.id,
            decision: "approve",
            reason: "Synthetic reviewer rationale",
          }),
        );
        await pool.query(
          "update complira.review_requests set requested_by=$3 where organization_id=$1 and subject_id=$2",
          [orgA, finding.id, reviewer],
        );
        await assert.rejects(
          sql(
            reviewer,
            "complira_server",
            "insert into complira.decisions(organization_id,id,subject_id,actor_id,data) values($1,$2,$3,$4,$5)",
            [orgA, "FORGED", finding.id, reviewer, {}],
          ),
        );
        await pool.query(
          "update complira.review_requests set requested_by=$3 where organization_id=$1 and subject_id=$2",
          [orgA, finding.id, editor],
        );
      },
    );
    await check(
      "independent reviewer closes finding; decision and audit are persisted",
      async () => {
        state = await mutate(reviewer, {
          type: "review",
          target: "finding",
          id: finding.id,
          decision: "approve",
          reason: "Reviewed synthetic metadata independently",
        });
        assert.equal(state.state.findings[0].state, "closed");
        assert.equal(state.state.review_decisions.length, 1);
      },
    );
    await check(
      "history updates/deletions and forged actors are denied",
      async () => {
        await assert.rejects(
          sql(reviewer, "complira_server", "delete from complira.decisions"),
        );
        await assert.rejects(
          sql(
            reviewer,
            "complira_server",
            "update complira.audit_events set data='{}'",
          ),
        );
        await assert.rejects(
          sql(
            reviewer,
            "complira_server",
            "insert into complira.decisions(organization_id,id,subject_id,actor_id,data) values($1,$2,$3,$4,$5)",
            [orgA, "FORGED-ACTOR", finding.id, ownerA, {}],
          ),
        );
      },
    );
    await check(
      "cross-tenant composite foreign key refuses references into org B",
      async () => {
        await pool.query(
          "insert into complira.records values($1,'vendors','VEN-B','{\"id\":\"VEN-B\"}',1)",
          [orgB],
        );
        await assert.rejects(
          sql(
            editor,
            "complira_server",
            "insert into complira.record_links values($1,'processing_activities','ACT-001','vendors','VEN-B')",
            [orgA],
          ),
          /foreign key/,
        );
      },
    );
    await check(
      "database unique fingerprints prevent duplicate actionable records",
      async () => {
        const f = state.state.findings[0];
        await assert.rejects(
          sql(
            editor,
            "complira_server",
            "insert into complira.records values($1,'findings','FND-DUP',$2,1)",
            [orgA, { ...f, id: "FND-DUP", state: "suggested_pending_review" }],
          ),
          /unique/,
        );
      },
    );
    await check(
      "second current notice is rejected by database uniqueness",
      async () => {
        await pool.query(
          'insert into complira.records values($1,\'notice_versions\',\'NOTICE-1\',\'{"id":"NOTICE-1","status":"draft"}\',1)',
          [orgA],
        );
        await pool.query(
          "insert into complira.review_requests values($1,$2,$3)",
          [orgA, "NOTICE-1", editor],
        );
        await sql(
          reviewer,
          "complira_server",
          "update complira.records set data=data||'{\"status\":\"current_recorded\"}' where organization_id=$1 and id='NOTICE-1'",
          [orgA],
        );
        await pool.query(
          'insert into complira.records values($1,\'notice_versions\',\'NOTICE-2\',\'{"id":"NOTICE-2","status":"draft"}\',1)',
          [orgA],
        );
        await pool.query(
          "insert into complira.review_requests values($1,$2,$3)",
          [orgA, "NOTICE-2", editor],
        );
        await assert.rejects(
          sql(
            reviewer,
            "complira_server",
            "update complira.records set data=data||'{\"status\":\"current_recorded\"}' where organization_id=$1 and id='NOTICE-2'",
            [orgA],
          ),
          /unique/,
        );
      },
    );
    await check(
      "no Storage buckets are created; evidence remains metadata only",
      async () => {
        const r = await pool.query(
          "select to_regclass('storage.objects') as objects",
        );
        assert.equal(r.rows[0].objects, null);
      },
    );
    await pool.query(
      "delete from complira.review_requests where organization_id=$1 and subject_id in ('NOTICE-1','NOTICE-2')",
      [orgA],
    );
    await pool.query(
      "delete from complira.records where organization_id=$1 and id in ('NOTICE-1','NOTICE-2')",
      [orgA],
    );
    await check(
      "viewer exports are audited without granting viewer mutations",
      async () => {
        const report = JSON.parse(await generateReport(viewer, orgA, "json"));
        assert.equal(report.mode, "private_metadata_beta");
        assert.ok(
          report.workspace.audit_events.some(
            (e: { action: string; actor_role?: string }) =>
              e.action === "report_export" && e.actor_role === "viewer",
          ),
        );
        assert.equal(report.disclaimer.includes("SYNTHETIC DATA ONLY"), false);
      },
    );
    await check(
      "every tenant table forces RLS and public/authenticated grants cannot bypass mutations",
      async () => {
        const rows = (
          await pool.query(
            "select relname,relrowsecurity,relforcerowsecurity from pg_class join pg_namespace on pg_namespace.oid=relnamespace where nspname='complira' and relkind='r'",
          )
        ).rows;
        assert.deepEqual(
          rows.map((r) => r.relname).sort(),
          [
            "organizations",
            "memberships",
            "workspaces",
            "records",
            "record_links",
            "review_requests",
            "decisions",
            "audit_events",
            "invitations",
            "request_results",
          ].sort(),
        );
        assert.ok(rows.every((r) => r.relrowsecurity && r.relforcerowsecurity));
        const role = (
          await pool.query(
            "select rolbypassrls,rolsuper,rolcanlogin from pg_roles where rolname='complira_server'",
          )
        ).rows[0];
        assert.deepEqual(role, {
          rolbypassrls: false,
          rolsuper: false,
          rolcanlogin: false,
        });
        assert.equal(
          (
            await pool.query(
              "select has_table_privilege('authenticated','complira.records','INSERT') as allowed",
            )
          ).rows[0].allowed,
          false,
        );
        await assert.rejects(loadWorkspace(ownerA, randomUUID()));
      },
    );
    await check(
      "two concurrent writes produce one winner and one version conflict",
      async () => {
        const current = await loadWorkspace(editor, orgA);
        const command = {
          type: "change",
          record: {
            id: "CHG-002",
            version: 1,
            title: "Concurrent synthetic review",
            owner_team: "Test team",
            change_type: "New purpose",
            activity_id: "ACT-001",
            vendor_id: null,
            recorded_date: "2026-11-16",
            state: "new",
          },
        };
        const results = await Promise.allSettled([
          mutateWorkspace(editor, {
            organizationId: orgA,
            expectedVersion: current.version,
            requestId: randomUUID(),
            command,
          }),
          mutateWorkspace(editor, {
            organizationId: orgA,
            expectedVersion: current.version,
            requestId: randomUUID(),
            command,
          }),
        ]);
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
        const failure = results.find((r) => r.status === "rejected");
        assert.ok(
          failure?.status === "rejected" && failure.reason.status === 409,
        );
      },
    );
    console.log(`PostgreSQL integration: ${passed} passed, 0 skipped`);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
void main();
