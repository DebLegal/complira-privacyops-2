"use client";
import { useEffect, useRef, useState } from "react";
import type { State } from "../lib/domain";
const pages = [
  ["overview", "PrivacyOps overview"],
  ["processing", "Processing register"],
  ["vendors", "Vendors & DPAs"],
  ["notices", "Notice versions"],
  ["changes", "Change control"],
  ["findings", "Findings & actions"],
  ["reports", "Reports"],
];
export default function CommandSearch({
  state,
  onSelect,
}: {
  state: State;
  onSelect: (module: string, id?: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const entries = [
    ...pages.map(([module, label]) => ({
      module,
      label,
      id: undefined as string | undefined,
    })),
    ...(
      [
        ["processing", state.processing_activities],
        ["vendors", state.vendors],
        ["notices", state.notice_versions],
        ["changes", state.change_requests],
        ["findings", state.findings],
        ["findings", state.remediation_actions],
      ] as const
    ).flatMap(([module, records]) =>
      records.map((r) => ({
        module,
        label: `${r.id} · ${"name" in r ? r.name : r.title}`,
        id: r.id,
      })),
    ),
  ]
    .filter((x) => x.label.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 30);
  const open = () => {
    setQuery("");
    dialog.current?.showModal();
    input.current?.focus();
  };
  const close = () => {
    dialog.current?.close();
    trigger.current?.focus();
  };
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "k" &&
        !document.querySelector("dialog[open]")
      ) {
        e.preventDefault();
        trigger.current?.click();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  return (
    <>
      <button
        ref={trigger}
        className="search-launch"
        onClick={open}
        aria-label="Search pages and records"
      >
        Search pages & records <kbd>Ctrl / ⌘ K</kbd>
      </button>
      <dialog
        ref={dialog}
        aria-label="Search pages and records"
        onCancel={close}
      >
        <div className="modal-head">
          <h2>Find a page or record</h2>
          <button aria-label="Close search" onClick={close}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <input
            ref={input}
            aria-label="Search pages and actual records"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try ACT-003, InsightBeacon or Reports"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                dialog.current
                  ?.querySelector<HTMLButtonElement>(".search-result")
                  ?.focus();
              }
            }}
          />
          <p role="status">{entries.length} results</p>
          <ul className="search-results">
            {entries.map((entry, i) => (
              <li key={`${entry.module}-${entry.id || "page"}`}>
                <button
                  className="search-result"
                  onKeyDown={(e) => {
                    const buttons =
                      dialog.current?.querySelectorAll<HTMLButtonElement>(
                        ".search-result",
                      );
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                      e.preventDefault();
                      buttons?.[
                        (i +
                          (e.key === "ArrowDown" ? 1 : -1) +
                          entries.length) %
                          entries.length
                      ]?.focus();
                    }
                  }}
                  onClick={() => {
                    close();
                    onSelect(entry.module, entry.id);
                  }}
                >
                  {entry.label}
                  <small>
                    {entry.id ? "Record" : "Page"} · {entry.module}
                  </small>
                </button>
              </li>
            ))}
          </ul>
          {!entries.length && (
            <p>No records or pages match. Try a name, ID, or module.</p>
          )}
        </div>
      </dialog>
    </>
  );
}
