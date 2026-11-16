import { liveConfig } from "../../server/config";
import CustomerGate from "../../components/customer-gate";
import AuthForm from "../../components/auth-form";
export const dynamic = "force-dynamic";
export default function Login() {
  try {
    liveConfig();
  } catch {
    return <CustomerGate />;
  }
  return (
    <main className="auth-card">
      <AuthForm />
    </main>
  );
}
