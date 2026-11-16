import Link from "next/link";
export default function CustomerGate() {
  return (
    <main className="auth-card">
      <div className="eyebrow">COMPLIRA PRIVACYOPS</div>
      <h1>Customer workspace unavailable</h1>
      <p>
        Customer access is disabled until authentication, tenant isolation and
        the target database pass release verification.
      </p>
      <p>
        No customer data has been loaded. The fictional demo is separate and
        needs no account.
      </p>
      <Link className="btn primary" href="/demo/overview">
        Open synthetic demo
      </Link>
    </main>
  );
}
