"use client";
import Link from "next/link";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import ChangeWizard from "../components/change-wizard";
import CommandSearch from "../components/command-search";
import type { LiveWorkspace } from "../server/workspace";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  DEMO_CHECK_DATE,
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
type Modal = {
  kind: string;
  id?: string;
  activityId?: string;
  vendorId?: string;
};
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
function ActionButtons({
  items,
  readOnly = false,
}: {
  items: [string, () => void][];
  readOnly?: boolean;
}) {
  return (
    <div className="row-actions">
      {items
        .filter(
          ([text]) =>
            !readOnly ||
            ![
              "Edit",
              "Archive",
              "Restore",
              "Edit change",
              "Review change",
              "Submit review",
              "Assign / set due date",
              "Request closure",
              "Review closure",
              "Reopen",
            ].includes(text),
        )
        .map(([text, fn]) => (
          <button className="text-btn" key={text} onClick={fn}>
            {text}
          </button>
        ))}
    </div>
  );
}
const subscribe = () => () => {};
export default function Workspace({
  module,
  live,
}: {
  module: string;
  live?: LiveWorkspace;
}) {
  const client = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return client ? (
    <ReadyWorkspace module={module} live={live} />
  ) : (
    <p>
      {live ? "Loading private workspace…" : "Loading synthetic workspace…"}
    </p>
  );
}
function ReadyWorkspace({
  module,
  live,
}: {
  module: string;
  live?: LiveWorkspace;
}) {
  const router = useRouter();
  const [liveVersion, setLiveVersion] = useState(live?.version || 1),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  const retry = useRef<{ body: string; id: string } | null>(null);
  const [reportTime] = useState(() => new Date().toISOString());
  const mode = live ? "app" : "demo";
  const href = (section: string, id?: string) =>
    `/${mode}/${section}${live ? `?org=${live.organizationId}${id ? `&record=${id}` : ""}` : id ? `?record=${id}` : ""}`;
  const [loaded] = useState(() => {
    try {
      return {
        state: live?.state || sessionRepository(sessionStorage).load(),
        warning: "",
      };
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
      (
        live
          ? live.role === "reviewer"
          : sessionStorage.getItem("complira.persona") === "reviewer"
      )
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
  const closeModal = () => {
    if (dirty && !confirm("Discard unsaved changes?")) return;
    setDirty(false);
    setModal(null);
  };
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const id = new URLSearchParams(window.location.search).get("record");
      if (id) {
        const kind = id.startsWith("ACT")
          ? "activity-detail"
          : id.startsWith("VEN")
            ? "vendor-detail"
            : id.startsWith("FND")
              ? "finding"
              : id.startsWith("NOTICE")
                ? "compare"
                : id.startsWith("TASK")
                  ? "task"
                  : "checks";
        setModal({ kind, id });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [module]);
  const act = async (cmd: Command): Promise<boolean> => {
    if (busy) return false;
    setBusy(true);
    setMessage("Saving…");
    try {
      if (live) {
        const body = JSON.stringify({
          organizationId: live.organizationId,
          expectedVersion: liveVersion,
          command: cmd,
        });
        if (retry.current?.body !== body)
          retry.current = { body, id: crypto.randomUUID() };
        const response = await fetch("/api/live/mutations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...JSON.parse(body),
            requestId: retry.current.id,
          }),
        });
        const data = await response.json();
        if (!response.ok)
          throw Error(
            data.error +
              (data.issues
                ? " · " +
                  data.issues
                    .map((i: { message: string }) => i.message)
                    .join("; ")
                : ""),
          );
        setS(data.state);
        setLiveVersion(data.version);
        retry.current = null;
      } else {
        const next = transition(
          s,
          cmd.type === "record"
            ? { ...cmd, evaluation_date: DEMO_CHECK_DATE }
            : cmd,
          persona,
          new Date().toISOString(),
        );
        sessionRepository(sessionStorage).save(next);
        setS(next);
      }
      setDirty(false);
      setModal(null);
      setMessage(
        live ? "Private register saved." : "Synthetic register updated.",
      );
      return true;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Operation failed");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const open = (kind: string, id?: string) => {
    setMessage("");
    setDirty(false);
    setModal({ kind, id });
  };
  const matching = (x: unknown) =>
    JSON.stringify(x).toLowerCase().includes(query.toLowerCase());
  const date = live ? new Date().toISOString().slice(0, 10) : DEMO_CHECK_DATE;
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
    const common = { version: (a || v || n || t)?.version || 1 };
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
          retention_evidence_reference: val("retention_evidence_reference"),
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
    if (live) {
      const anchor = document.createElement("a");
      anchor.href = `/api/live/reports?organizationId=${live.organizationId}&format=${kind}`;
      anchor.download = `complira-private-report.${kind}`;
      anchor.click();
      return;
    }
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
  const printReport = async () => {
    if (!live) {
      window.print();
      return;
    }
    if (busy) return;
    setBusy(true);
    setMessage("Loading the persisted report…");
    try {
      const response = await fetch(
        `/api/live/reports?organizationId=${live.organizationId}&format=json`,
        { cache: "no-store" },
      );
      const report = await response.json();
      if (!response.ok) throw Error(report.error || "Report unavailable");
      flushSync(() => {
        setS(report.workspace);
        setLiveVersion(report.workspace_version);
      });
      setMessage("Report reflects persisted customer records.");
      window.print();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Report unavailable");
    } finally {
      setBusy(false);
    }
  };
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
      <a href="#content" className="skip-link">
        Skip to workspace
      </a>
      <aside className="sidebar">
        <div className="brand">
          Complira<span>PrivacyOps</span>
        </div>
        <div className="workspace-label">
          {live ? live.organizationName : "MapleStack SaaS · Demo"}
        </div>
        <nav aria-label="Main navigation">
          {NAV.map(([id, label]) => (
            <Link
              key={id}
              href={href(id)}
              onClick={(e) => {
                if (dirty && !confirm("Discard unsaved changes?"))
                  e.preventDefault();
              }}
              aria-current={module === id ? "page" : undefined}
              className={module === id ? "active" : ""}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {live ? (
            <>
              <Link href="/app/setup">Switch organization</Link>
              <br />
              <Link href={href("members")}>Manage members</Link>
              <br />
              <button
                onClick={async () => {
                  await fetch("/api/live/signout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: "{}",
                  });
                  router.replace("/login");
                  router.refresh();
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              Fictional workspace
              <br />
              Seven-module synthetic MVP
            </>
          )}
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <span>{NAV.find((x) => x[0] === module)?.[1]}</span>
          <CommandSearch
            state={s}
            onSelect={(section, id) => {
              if (section === module && id) {
                open(
                  id.startsWith("ACT")
                    ? "activity-detail"
                    : id.startsWith("VEN")
                      ? "vendor-detail"
                      : id.startsWith("FND")
                        ? "finding"
                        : id.startsWith("NOTICE")
                          ? "compare"
                          : id.startsWith("TASK")
                            ? "task"
                            : "checks",
                  id,
                );
              } else router.push(href(section, id));
            }}
          />
          {live ? (
            <span className="role-badge">{live.role} · Private workspace</span>
          ) : (
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
          )}
        </header>
        <main id="content">
          <div className="notice-bar">
            {live ? (
              <>
                <b>PRIVATE METADATA BETA</b> · Record metadata only. File
                uploads are disabled. Customer signoff required.
              </>
            ) : (
              <>
                <b>SYNTHETIC DATA ONLY</b> · Fictional MapleStack records.
                Persona switching is SIMULATION ONLY, not authentication. No
                real uploads or personal data. Checks use {DEMO_CHECK_DATE} for
                repeatable fixture reviews.
              </>
            )}
          </div>
          {live?.role === "viewer" && (
            <p className="aside-note">
              Read-only membership: mutations are refused by the server.
            </p>
          )}
          <div role="status" aria-live="polite" className="status-message">
            {message}{" "}
            {message.includes("conflict") && (
              <button onClick={() => window.location.reload()}>
                Reload current register
              </button>
            )}
          </div>
          {!ready ? (
            <p>
              {live
                ? "Loading private workspace…"
                : "Loading synthetic workspace…"}
            </p>
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
                    <>
                      <button
                        className="btn primary"
                        onClick={() =>
                          open(
                            s.processing_activities.length
                              ? "change"
                              : "activity",
                          )
                        }
                      >
                        {s.processing_activities.length
                          ? "+ New change"
                          : "+ Add activity"}
                      </button>
                      {!live && <button onClick={reset}>Reset demo</button>}
                    </>
                  ) : module === "processing" ? (
                    <button
                      className="btn primary"
                      disabled={busy || live?.role === "viewer"}
                      onClick={() => open("activity")}
                    >
                      + Add activity
                    </button>
                  ) : module === "vendors" ? (
                    <button
                      className="btn primary"
                      disabled={busy || live?.role === "viewer"}
                      onClick={() => open("vendor")}
                    >
                      + Add vendor
                    </button>
                  ) : module === "notices" ? (
                    <button
                      className="btn primary"
                      disabled={busy || live?.role === "viewer"}
                      onClick={() => open("notice")}
                    >
                      + Create draft
                    </button>
                  ) : module === "changes" ? (
                    <button
                      className="btn primary"
                      disabled={busy || live?.role === "viewer"}
                      onClick={() => open("change")}
                    >
                      + New change
                    </button>
                  ) : module === "findings" ? (
                    <button
                      className="btn primary"
                      disabled={busy || live?.role === "viewer"}
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
                  <section className="hero-review">
                    <div>
                      <div className="eyebrow">YOUR NEXT PRIVACY REVIEW</div>
                      <h2>
                        {s.processing_activities.length
                          ? "A product or vendor changed? Start with its records."
                          : "Build your first connected register"}
                      </h2>
                      <p>
                        {s.processing_activities.length
                          ? "Describe the change, link its sources and preview the review work."
                          : "Add a processing activity, link its vendor, then review a change. Your register starts empty; no sample customer data is inserted."}
                      </p>
                      <p>
                        <b>
                          {
                            s.findings.filter(
                              (f) => f.state === "pending_closure",
                            ).length
                          }
                        </b>{" "}
                        closure requests awaiting independent review ·{" "}
                        <b>
                          {
                            s.remediation_actions.filter(
                              (t) =>
                                t.state !== "closed" &&
                                t.due_date &&
                                t.due_date < date,
                            ).length
                          }
                        </b>{" "}
                        overdue actions
                      </p>
                    </div>
                  </section>
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
                        <div className="desc">
                          {live
                            ? "Persisted customer records"
                            : "Live synthetic register"}
                        </div>
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
                    <Panel title="Due reviews and next actions">
                      {s.vendors
                        .filter(
                          (v) =>
                            v.next_review_date && v.next_review_date <= date,
                        )
                        .map((v) => (
                          <p key={v.id}>
                            <button
                              className="text-btn"
                              onClick={() => open("vendor-detail", v.id)}
                            >
                              {v.name} · Review due {v.next_review_date}
                            </button>
                          </p>
                        ))}
                      {s.remediation_actions
                        .filter((t) => t.state !== "closed")
                        .slice(0, 3)
                        .map((t) => (
                          <p key={t.id}>
                            <button
                              className="text-btn"
                              onClick={() => open("task", t.id)}
                            >
                              {t.title}
                            </button>
                            <br />
                            <small>
                              {t.owner_team} · {t.due_date || "Assign due date"}
                            </small>
                          </p>
                        ))}
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
                        <p>
                          <button
                            className="text-btn"
                            onClick={() => open("activity-detail", x.id)}
                          >
                            {x.name}
                          </button>
                        </p>
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
                      <ActionButtons
                        readOnly={live?.role === "viewer"}
                        key="actions"
                        items={[
                          ["Edit", () => open("activity", x.id)],
                          [
                            "Review change",
                            () => {
                              setDirty(false);
                              setModal({ kind: "change", activityId: x.id });
                            },
                          ],
                          [
                            x.archived ? "Restore" : "Archive",
                            () =>
                              act({
                                type: "archive",
                                collection: "processing_activities",
                                id: x.id,
                              }),
                          ],
                        ]}
                      />,
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
                        <p>
                          <button
                            className="text-btn"
                            onClick={() => open("vendor-detail", x.id)}
                          >
                            {x.name}
                          </button>
                        </p>
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
                      <ActionButtons
                        readOnly={live?.role === "viewer"}
                        key="actions"
                        items={[
                          ["Edit", () => open("vendor", x.id)],
                          [
                            "Review change",
                            () => {
                              setDirty(false);
                              setModal({ kind: "change", vendorId: x.id });
                            },
                          ],
                          [
                            x.archived ? "Restore" : "Archive",
                            () =>
                              act({
                                type: "archive",
                                collection: "vendors",
                                id: x.id,
                              }),
                          ],
                        ]}
                      />,
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
                        <ActionButtons
                          readOnly={live?.role === "viewer"}
                          key="actions"
                          items={[
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
                          ]}
                        />,
                      ])}
                    />
                  </Panel>
                  <Panel title="Current recorded purpose map">
                    <p>
                      {notice?.version_label} ·{" "}
                      {notice?.mapped_activity_ids.join(", ")}
                    </p>
                    <div className="aside-note">
                      Current means current inside this{" "}
                      {live ? "customer" : "synthetic"} register only. Actual
                      publication and legal adequacy have not been verified.
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
                        <ActionButtons
                          readOnly={live?.role === "viewer"}
                          key="actions"
                          items={[
                            ["Review checks", () => open("checks", x.id)],
                            ["Edit change", () => open("change", x.id)],
                          ]}
                        />,
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
                      {live
                        ? "PRIVATE CUSTOMER METADATA"
                        : "SYNTHETIC DATA ONLY"}{" "}
                      — not an audit, certification or legal opinion.
                    </p>
                    <p>
                      Scope:{" "}
                      {live
                        ? "customer-supplied metadata"
                        : "fictional MapleStack register metadata"}
                      . Not reviewed: real documents, actual notices, live
                      systems, security controls, legal sufficiency.
                    </p>
                    {
                      <ActionButtons
                        readOnly={live?.role === "viewer"}
                        key="actions"
                        items={[
                          ["Export CSV", () => download("csv")],
                          ["Export JSON", () => download("json")],
                          [
                            "Print / PDF",
                            () => {
                              void printReport();
                            },
                          ],
                          ...(!live
                            ? ([["Reset demo", reset]] as [
                                string,
                                () => void,
                              ][])
                            : []),
                        ]}
                      />
                    }
                  </Panel>
                  <Panel title="Scope, as-of time and assumptions">
                    <p>
                      As of {reportTime}. Register versions are included in JSON
                      and finding versions in CSV.
                    </p>
                    <p>
                      Source fields are metadata, not reviewed document
                      excerpts. Missing source documents: not established from
                      material supplied. Legal references are unverified and
                      version-specific.
                    </p>
                    <p>
                      Outstanding actions:{" "}
                      {
                        s.remediation_actions.filter(
                          (t) => t.state !== "closed",
                        ).length
                      }
                      . Decisions: {s.review_decisions.length}. A current notice
                      is recorded here; it does not update a customer website.
                    </p>
                  </Panel>
                  <Panel title="Outstanding actions">
                    <Table
                      headers={[
                        "Action",
                        "Finding",
                        "Owner",
                        "Due",
                        "State",
                        "Version",
                      ]}
                      rows={s.remediation_actions
                        .filter((t) => t.state !== "closed")
                        .map((t) => [
                          t.title,
                          t.finding_id,
                          t.owner_team,
                          t.due_date || "Not assigned",
                          fmt(t.state),
                          t.version,
                        ])}
                    />
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
        onInput={() => setDirty(true)}
        aria-busy={busy}
        onCancel={(e) => {
          e.preventDefault();
          closeModal();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
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
          <button aria-label="Close dialog" onClick={closeModal}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p className="aside-note">
            {live ? "PRIVATE CUSTOMER METADATA" : "SYNTHETIC DATA ONLY"} ·
            Metadata suggestions require human review.
          </p>
          {modal?.kind === "change" && (
            <ChangeWizard
              key={modal.id || "new"}
              state={s}
              date={date}
              initial={c}
              activityId={modal.activityId}
              vendorId={modal.vendorId}
              busy={busy}
              onSave={act}
            />
          )}
          {modal &&
            ["activity-detail", "vendor-detail"].includes(modal.kind) &&
            (a || v) && (
              <>
                <nav aria-label="Source breadcrumbs">
                  <button className="text-btn" onClick={closeModal}>
                    Workspace
                  </button>{" "}
                  / {a ? "Processing register" : "Vendors & DPAs"} /{" "}
                  {a?.id || v?.id}
                </nav>
                <h3>{a?.name || v?.name}</h3>
                <dl className="kv">
                  {Object.entries((a || v)!)
                    .filter(([key]) => !["organization_id"].includes(key))
                    .map(([key, value]) => (
                      <div key={key}>
                        <dt>{fmt(key)}</dt>
                        <dd>
                          {Array.isArray(value)
                            ? value.join(", ")
                            : String(
                                value ??
                                  "Not established from material supplied",
                              )}
                        </dd>
                      </div>
                    ))}
                </dl>
                <h3>Linked source records</h3>
                {(a?.vendor_ids || v?.activity_ids || []).map((id) => (
                  <button
                    key={id}
                    className="text-btn"
                    onClick={() =>
                      open(
                        id.startsWith("ACT")
                          ? "activity-detail"
                          : "vendor-detail",
                        id,
                      )
                    }
                  >
                    {id}
                  </button>
                ))}
                <div className="modal-foot">
                  <button
                    onClick={() =>
                      open(a ? "activity" : "vendor", (a || v)!.id)
                    }
                  >
                    Edit record
                  </button>
                  <button
                    className="btn primary"
                    onClick={() => {
                      setDirty(false);
                      setModal({
                        kind: "change",
                        activityId: a?.id,
                        vendorId: v?.id,
                      });
                    }}
                  >
                    Review change
                  </button>
                </div>
              </>
            )}
          {modal?.kind === "checks" && c && (
            <>
              <p>
                {c.title} ·{" "}
                <button
                  className="text-btn"
                  onClick={() =>
                    open("activity-detail", c.activity_id || undefined)
                  }
                >
                  {c.activity_id || "No activity"}
                </button>{" "}
                →{" "}
                <button
                  className="text-btn"
                  onClick={() =>
                    open("vendor-detail", c.vendor_id || undefined)
                  }
                >
                  {c.vendor_id || "No vendor"}
                </button>{" "}
                → Human review
              </p>
              <p>{c.notes}</p>
              <ul className="checklist">
                {evaluate(s, c, date).map((r) => (
                  <li key={r.rule_id}>
                    <div>
                      <b>{r.rule_id}</b>
                      <p>
                        {r.subject_id} v{r.record_version} · Examined field:{" "}
                        {r.examined_field} · Owner: {r.provisional_owner}
                      </p>
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
                disabled={busy || live?.role === "viewer"}
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
                <dd>
                  {f.source_a_metadata}
                  <p>
                    <button
                      className="text-btn"
                      onClick={() =>
                        open(
                          f.subject_id.startsWith("ACT")
                            ? "activity-detail"
                            : "vendor-detail",
                          f.subject_id,
                        )
                      }
                    >
                      Open source {f.subject_id}
                    </button>
                  </p>
                </dd>
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
              {
                <ActionButtons
                  readOnly={live?.role === "viewer"}
                  key="actions"
                  items={[
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
                  ]}
                />
              }
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
              "task",
              "closure",
              "review",
              "assignment",
            ].includes(modal.kind) && (
              <form
                key={`${modal.kind}-${modal.id}`}
                onSubmit={submit}
                onInput={() => setDirty(true)}
              >
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
                      <Field
                        label="Retention evidence reference (metadata only)"
                        name="retention_evidence_reference"
                        value={a?.retention_evidence_reference || ""}
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
                        {live
                          ? "Customer-authorized reviewer decision."
                          : "Reviewer SIMULATION ONLY."}{" "}
                        Approval updates this {live ? "customer" : "fictional"}{" "}
                        register, not a public notice or legal status.
                      </p>
                    </>
                  )}
                </div>
                <div className="modal-foot">
                  <button type="button" onClick={closeModal}>
                    Cancel
                  </button>
                  <button className="btn primary" type="submit" disabled={busy}>
                    {modal.kind === "closure"
                      ? "Submit to reviewer"
                      : modal.kind === "review"
                        ? busy
                          ? "Saving…"
                          : "Record decision"
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
