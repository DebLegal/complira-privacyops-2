import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { liveConfig } from "../../../server/config";
import { verifiedUser } from "../../../server/auth";
import { loadWorkspace } from "../../../server/workspace";
import CustomerGate from "../../../components/customer-gate";
import Workspace from "../../workspace";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<{ org?: string }>;
}) {
  const { module } = await params;
  if (
    ![
      "overview",
      "processing",
      "vendors",
      "notices",
      "changes",
      "findings",
      "reports",
    ].includes(module)
  )
    notFound();
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
  let workspace;
  try {
    workspace = await loadWorkspace(user.id, org.data);
  } catch {
    return <CustomerGate />;
  }
  return <Workspace module={module} live={workspace} />;
}
