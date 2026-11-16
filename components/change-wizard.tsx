"use client";
import { useState, type FormEvent } from "react";
import {
  evaluate,
  nextId,
  type State,
  type Change,
  type Command,
} from "../lib/domain";
export default function ChangeWizard({
  state,
  date,
  initial,
  activityId,
  vendorId,
  busy,
  onSave,
}: {
  state: State;
  date: string;
  initial?: Change;
  activityId?: string;
  vendorId?: string;
  busy: boolean;
  onSave: (command: Command) => Promise<boolean>;
}) {
  const [step, setStep] = useState(0),
    [error, setError] = useState("");
  const [draft, setDraft] = useState<Change>(
    () =>
      initial || {
        id: nextId(state.change_requests, "CHG"),
        version: 1,
        title: "",
        owner_team: "Engineering",
        change_type: "New vendor",
        activity_id: activityId || null,
        vendor_id: vendorId || null,
        notes: "",
        recorded_date: date,
        state: "new",
      },
  );
  const patch = (key: keyof Change, value: string) =>
    setDraft({ ...draft, [key]: value });
  function next(e: FormEvent) {
    e.preventDefault();
    if (!draft.title.trim() || !draft.owner_team.trim()) {
      setError("Change title and responsible owner are required.");
      return;
    }
    if (step === 1 && !draft.activity_id && !draft.vendor_id) {
      setError(
        "Link at least one processing activity or vendor to make this review useful.",
      );
      return;
    }
    setError("");
    setStep(step + 1);
  }
  const rules = evaluate(state, draft, date);
  return (
    <form
      onSubmit={
        step < 2
          ? next
          : (e) => {
              e.preventDefault();
              void onSave({ type: "change", record: draft });
            }
      }
    >
      <ol className="wizard-steps" aria-label="Change review steps">
        {["Describe", "Link sources", "Preview checks"].map((label, i) => (
          <li key={label} aria-current={step === i ? "step" : undefined}>
            <span>{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <p className="muted">
        Step {step + 1} of 3 ·{" "}
        {initial ? "Edit existing review" : "Create a processing change"}
      </p>
      {step === 0 && (
        <div className="formgrid">
          <label className="field">
            Change type
            <select
              aria-label="Change type"
              value={draft.change_type}
              onChange={(e) => patch("change_type", e.target.value)}
            >
              {[
                "New vendor",
                "New data field",
                "New purpose",
                "Contract renewal",
                "Updated notice",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Change title
            <input
              name="title"
              value={draft.title}
              onChange={(e) => patch("title", e.target.value)}
              maxLength={200}
              required
              autoFocus
            />
          </label>
          <label className="field">
            Responsible owner
            <input
              name="owner_team"
              value={draft.owner_team}
              onChange={(e) => patch("owner_team", e.target.value)}
              required
              maxLength={200}
            />
          </label>
          <label className="field span2">
            Review notes
            <textarea
              value={draft.notes || ""}
              onChange={(e) => patch("notes", e.target.value)}
              maxLength={4000}
            />
          </label>
        </div>
      )}
      {step === 1 && (
        <div className="formgrid">
          <label className="field">
            Linked processing activity
            <select
              aria-label="Linked processing activity"
              value={draft.activity_id || ""}
              onChange={(e) => patch("activity_id", e.target.value)}
            >
              <option value="">No linked activity</option>
              {state.processing_activities
                .filter((x) => !x.archived || x.id === draft.activity_id)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.id} · {x.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            Linked vendor
            <select
              aria-label="Linked vendor"
              value={draft.vendor_id || ""}
              onChange={(e) => patch("vendor_id", e.target.value)}
            >
              <option value="">No linked vendor</option>
              {state.vendors
                .filter((x) => !x.archived || x.id === draft.vendor_id)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.id} · {x.name}
                  </option>
                ))}
            </select>
          </label>
          <p>
            Review only the records linked here. Suggestions inspect register
            fields, not legal document text.
          </p>
        </div>
      )}
      {step === 2 && (
        <>
          <h3>{draft.title}</h3>
          <p>
            {draft.change_type} · {draft.owner_team} ·{" "}
            {draft.activity_id || "No activity"} →{" "}
            {draft.vendor_id || "No vendor"}
          </p>
          <p>
            Checks as of {date}. Save the change, then record the review request
            to create findings and actions.
          </p>
          <ul className="checklist">
            {rules.map((r) => (
              <li key={r.rule_id}>
                <div>
                  <b>{r.rule_id}</b>
                  <p>
                    {r.subject_id} v{r.record_version} · field:{" "}
                    {r.examined_field}
                  </p>
                  <p>{r.source_b_metadata_or_absence}</p>
                  <p>
                    Suggested {r.suggested_severity} · {r.suggested_action}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {!rules.length && (
            <p>
              No register-field mismatch detected. This does not establish legal
              adequacy.
            </p>
          )}
        </>
      )}
      <p role="alert">{error}</p>
      <div className="modal-foot">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            disabled={busy}
          >
            Back
          </button>
        )}
        <button className="btn primary" disabled={busy} type="submit">
          {busy
            ? "Saving…"
            : step === 0
              ? "Next: Link sources"
              : step === 1
                ? "Preview checks"
                : initial
                  ? "Save change"
                  : "Create change"}
        </button>
      </div>
    </form>
  );
}
