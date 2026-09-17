"use client";

import { useState, useTransition, type FormEvent } from "react";

import RichTextEditor from "@/components/RichTextEditor";
import { saveContractDates, saveDocument } from "@/lib/actions/documents";
import type { Role } from "@/lib/dal";
import { compareDates } from "@/lib/dates";
import type {
  ContractWindow,
  DocumentKey,
  DocumentView,
} from "@/lib/queries/documents";
import {
  contractRangeLabel,
  lastUpdatedLabel,
  partnersLabel,
} from "@/lib/view/contract";

const TITLES: Record<DocumentKey, string> = {
  vision: "Who I want to become",
  contract: "Accountability contract",
};

const PLACEHOLDERS: Record<DocumentKey, string> = {
  vision: "Write who you want to become…",
  contract: "Write your accountability contract…",
};

/** CV-02..06, CV-08..10 — one document: rendered, or the editor. */
function DocumentSection({
  document: initial,
  isOwner,
}: {
  document: DocumentView;
  isOwner: boolean;
}) {
  const [document, setDocument] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial.bodyHtml);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const headingId = `${document.key}-heading`;
  const updated = lastUpdatedLabel(document.updatedAt, document.updatedByName);

  function startEditing() {
    setDraft(document.bodyHtml);
    setError(null);
    setEditing(true);
  }

  function save() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await saveDocument(document.key, draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDocument(result.document);
      setEditing(false);
    });
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-lg font-semibold tracking-tight">
          {TITLES[document.key]}
        </h2>
        {isOwner && !editing && (
          <button
            type="button"
            onClick={startEditing}
            className="ui-hover-surface rounded-full border border-border px-4 py-1.5 text-sm font-medium"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <RichTextEditor initialHtml={document.bodyHtml} onChange={setDraft} />
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="ui-hover-solid rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-60"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="ui-hover-surface rounded-full border border-border px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : document.bodyHtml ? (
        <div
          className="doc max-w-prose"
          dangerouslySetInnerHTML={{ __html: document.bodyHtml }}
        />
      ) : (
        <p className="text-muted">
          {isOwner ? PLACEHOLDERS[document.key] : "Not written yet."}
        </p>
      )}

      {!editing && updated && <p className="text-xs text-muted">{updated}</p>}
    </section>
  );
}

/** CV-01, CV-07 — the dates under the title, editable by the owner. */
function ContractDates({
  contract: initial,
  isOwner,
}: {
  contract: ContractWindow;
  isOwner: boolean;
}) {
  const [contract, setContract] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(initial.contractStart ?? "");
  const [end, setEnd] = useState(initial.contractEnd ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    if (start && end && compareDates(end, start) < 0) {
      setError("End date can't be before start date");
      return;
    }
    startTransition(async () => {
      const result = await saveContractDates(start, end);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setContract(result.contract);
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-muted">{contractRangeLabel(contract)}</p>
        {isOwner && (
          <button
            type="button"
            onClick={() => {
              setStart(contract.contractStart ?? "");
              setEnd(contract.contractEnd ?? "");
              setError(null);
              setEditing(true);
            }}
            className="ui-hover-surface rounded-full border border-border px-3 py-1 text-xs font-medium"
          >
            Edit dates
          </button>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-border p-4"
    >
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Start date
          <input
            type="date"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            className="ui-hover-edge rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          End date
          <input
            type="date"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            className="ui-hover-edge rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="ui-hover-solid rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-60"
        >
          Save dates
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="ui-hover-surface rounded-full border border-border px-4 py-2 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/** CV-01..10 — the /contract page: dates → vision → contract → partners. */
export default function ContractView({
  role,
  contract,
  documents,
  partners,
}: {
  role: Role;
  contract: ContractWindow;
  documents: Record<DocumentKey, DocumentView>;
  partners: readonly string[];
}) {
  const isOwner = role === "owner";
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Contract</h1>
        <ContractDates contract={contract} isOwner={isOwner} />
      </div>
      <DocumentSection document={documents.vision} isOwner={isOwner} />
      <DocumentSection document={documents.contract} isOwner={isOwner} />
      <p className="text-sm text-muted">{partnersLabel(partners)}</p>
    </div>
  );
}
