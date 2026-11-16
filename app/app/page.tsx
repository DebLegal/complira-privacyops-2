import { redirect } from "next/navigation";
import { liveConfig } from "../../server/config";
import CustomerGate from "../../components/customer-gate";
export const dynamic = "force-dynamic";
export default function Page() {
  try {
    liveConfig();
  } catch {
    return <CustomerGate />;
  }
  redirect("/app/setup");
}
