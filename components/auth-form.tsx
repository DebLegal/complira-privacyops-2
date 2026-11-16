"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
export default function AuthForm() {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [signup, setSignup] = useState(false);
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/live/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: signup ? "signup" : "signin",
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      setMessage(result.message);
      if (!signup) {
        router.push("/app/setup");
        router.refresh();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Sign-in unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <h1>{signup ? "Create your account" : "Sign in to Complira"}</h1>
      <label className="field">
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        Password
        <input
          name="password"
          type="password"
          minLength={12}
          autoComplete={signup ? "new-password" : "current-password"}
          required
        />
      </label>
      <button className="btn primary" disabled={busy}>
        {busy ? "Working…" : signup ? "Create account" : "Sign in"}
      </button>
      <button type="button" onClick={() => setSignup(!signup)}>
        {signup ? "Already have an account?" : "Create an account"}
      </button>
      <p role="status">{message}</p>
      <p>
        Customer access uses verified email and server authorization. Demo
        personas do not grant access.
      </p>
    </form>
  );
}
