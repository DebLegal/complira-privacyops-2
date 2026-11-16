import Link from "next/link";
import { redirect } from "next/navigation";
import { liveConfig } from "../../../server/config";
import { verifiedUser } from "../../../server/auth";
import { listOrganizations } from "../../../server/workspace";
import CustomerGate from "../../../components/customer-gate";
import OrganizationForms from "../../../components/organization-forms";
export const dynamic = "force-dynamic";
export default async function Page() {
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
  const orgs = await listOrganizations(user.id);
  return (
    <main className="auth-card">
      <h1>Your organizations</h1>
      {orgs.map((o) => (
        <p key={o.id}>
          <Link href={"/app/overview?org=" + o.id}>
            {o.name} · {o.role}
          </Link>
        </p>
      ))}
      <h2>Create a workspace</h2>
      <p>Start with an empty private register. No demo records are copied.</p>
      <OrganizationForms kind="create" />
    </main>
  );
}
