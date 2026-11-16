import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { PoolClient } from "pg";
import {
  emptyWorkspace,
  workspaceSchema,
  transition,
  exportJson,
  exportCsv,
  type State,
} from "../lib/domain";
import {
  authorizeCommand,
  roleSchema,
  ServiceError,
  mutationSchema,
  invitationSchema,
} from "../lib/live-policy";
import { withTenant } from "./db";
const collections = [
  "processing_activities",
  "vendors",
  "notice_versions",
  "change_requests",
  "findings",
  "remediation_actions",
  "evidence_records",
] as const;
export type LiveWorkspace = {
  state: State;
  version: number;
  organizationId: string;
  organizationName: string;
  role: ReturnType<typeof roleSchema.parse>;
};
async function read(
  client: PoolClient,
  org: string,
  user: string,
): Promise<LiveWorkspace> {
  const {
    rows: [member],
  } = await client.query(
    "select m.role,o.name,w.version from complira.memberships m join complira.organizations o on o.id=m.organization_id join complira.workspaces w on w.organization_id=o.id where m.organization_id=$1 and m.user_id=$2",
    [org, user],
  );
  if (!member) throw new ServiceError(403, "Organization access denied");
  const state = emptyWorkspace();
  const { rows } = await client.query(
    "select kind,data from complira.records where organization_id=$1 order by kind,id",
    [org],
  );
  for (const r of rows) {
    if (collections.includes(r.kind))
      state[r.kind as (typeof collections)[number]].push(r.data);
  }
  state.review_decisions = (
    await client.query(
      "select data from complira.decisions where organization_id=$1 order by created_at,id",
      [org],
    )
  ).rows.map((r) => r.data);
  state.audit_events = (
    await client.query(
      "select data from complira.audit_events where organization_id=$1 order by created_at,id",
      [org],
    )
  ).rows.map((r) => r.data);
  return {
    state: workspaceSchema.parse(state),
    version: member.version,
    organizationId: org,
    organizationName: member.name,
    role: roleSchema.parse(member.role),
  };
}
export const loadWorkspace = (user: string, org: string) =>
  withTenant(user, (c) => read(c, org, user));
export const listOrganizations = (user: string) =>
  withTenant(
    user,
    async (c) =>
      (
        await c.query(
          "select o.id,o.name,m.role from complira.organizations o join complira.memberships m on m.organization_id=o.id where m.user_id=$1 order by o.created_at",
          [user],
        )
      ).rows as { id: string; name: string; role: string }[],
  );
export const listMembers = (user: string, org: string) =>
  withTenant(user, async (c) => {
    await read(c, org, user);
    return (
      await c.query(
        "select user_id,role from complira.memberships where organization_id=$1",
        [org],
      )
    ).rows as { user_id: string; role: string }[];
  });
export const createOrganization = (user: string, name: string) =>
  withTenant(
    user,
    async (c) =>
      (await c.query("select complira.create_organization($1) as id", [name]))
        .rows[0].id as string,
  );
export async function inviteMember(user: string, input: unknown) {
  const data = invitationSchema.parse(input);
  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  await withTenant(user, (c) =>
    c.query("select complira.invite_member($1,$2,$3,$4)", [
      data.organizationId,
      data.email,
      data.role,
      hash,
    ]),
  );
  return token;
}
export const acceptInvitation = (user: string, email: string, token: string) =>
  withTenant(
    user,
    async (c) =>
      (
        await c.query("select complira.accept_invitation($1,$2) as id", [
          createHash("sha256").update(token).digest("hex"),
          email,
        ])
      ).rows[0].id as string,
  );
export async function mutateWorkspace(
  user: string,
  input: unknown,
): Promise<LiveWorkspace> {
  const data = mutationSchema.parse(input);
  const hash = createHash("sha256")
    .update(JSON.stringify(data.command))
    .digest("hex");
  return withTenant(user, async (c) => {
    // Serialize each tenant's version check, history insertion and link updates.
    await c.query(
      "select version from complira.workspaces where organization_id=$1 for update",
      [data.organizationId],
    );
    const current = await read(c, data.organizationId, user);
    authorizeCommand(current.role, data.command);
    const {
      rows: [prior],
    } = await c.query(
      "select request_hash,response from complira.request_results where organization_id=$1 and actor_id=$2 and request_id=$3",
      [data.organizationId, user, data.requestId],
    );
    if (prior) {
      if (prior.request_hash !== hash)
        throw new ServiceError(
          409,
          "Idempotency key reused for a different request",
        );
      return prior.response as LiveWorkspace;
    }
    if (current.version !== data.expectedVersion)
      throw new ServiceError(
        409,
        "Workspace version conflict. Reload before retrying.",
      );
    const next = transition(
      current.state,
      data.command,
      current.role === "reviewer" ? "reviewer" : "editor",
      new Date().toISOString(),
      user,
      current.role,
    );
    // Archive old current before inserting/updating a newly approved notice (partial unique index).
    for (const n of next.notice_versions.filter((n) => n.status === "archived"))
      await c.query(
        "update complira.records set data=$3,version=$4 where organization_id=$1 and kind='notice_versions' and id=$2",
        [data.organizationId, n.id, n, n.version],
      );
    for (const key of collections)
      for (const r of next[key]) {
        const value = { ...r, organization_id: data.organizationId };
        const version = "version" in r ? r.version : 1;
        const previous = current.state[key].find((old) => old.id === r.id);
        if (
          previous &&
          isDeepStrictEqual(
            { ...previous, organization_id: data.organizationId },
            value,
          )
        )
          continue;
        if (previous) {
          await c.query(
            "update complira.records set data=$4,version=$5 where organization_id=$1 and kind=$2 and id=$3",
            [data.organizationId, key, r.id, value, version],
          );
        } else {
          await c.query(
            "insert into complira.records(organization_id,kind,id,data,version) values($1,$2,$3,$4,$5)",
            [data.organizationId, key, r.id, value, version],
          );
        }
      }
    // Referential consistency is enforced by tenant-composite foreign keys as well as domain validation.
    await c.query(
      "delete from complira.record_links where organization_id=$1",
      [data.organizationId],
    );
    const link = async (fk: string, fi: string, tk: string, ti: string) => {
      await c.query(
        "insert into complira.record_links values($1,$2,$3,$4,$5) on conflict do nothing",
        [data.organizationId, fk, fi, tk, ti],
      );
    };
    for (const a of next.processing_activities)
      for (const id of a.vendor_ids)
        await link("processing_activities", a.id, "vendors", id);
    for (const n of next.notice_versions)
      for (const id of n.mapped_activity_ids)
        await link("notice_versions", n.id, "processing_activities", id);
    for (const change of next.change_requests) {
      if (change.activity_id)
        await link(
          "change_requests",
          change.id,
          "processing_activities",
          change.activity_id,
        );
      if (change.vendor_id)
        await link("change_requests", change.id, "vendors", change.vendor_id);
    }
    for (const task of next.remediation_actions)
      await link("remediation_actions", task.id, "findings", task.finding_id);
    for (const evidence of next.evidence_records)
      await link(
        "evidence_records",
        evidence.id,
        "findings",
        evidence.finding_id,
      );
    for (const r of [...next.notice_versions, ...next.findings]) {
      const requester =
        "submitted_by" in r ? r.submitted_by : r.closure_requested_by;
      if (typeof requester === "string")
        await c.query(
          "insert into complira.review_requests values($1,$2,$3) on conflict(organization_id,subject_id) do update set requested_by=excluded.requested_by",
          [data.organizationId, r.id, requester],
        );
    }
    for (const d of next.review_decisions.slice(
      current.state.review_decisions.length,
    ))
      await c.query(
        "insert into complira.decisions(organization_id,id,subject_id,actor_id,data) values($1,$2,$3,$4,$5)",
        [data.organizationId, d.id, d.subject_id, user, d],
      );
    for (const event of next.audit_events.slice(
      current.state.audit_events.length,
    ))
      await c.query(
        "insert into complira.audit_events(organization_id,id,actor_id,data) values($1,$2,$3,$4)",
        [data.organizationId, event.id, user, event],
      );
    await c.query(
      "update complira.workspaces set version=version+1 where organization_id=$1",
      [data.organizationId],
    );
    const response = await read(c, data.organizationId, user);
    await c.query(
      "insert into complira.request_results values($1,$2,$3,$4,$5)",
      [data.organizationId, user, data.requestId, hash, response],
    );
    return response;
  });
}
export function liveReport(
  state: State,
  org: string,
  timestamp: string,
  format: string,
  version?: number,
) {
  if (format === "csv")
    return exportCsv(state)
      .replace(
        "SYNTHETIC DATA ONLY — not a legal opinion",
        "PRIVATE CUSTOMER METADATA — not a legal opinion",
      )
      .replace(
        "fictional register metadata",
        "customer-supplied register metadata",
      );
  const base = exportJson(state, timestamp);
  return JSON.stringify(
    {
      ...base,
      mode: "private_metadata_beta",
      disclaimer:
        "Private customer register metadata; not an audit, certification or legal opinion",
      scope: ["Customer-supplied register metadata only"],
      organization_id: org,
      workspace_version: version,
    },
    null,
    2,
  );
}

export const generateReport = (user: string, org: string, format: string) =>
  withTenant(user, async (c) => {
    await read(c, org, user);
    await c.query("select complira.record_export($1,$2)", [org, format]);
    const workspace = await read(c, org, user);
    return liveReport(
      workspace.state,
      org,
      new Date().toISOString(),
      format,
      workspace.version,
    );
  });
