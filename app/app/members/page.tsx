import { redirect } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { liveConfig } from "../../../server/config";
import { verifiedUser } from "../../../server/auth";
import { loadWorkspace, listMembers } from "../../../server/workspace";
import CustomerGate from "../../../components/customer-gate";
import OrganizationForms from "../../../components/organization-forms";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  try {
    liveConfig();
  } catch {
    return <CustomerGate />;
  }
  let user;
  try {
    user = await verifiedUser();
  } catch {
    redirect("/login");
  }
  const org = z.uuid().safeParse((await searchParams).org);
  if (!org.success) redirect("/app/setup");
  let workspace, members;
  try {
    workspace = await loadWorkspace(user.id, org.data);
    members = await listMembers(user.id, org.data);
  } catch {
    return <CustomerGate />;
  }
  return (
    <main className="auth-card">
      <h1>{workspace.organizationName}: members</h1>
      <Link href={"/app/overview?org=" + org.data}>Back to workspace</Link>
      {members.map((m) => (
        <p key={m.user_id}>
          {m.user_id} · {m.role}
        </p>
      ))}
      {["owner", "admin"].includes(workspace.role) ? (
        <OrganizationForms kind="invite" organizationId={org.data} />
      ) : (
        <p>Only owners/admins may invite members.</p>
      )}
    </main>
  );
}
