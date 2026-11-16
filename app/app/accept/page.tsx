import { redirect } from "next/navigation";
import { liveConfig } from "../../../server/config";
import { verifiedUser } from "../../../server/auth";
import CustomerGate from "../../../components/customer-gate";
import OrganizationForms from "../../../components/organization-forms";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  try {
    liveConfig();
  } catch {
    return <CustomerGate />;
  }
  try {
    await verifiedUser();
  } catch {
    redirect("/login");
  }
  const token = (await searchParams).token || "";
  if (!/^[a-f0-9]{64}$/.test(token))
    return (
      <main className="auth-card">
        <h1>Invalid invitation</h1>
      </main>
    );
  return (
    <main className="auth-card">
      <h1>Join an organization</h1>
      <OrganizationForms kind="accept" token={token} />
    </main>
  );
}
