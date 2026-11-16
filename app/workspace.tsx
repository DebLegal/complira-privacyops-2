"use client";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  currentNotice,
  evaluate,
  exportCsv,
  exportJson,
  nextId,
  seed,
  transition,
  type State,
  type Command,
  type Persona,
} from "../lib/domain";
import { sessionRepository } from "../lib/repository";
const NAV = [
  ["overview", "PrivacyOps overview"],
  ["processing", "Processing register"],
  ["vendors", "Vendors & DPAs"],
  ["notices", "Notice versions"],
  ["changes", "Change control"],
  ["findings", "Findings & actions"],
  ["reports", "Reports"],
];
const fmt = (s: string) => s.replaceAll("_", " ");
type Modal = { kind: string; id?: string };
function Field({
  label,
  name,
  value = "",
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  value?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      {label}
      <input name={name} defaultValue={value} type={type} required={required} />
    </label>
  );
}
function Area({
  label,
  name,
  value = "",
  required = false,
}: {
  label: string;
  name: string;
  value?: string;
  required?: boolean;
}) {
  return (
    <label className="field span2">
      {label}
      <textarea name={name} defaultValue={value} required={required} />
    </label>
  );
}
function Select({
  label,
  name,
  value = "",
  options,
}: {
  label: string;
  name: string;
  value?: string;
  options: string[][];
}) {
  return (
    <label className="field">
      {label}
      <select aria-label={label} name={name} defaultValue={value}>
        {options.map(([id, text]) => (
          <option key={id} value={id}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
      </div>
      <div className="panel-pad">{children}</div>
    </section>
  );
}
function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headers.length}>No matching records.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
const subscribe = () => () => {};
export default function Workspace({ module }: { module: string }) {
  const client = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return client ? (
    <ReadyWorkspace module={module} />
  ) : (
    <p>Loading synthetic workspace…</p>
  );
}
function ReadyWorkspace({ module }: { module: string }) {
  const [loaded] = useState(() => {
    try {
      return { state: sessionRepository(sessionStorage).load(), warning: "" };
    } catch {
      return {
        state: seed(),
        warning:
          "Saved session could not be read. Original synthetic fixture loaded.",
      };
    }
  });
  const [s, setS] = useState<State>(loaded.state),
    [ready] = useState(true),
    [persona, setPersona] = useState<Persona>(() =>
      sessionStorage.getItem("complira.persona") === "reviewer"
        ? "reviewer"
        : "editor",
    ),
    [modal, setModal] = useState<Modal | null>(null),
    [query, setQuery] = useState(""),
    [message, setMessage] = useState(loaded.warning);
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (modal) {
      if (!dialog.current?.open)
        returnFocus.current = document.activeElement as HTMLElement;
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
      returnFocus.current?.focus();
    }
  }, [modal]);
  const act = (cmd: Command) => {
    try {
      const next = transition(s, cmd, persona, new Date().toISOString());
      sessionRepository(sessionStorage).save(next);
      setS(next);
      setModal(null);
      setMessage("Synthetic register updated.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Operation failed");
    }
  };
  const open = (kind: string, id?: string) => {
    setMessage("");
    setModal({ kind, id });
  };
  const buttons = (items: [string, () => void][]) => (
    <div className="row-actions">
      {items.map(([text, fn]) => (
        <button className="text-btn" key={text} onClick={fn}>
          {text}
        </button>
      ))}
    </div>
  );
  const matching = (x: unknown) =>
    JSON.stringify(x).toLowerCase().includes(query.toLowerCase());
  const date = new Date().toISOString().slice(0, 10);
  const notice = currentNotice(s);
  const a = s.processing_activities.find((x) => x.id === modal?.id),
    v = s.vendors.find((x) => x.id === modal?.id),
    n = s.notice_versions.find((x) => x.id === modal?.id),
    c = s.change_requests.find((x) => x.id === modal?.id),
    f = s.findings.find((x) => x.id === modal?.id),
    t = s.remediation_actions.find((x) => x.id === modal?.id);
  const links = (
    name: string,
    items: { id: string; name?: string; purpose?: string }[],
    selected: string[],
  ) => (
    <fieldset className="span2">
      <legend>
        {name === "vendor_ids"
          ? "Linked vendors"
          : name === "mapped_activity_ids"
            ? "Mapped activities"
            : "Linked activities"}
      </legend>
      {items.map((x) => (
        <label className="check-label" key={x.id}>
          <input
            type="checkbox"
            name={name}
            value={x.id}
            defaultChecked={selected.includes(x.id)}
          />
          {x.id} · {x.name || x.purpose}
        </label>
      ))}
    </fieldset>
  );
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const val = (k: string) => String(data.get(k) || "").trim();
    const list = (k: string) => data.getAll(k).map(String);
    const common = { version: 1 };
    if (modal?.kind === "activity")
      act({
        type: "activity",
        record: {
          ...a,
          ...common,
          id: a?.id || nextId(s.processing_activities, "ACT"),
          name: val("name"),
          purpose: val("purpose"),
          owner_team: val("owner_team"),
          data_categories: val("data_categories")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
          source_system: val("source_system"),
          vendor_ids: list("vendor_ids"),
          retention_description: val("retention_description"),
          retention_verified: false,
          review_status: "requires_document_review",
        },
      });
    if (modal?.kind === "vendor")
      act({
        type: "vendor",
        record: {
          ...v,
          ...common,
          id: v?.id || nextId(s.vendors, "VEN"),
          name: val("name"),
          owner_team: val("owner_team"),
          activity_ids: list("activity_ids"),
          provisional_role: val("provisional_role"),
          contract_evidence_status: val(
            "contract_evidence_status",
          ) as "provided_pending_review",
          contract_evidence_ids: val("contract_evidence_ids")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
          renewal_date: val("renewal_date") || null,
          next_review_date: val("next_review_date") || null,
          role_verified: false,
        },
      });
    if (modal?.kind === "notice")
      act({
        type: "notice",
        record: {
          ...n,
          ...common,
          id:
            n?.id ||
            `NOTICE-v${Math.max(...s.notice_versions.map((x) => Number(x.id.replace("NOTICE-v", "")))) + 1}`,
          notice_id: "NOTICE-website",
          title: val("title"),
          version_label: val("version_label"),
          recorded_date: date,
          mapped_activity_ids: list("mapped_activity_ids"),
          purpose_summary: val("purpose_summary"),
          status: "draft",
          actual_published_notice_verified: false,
        },
      });
    if (modal?.kind === "change")
      act({
        type: "change",
        record: {
          ...common,
          id: nextId(s.change_requests, "CHG"),
          title: val("title"),
          owner_team: val("owner_team"),
          change_type: val("change_type") as "New vendor",
          activity_id: val("activity_id") || null,
          vendor_id: val("vendor_id") || null,
          notes: val("notes"),
          recorded_date: date,
          state: "new",
        },
      });
    if (modal?.kind === "assignment" && f)
      act({
        type: "assignment",
        id: f.id,
        owner_team: val("owner_team"),
        due_date: val("due_date"),
      });
    if (modal?.kind === "task")
      act({
        type: "task",
        record: {
          ...t,
          ...common,
          id: t?.id || nextId(s.remediation_actions, "TASK"),
          finding_id: val("finding_id"),
          title: val("title"),
          owner_team: val("owner_team"),
          due_date: val("due_date"),
          state: val("state") as "open",
          evidence_record_ids: t?.evidence_record_ids || [],
          submitted_for_approval: false,
        },
      });
    if (modal?.kind === "closure" && f)
      act({
        type: "closure",
        id: f.id,
        reference: val("reference"),
        note: val("note"),
      });
    if (modal?.kind === "review" && modal.id)
      act({
        type: "review",
        id: modal.id,
        target: n ? "notice" : "finding",
        decision: val("decision") as "approve",
        reason: val("reason"),
      });
  }
  function download(kind: "csv" | "json") {
    const blob = new Blob(
      [
        kind === "csv"
          ? exportCsv(s)
          : JSON.stringify(exportJson(s, new Date().toISOString()), null, 2),
      ],
      { type: kind === "csv" ? "text/csv" : "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `complira-synthetic.${kind}`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const reset = () => {
    if (confirm("Reset the fictional workspace to its original records?")) {
      try {
        setS(sessionRepository(sessionStorage).reset());
        setPersona("editor");
        sessionStorage.removeItem("complira.persona");
        setMessage("Original synthetic data restored.");
      } catch {
        setMessage("Session storage unavailable; reset could not be saved.");
      }
    }
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          Complira<span>PrivacyOps</span>
        </div>
        <div className="workspace-label">MapleStack SaaS · Demo</div>
        <nav aria-label="Main navigation">
          {NAV.map(([id, label]) => (
            <Link
              key={id}
              href={`/demo/${id}`}
              aria-current={module === id ? "page" : undefined}
              className={module === id ? "active" : ""}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          Fictional workspace
          <br />
          Seven-module synthetic MVP
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <span>{NAV.find((x) => x[0] === module)?.[1]}</span>
          <label>
            Demo persona{" "}
            <select
              aria-label="Demo persona"
              value={persona}
              onChange={(e) => {
                setPersona(e.target.value as Persona);
                sessionStorage.setItem("complira.persona", e.target.value);
              }}
            >
              <option value="editor">Editor (Demo)</option>
              <option value="reviewer">Reviewer (Demo)</option>
            </select>
          </label>
        </header>
        <main id="content">
          <div className="notice-bar">
            <b>SYNTHETIC DATA ONLY</b> · Fictional MapleStack records. Persona
            switching is a simulation, not authentication. No real uploads or
            personal data.
          </div>
          <div role="status" className="status-message">
            {message}
          </div>
          {!ready ? (
            <p>Loading synthetic workspace…</p>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    PRIVACY OPERATIONS · HUMAN REVIEW
                  </div>
                  <h1>{NAV.find((x) => x[0] === module)?.[1]}</h1>
                  <p>Keep processing, vendors, notices and actions aligned.</p>
                </div>
                <div className="heading-actions">
                  {module === "overview" ? (
                    buttons([
                      ["+ New change", () => open("change")],
                      ["Reset demo", reset],
                    ])
                  ) : module === "processing" ? (
                    <button
                      className="btn primary"
                      onClick={() => open("activity")}
                    >
                      + Add activity
                    </button>
                  ) : module === "vendors" ? (
                    <button
                      className="btn primary"
                      onClick={() => open("vendor")}
                    >
                      + Add vendor
                    </button>
                  ) : module === "notices" ? (
                    <button
                      className="btn primary"
                      onClick={() => open("notice")}
                    >
                      + Create draft
                    </button>
                  ) : module === "changes" ? (
                    <button
                      className="btn primary"
                      onClick={() => open("change")}
                    >
                      + New change
                    </button>
                  ) : module === "findings" ? (
                    <button
                      className="btn primary"
                      onClick={() => open("task")}
                    >
                      + Record action
                    </button>
                  ) : null}
                </div>
              </div>
              {["processing", "vendors", "changes", "findings"].includes(
                module,
              ) && (
                <div className="toolbar">
                  <input
                    aria-label="Search records"
                    placeholder="Search names, IDs or owners"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              )}
              {module === "overview" && (
                <>
                  <div className="metrics">
                    {[
                      [
                        "Processing activities",
                        s.processing_activities.filter((x) => !x.archived)
                          .length,
                      ],
                      ["Vendors", s.vendors.filter((x) => !x.archived).length],
                      [
                        "Open findings",
                        s.findings.filter((x) => x.state !== "closed").length,
                      ],
                      [
                        "Open actions",
                        s.remediation_actions.filter(
                          (x) => x.state !== "closed",
                        ).length,
                      ],
                    ].map(([label, value]) => (
                      <div className="metric" key={label}>
                        <div className="label">{label}</div>
                        <div className="value">{value}</div>
                        <div className="desc">Live synthetic register</div>
                      </div>
                    ))}
                  </div>
                  <div className="layout">
                    <Panel title="Needs attention">
                      {s.findings
                        .filter((x) => x.state !== "closed")
                        .slice(0, 4)
                        .map((x) => (
                          <div className="queue-item" key={x.id}>
                            <span className="queue-icon">!</span>
                            <div>
                              <button
                                className="text-btn"
                                onClick={() => open("finding", x.id)}
                              >
                                {x.title}
                              </button>
                              <p>
                                {x.id} · {x.owner_team} ·{" "}
                                {x.due_date || "Unassigned"}
                              </p>
                            </div>
                            <span className="pill">{x.suggested_severity}</span>
                          </div>
                        ))}
                    </Panel>
                    <Panel title="Workspace health">
                      <p>
                        Records with owners:{" "}
                        {
                          s.processing_activities.filter((x) => x.owner_team)
                            .length
                        }{" "}
                        / {s.processing_activities.length}
                      </p>
                      <p>
                        Vendor evidence provided:{" "}
                        {
                          s.vendors.filter((x) =>
                            x.contract_evidence_status.startsWith("provided"),
                          ).length
                        }{" "}
                        / {s.vendors.length}
                      </p>
                      <div className="aside-note">
                        Register checks suggest human review. Source documents,
                        legal sufficiency and live security controls have not
                        been verified.
                      </div>
                    </Panel>
                  </div>
                  <Panel title="Recent change requests">
                    <Table
                      headers={["ID", "Change", "Owner", "State", "Action"]}
                      rows={s.change_requests
                        .slice()
                        .reverse()
                        .slice(0, 4)
                        .map((x) => [
                          x.id,
                          x.title,
                          x.owner_team,
                          fmt(x.state),
                          <button
                            key="check"
                            onClick={() => open("checks", x.id)}
                          >
                            Review checks
                          </button>,
                        ])}
                    />
                  </Panel>
                </>
              )}
              {module === "processing" && (
                <Panel title="Processing activity inventory">
                  <Table
                    headers={[
                      "Activity",
                      "Purpose & data",
                      "Vendor / system",
                      "Owner / retention",
                      "State",
                      "Actions",
                    ]}
                    rows={s.processing_activities.filter(matching).map((x) => [
                      <div key="name">
                        <b>{x.id}</b>
                        <p>{x.name}</p>
                      </div>,
                      <div key="purpose">
                        {x.purpose}
                        <p className="muted">{x.data_categories.join(", ")}</p>
                      </div>,
                      <div key="system">
                        {x.vendor_ids.join(", ")}
                        <p>{x.source_system}</p>
                      </div>,
                      <div key="owner">
                        {x.owner_team}
                        <p>{x.retention_description}</p>
                      </div>,
                      x.archived ? "Archived" : fmt(x.review_status),
                      buttons([
                        ["Edit", () => open("activity", x.id)],
                        [
                          x.archived ? "Restore" : "Archive",
                          () =>
                            act({
                              type: "archive",
                              collection: "processing_activities",
                              id: x.id,
                            }),
                        ],
                      ]),
                    ])}
                  />
                </Panel>
              )}
              {module === "vendors" && (
                <Panel title="Vendor and contract register">
                  <Table
                    headers={[
                      "Vendor",
                      "Activities / owner",
                      "Provisional role",
                      "Contract evidence",
                      "Renewal / review",
                      "Actions",
                    ]}
                    rows={s.vendors.filter(matching).map((x) => [
                      <div key="name">
                        <b>{x.id}</b>
                        <p>{x.name}</p>
                        {x.archived && <span>Archived</span>}
                      </div>,
                      <div key="links">
                        {x.activity_ids.join(", ")}
                        <p>{x.owner_team}</p>
                      </div>,
                      x.provisional_role,
                      <div key="evidence">
                        {fmt(x.contract_evidence_status)}
                        <p>
                          {x.contract_evidence_ids.join(", ") ||
                            "No evidence references"}
                        </p>
                      </div>,
                      `${x.renewal_date || "No renewal"} / ${x.next_review_date || "No review date"}`,
                      buttons([
                        ["Edit", () => open("vendor", x.id)],
                        [
                          x.archived ? "Restore" : "Archive",
                          () =>
                            act({
                              type: "archive",
                              collection: "vendors",
                              id: x.id,
                            }),
                        ],
                      ]),
                    ])}
                  />
                  <div className="aside-note">
                    Evidence not established from register does not mean no
                    contract exists. Obtain and verify evidence.
                  </div>
                </Panel>
              )}
              {module === "notices" && (
                <>
                  <Panel title="Version history">
                    <Table
                      headers={[
                        "Version",
                        "Title",
                        "Purpose map",
                        "Status",
                        "Actions",
                      ]}
                      rows={s.notice_versions.map((x) => [
                        x.version_label,
                        x.title,
                        x.mapped_activity_ids.join(", "),
                        fmt(x.status),
                        buttons([
                          ["Compare", () => open("compare", x.id)],
                          ...(["draft", "rejected"].includes(x.status)
                            ? ([
                                ["Edit", () => open("notice", x.id)],
                                [
                                  "Submit review",
                                  () =>
                                    act({ type: "submit_notice", id: x.id }),
                                ],
                              ] as [string, () => void][])
                            : []),
                          ...(x.status === "pending_review"
                            ? ([["Review", () => open("review", x.id)]] as [
                                string,
                                () => void,
                              ][])
                            : []),
                        ]),
                      ])}
                    />
                  </Panel>
                  <Panel title="Current recorded purpose map">
                    <p>
                      {notice?.version_label} ·{" "}
                      {notice?.mapped_activity_ids.join(", ")}
                    </p>
                    <div className="aside-note">
                      Current means current inside this synthetic register only.
                      Actual publication and legal adequacy have not been
                      verified.
                    </div>
                  </Panel>
                </>
              )}
              {module === "changes" && (
                <Panel title="Change log">
                  <Table
                    headers={[
                      "ID / change",
                      "Type",
                      "Owner",
                      "Linked records",
                      "Status",
                      "Actions",
                    ]}
                    rows={s.change_requests
                      .filter(matching)
                      .slice()
                      .reverse()
                      .map((x) => [
                        `${x.id} · ${x.title}`,
                        x.change_type,
                        x.owner_team,
                        `${x.activity_id || "No activity"} / ${x.vendor_id || "No vendor"}`,
                        fmt(x.state),
                        buttons([
                          ["Review checks", () => open("checks", x.id)],
                        ]),
                      ])}
                  />
                </Panel>
              )}
              {module === "findings" && (
                <>
                  <Panel title="Findings register">
                    <Table
                      headers={[
                        "Finding",
                        "Subject",
                        "Owner / due date",
                        "State",
                        "Action",
                      ]}
                      rows={s.findings
                        .filter(matching)
                        .slice()
                        .reverse()
                        .map((x) => [
                          `${x.id} · ${x.title}`,
                          x.subject_id,
                          `${x.owner_team} / ${x.due_date || "No date"}`,
                          fmt(x.state),
                          <button
                            key="review"
                            onClick={() => open("finding", x.id)}
                          >
                            Review
                          </button>,
                        ])}
                    />
                  </Panel>
                  <Panel title="Remediation actions">
                    {s.remediation_actions.map((x) => (
                      <div className="queue-item" key={x.id}>
                        <div>
                          <b>
                            {x.id} · {x.title}
                          </b>
                          <p>
                            {x.finding_id} · {x.owner_team} ·{" "}
                            {x.due_date || "No date"} · {fmt(x.state)}
                          </p>
                        </div>
                        {!["closed", "pending_closure"].includes(x.state) && (
                          <button onClick={() => open("task", x.id)}>
                            Edit action
                          </button>
                        )}
                      </div>
                    ))}
                  </Panel>
                </>
              )}
              {module === "reports" && (
                <>
                  <Panel title="Current-state exports">
                    <p>
                      SYNTHETIC DATA ONLY — not an audit, certification or legal
                      opinion.
                    </p>
                    <p>
                      Scope: fictional MapleStack register metadata. Not
                      reviewed: real documents, actual notices, live systems,
                      security controls, legal sufficiency.
                    </p>
                    {buttons([
                      ["Export CSV", () => download("csv")],
                      ["Export JSON", () => download("json")],
                      ["Print / PDF", () => window.print()],
                      ["Reset demo", reset],
                    ])}
                  </Panel>
                  <Panel title="Findings and review decisions">
                    <Table
                      headers={[
                        "Finding",
                        "Owner",
                        "State",
                        "Suggested action",
                        "Decision history",
                      ]}
                      rows={s.findings.map((x) => [
                        `${x.id}: ${x.title}`,
                        x.owner_team,
                        fmt(x.state),
                        x.suggested_action,
                        s.review_decisions
                          .filter((d) => d.subject_id === x.id)
                          .map(
                            (d) =>
                              `${d.decision} · ${d.reason} · ${d.persona} · ${d.timestamp}`,
                          )
                          .join("; ") || "Not reviewed",
                      ])}
                    />
                  </Panel>
                  <Panel title="Evaluation history">
                    {s.audit_events.map((x) => (
                      <p key={x.id}>
                        {x.action} · {x.subject_id} · {x.persona} ·{" "}
                        {x.timestamp}
                      </p>
                    ))}
                  </Panel>
                </>
              )}
              <footer className="footer-note">
                Complira PrivacyOps · No source documents verified · No claimed
                compliance verification
              </footer>
            </>
          )}
        </main>
      </div>
      <dialog
        ref={dialog}
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModal(null);
        }}
        aria-labelledby="dialog-title"
      >
        <div className="modal-head">
          <h2 id="dialog-title">
            {modal?.kind === "checks"
              ? `Review checks · ${c?.id}`
              : modal?.kind === "finding"
                ? `${f?.id} · ${f?.title}`
                : modal?.kind === "compare"
                  ? `Compare ${n?.version_label}`
                  : modal?.kind === "review"
                    ? `Review ${modal.id}`
                    : `${modal?.id ? "Edit" : "Create"} ${modal?.kind || ""}`}
          </h2>
          <button aria-label="Close dialog" onClick={() => setModal(null)}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p className="aside-note">
            SYNTHETIC DATA ONLY · Metadata suggestions require human review.
          </p>
          {modal?.kind === "checks" && c && (
            <>
              <p>
                {c.title} · {c.activity_id} → {c.vendor_id} → Human review
              </p>
              <p>{c.notes}</p>
              <ul className="checklist">
                {evaluate(s, c, date).map((r) => (
                  <li key={r.rule_id}>
                    <div>
                      <b>{r.rule_id}</b>
                      <p>Source A: {r.source_a_metadata}</p>
                      <p>
                        Source B / absence: {r.source_b_metadata_or_absence}
                      </p>
                      <p>
                        {r.suggested_severity} · {r.suggested_action}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              {evaluate(s, c, date).length === 0 && (
                <p>
                  No metadata mismatch detected; human review may still be
                  required.
                </p>
              )}
              <button
                className="btn primary"
                onClick={() => act({ type: "record", id: c.id })}
              >
                Record review request
              </button>
            </>
          )}
          {modal?.kind === "compare" && n && (
            <>
              <p>
                Status: {fmt(n.status)} · Recorded {n.recorded_date}
              </p>
              <p>{n.purpose_summary}</p>
              <p>
                Added:{" "}
                {n.mapped_activity_ids
                  .filter((id) => !notice?.mapped_activity_ids.includes(id))
                  .join(", ") || "None"}
              </p>
              <p>
                Removed:{" "}
                {notice?.mapped_activity_ids
                  .filter((id) => !n.mapped_activity_ids.includes(id))
                  .join(", ") || "None"}
              </p>
              <p>
                Metadata comparison only; actual notice wording is not verified.
              </p>
              {s.review_decisions
                .filter((d) => d.subject_id === n.id)
                .map((d) => (
                  <p key={d.id}>
                    {d.decision} · {d.reason} · {d.persona} · {d.timestamp}
                  </p>
                ))}
            </>
          )}
          {modal?.kind === "finding" && f && (
            <>
              <dl className="kv">
                <dt>Suggested severity</dt>
                <dd>{f.suggested_severity}</dd>
                <dt>State</dt>
                <dd>{fmt(f.state)}</dd>
                <dt>Owner / due</dt>
                <dd>
                  {f.owner_team} / {f.due_date || "Unassigned"}
                </dd>
                <dt>Source A</dt>
                <dd>{f.source_a_metadata}</dd>
                <dt>Source B / absence</dt>
                <dd>{f.source_b_metadata_or_absence}</dd>
                <dt>Proposed action</dt>
                <dd>{f.suggested_action}</dd>
                <dt>Reference (unverified)</dt>
                <dd>{f.provision_text_unverified}</dd>
              </dl>
              <h3>Evidence and decision history</h3>
              {s.evidence_records
                .filter((x) => x.finding_id === f.id)
                .map((x) => (
                  <p key={x.id}>
                    {x.reference} · {x.note} · {x.timestamp} · source not
                    verified
                  </p>
                ))}
              {s.review_decisions
                .filter((x) => x.subject_id === f.id)
                .map((x) => (
                  <p key={x.id}>
                    {x.decision} · {x.reason} · {x.persona} · {x.timestamp}
                  </p>
                ))}
              {buttons([
                ["Assign / set due date", () => open("assignment", f.id)],
                ...(f.state !== "closed" &&
                f.state !== "pending_closure" &&
                persona === "editor"
                  ? ([["Request closure", () => open("closure", f.id)]] as [
                      string,
                      () => void,
                    ][])
                  : []),
                ...(persona === "reviewer" &&
                ["closed", "pending_closure"].includes(f.state)
                  ? ([
                      [
                        f.state === "closed" ? "Reopen" : "Review closure",
                        () => open("review", f.id),
                      ],
                    ] as [string, () => void][])
                  : []),
              ])}
              <p>
                Assignments and due dates are managed in linked remediation
                actions.
              </p>
            </>
          )}
          {modal &&
            [
              "activity",
              "vendor",
              "notice",
              "change",
              "task",
              "closure",
              "review",
              "assignment",
            ].includes(modal.kind) && (
              <form key={`${modal.kind}-${modal.id}`} onSubmit={submit}>
                <div className="formgrid">
                  {modal.kind === "activity" && (
                    <>
                      <Field
                        label="Activity name"
                        name="name"
                        value={a?.name}
                        required
                      />
                      <Field
                        label="Purpose"
                        name="purpose"
                        value={a?.purpose}
                        required
                      />
                      <Field
                        label="Data categories (comma separated)"
                        name="data_categories"
                        value={a?.data_categories.join(", ")}
                      />
                      <Field
                        label="Source system"
                        name="source_system"
                        value={a?.source_system}
                      />
                      <Field
                        label="Responsible owner"
                        name="owner_team"
                        value={a?.owner_team}
                      />
                      <Field
                        label="Retention description"
                        name="retention_description"
                        value={a?.retention_description || "Not established"}
                      />
                      {links("vendor_ids", s.vendors, a?.vendor_ids || [])}
                    </>
                  )}
                  {modal.kind === "vendor" && (
                    <>
                      <Field
                        label="Vendor name"
                        name="name"
                        value={v?.name}
                        required
                      />
                      <Field
                        label="Responsible owner"
                        name="owner_team"
                        value={v?.owner_team}
                      />
                      <Select
                        label="Provisional role"
                        name="provisional_role"
                        value={v?.provisional_role || "Undetermined"}
                        options={[
                          "Undetermined",
                          "Processor (provisional)",
                          "Fiduciary (provisional)",
                        ].map((x) => [x, x])}
                      />
                      <Select
                        label="Contract evidence status"
                        name="contract_evidence_status"
                        value={
                          v?.contract_evidence_status ||
                          "not_established_from_register"
                        }
                        options={[
                          "not_established_from_register",
                          "provided_pending_review",
                        ].map((x) => [x, fmt(x)])}
                      />
                      <Field
                        label="Synthetic contract evidence references (comma separated)"
                        name="contract_evidence_ids"
                        value={v?.contract_evidence_ids.join(", ")}
                      />
                      <Field
                        label="Renewal date"
                        name="renewal_date"
                        type="date"
                        value={v?.renewal_date || ""}
                      />
                      <Field
                        label="Next review date"
                        name="next_review_date"
                        type="date"
                        value={v?.next_review_date || ""}
                      />
                      {links(
                        "activity_ids",
                        s.processing_activities,
                        v?.activity_ids || [],
                      )}
                    </>
                  )}
                  {modal.kind === "notice" && (
                    <>
                      <Field
                        label="Notice title"
                        name="title"
                        value={n?.title || "Website privacy notice"}
                        required
                      />
                      <Field
                        label="Version label"
                        name="version_label"
                        value={
                          n?.version_label ||
                          `v${s.notice_versions.length + 1}.0`
                        }
                        required
                      />
                      <Area
                        label="Purpose summary"
                        name="purpose_summary"
                        value={n?.purpose_summary || notice?.purpose_summary}
                      />
                      {links(
                        "mapped_activity_ids",
                        s.processing_activities,
                        n?.mapped_activity_ids ||
                          notice?.mapped_activity_ids ||
                          [],
                      )}
                    </>
                  )}
                  {modal.kind === "change" && (
                    <>
                      <Select
                        label="Change type"
                        name="change_type"
                        value="New vendor"
                        options={[
                          "New vendor",
                          "New data field",
                          "New purpose",
                          "Contract renewal",
                          "Updated notice",
                        ].map((x) => [x, x])}
                      />
                      <Field label="Change title" name="title" required />
                      <Field
                        label="Responsible owner"
                        name="owner_team"
                        value="Engineering"
                        required
                      />
                      <Select
                        label="Linked processing activity"
                        name="activity_id"
                        options={[
                          ["", "No linked activity"],
                          ...s.processing_activities
                            .filter((x) => !x.archived)
                            .map((x) => [x.id, `${x.id} · ${x.name}`]),
                        ]}
                      />
                      <Select
                        label="Linked vendor"
                        name="vendor_id"
                        options={[
                          ["", "No linked vendor"],
                          ...s.vendors
                            .filter((x) => !x.archived)
                            .map((x) => [x.id, `${x.id} · ${x.name}`]),
                        ]}
                      />
                      <Area label="Review notes" name="notes" />
                    </>
                  )}
                  {modal.kind === "task" && (
                    <>
                      <Select
                        label="Linked finding"
                        name="finding_id"
                        value={t?.finding_id || s.findings[0]?.id}
                        options={s.findings.map((x) => [
                          x.id,
                          `${x.id} · ${x.title}`,
                        ])}
                      />
                      <Field
                        label="Action title"
                        name="title"
                        value={t?.title}
                        required
                      />
                      <Field
                        label="Responsible owner"
                        name="owner_team"
                        value={t?.owner_team}
                        required
                      />
                      <Field
                        label="Due date"
                        name="due_date"
                        type="date"
                        value={t?.due_date}
                      />
                      <Select
                        label="Status"
                        name="state"
                        value={t?.state || "open"}
                        options={["open", "in_progress", "blocked"].map((x) => [
                          x,
                          fmt(x),
                        ])}
                      />
                    </>
                  )}
                  {modal.kind === "assignment" && (
                    <>
                      <Field
                        label="Responsible owner"
                        name="owner_team"
                        value={f?.owner_team}
                        required
                      />
                      <Field
                        label="Due date"
                        name="due_date"
                        type="date"
                        value={f?.due_date}
                      />
                    </>
                  )}
                  {modal.kind === "closure" && (
                    <>
                      <Field
                        label="Synthetic evidence reference"
                        name="reference"
                        value="SYNTH-EVIDENCE-v1"
                        required
                      />
                      <Area
                        label="How the action was addressed"
                        name="note"
                        required
                      />
                    </>
                  )}
                  {modal.kind === "review" && (
                    <>
                      <Select
                        label="Decision"
                        name="decision"
                        value={f?.state === "closed" ? "reopen" : "approve"}
                        options={(f?.state === "closed"
                          ? ["reopen"]
                          : ["approve", "reject"]
                        ).map((x) => [x, fmt(x)])}
                      />
                      <Area label="Reviewer rationale" name="reason" required />
                      <p>
                        Reviewer simulation only. Approval updates this
                        fictional register, not a public notice or legal status.
                      </p>
                    </>
                  )}
                </div>
                <div className="modal-foot">
                  <button type="button" onClick={() => setModal(null)}>
                    Cancel
                  </button>
                  <button className="btn primary" type="submit">
                    {modal.kind === "closure"
                      ? "Submit to reviewer"
                      : modal.kind === "review"
                        ? "Record decision"
                        : modal.kind === "notice"
                          ? "Save draft"
                          : modal.kind === "change"
                            ? "Create change"
                            : modal.kind === "activity"
                              ? "Save activity"
                              : modal.kind === "vendor"
                                ? "Save vendor"
                                : modal.kind === "assignment"
                                  ? "Save assignment"
                                  : "Save action"}
                  </button>
                </div>
              </form>
            )}
          <div role="alert">{message}</div>
        </div>
      </dialog>
    </div>
  );
}
