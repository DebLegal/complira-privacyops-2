"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
export default function OrganizationForms({
  kind,
  organizationId,
  token,
}: {
  kind: "create" | "invite" | "accept";
  organizationId?: string;
  token?: string;
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(e.currentTarget);
    try {
      const data =
        kind === "create"
          ? { name: form.get("name") }
          : kind === "invite"
            ? {
                organizationId,
                email: form.get("email"),
                role: form.get("role"),
              }
            : { token };
      const r = await fetch(
        "/api/live/" +
          (kind === "create"
            ? "organizations"
            : kind === "invite"
              ? "invitations"
              : "accept"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      if (result.organizationId) {
        router.push("/app/overview?org=" + result.organizationId);
        router.refresh();
      } else setMessage(result.message + " " + result.invitationUrl);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      {kind === "create" ? (
        <label className="field">
          Organization name
          <input name="name" required maxLength={160} />
        </label>
      ) : kind === "invite" ? (
        <>
          <label className="field">
            Member email
            <input name="email" type="email" required />
          </label>
          <label className="field">
            Role
            <select name="role">
              <option>editor</option>
              <option>reviewer</option>
              <option>viewer</option>
              <option>admin</option>
            </select>
          </label>
        </>
      ) : (
        <p>
          Accept the invitation for your verified email. Tokens are single-use
          and expire after 48 hours.
        </p>
      )}
      <button className="btn primary" disabled={busy}>
        {busy
          ? "Working…"
          : kind === "create"
            ? "Create organization"
            : kind === "invite"
              ? "Create private invitation link"
              : "Accept invitation"}
      </button>
      <p role="status" style={{ overflowWrap: "anywhere" }}>
        {message}
      </p>
    </form>
  );
}
