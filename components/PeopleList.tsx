"use client";

import { useState, useTransition } from "react";

import { setRole } from "@/lib/actions/people";
import type { Role } from "@/lib/dal";
import { formatJoined, initials } from "@/lib/format";

export type PersonRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
  createdAt: string;
};

/** PPL-01..07 — the list, promote/demote, the owner's fixed row, empty state. */
export default function PeopleList({
  people,
  ownerId,
  appUrl,
}: {
  people: PersonRow[];
  ownerId: string;
  appUrl: string;
}) {
  const [rows, setRows] = useState(people);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hasOthers = rows.some((person) => person.id !== ownerId);

  function announce(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  function handleChange(personId: string, role: "partner" | "viewer") {
    startTransition(async () => {
      const result = await setRole(personId, role);
      if (!result.ok) {
        announce(result.error);
        return;
      }
      setRows((prev) =>
        prev.map((person) =>
          person.id === personId ? { ...person, role: result.role } : person,
        ),
      );
      announce(`${result.name} is now a ${result.role}`);
    });
  }

  async function copyLink() {
    await navigator.clipboard.writeText(appUrl);
    announce("Link copied");
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((person) => (
        <div
          key={person.id}
          className="flex items-center gap-3 rounded-xl border border-border p-3"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-medium text-white">
            {person.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- avatar comes from Google, not a local/optimizable asset
              <img
                src={person.image}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              initials(person.name)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{person.name}</p>
            <p className="truncate text-xs text-muted">{person.email}</p>
            <p className="text-xs text-muted">
              {formatJoined(person.createdAt)}
            </p>
          </div>
          {person.id === ownerId ? (
            <span className="text-sm font-medium text-muted">Owner (you)</span>
          ) : (
            <select
              aria-label={`Role for ${person.name}`}
              value={person.role}
              disabled={pending}
              onChange={(event) =>
                handleChange(
                  person.id,
                  event.target.value as "partner" | "viewer",
                )
              }
              className="rounded-full border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="viewer">Viewer</option>
              <option value="partner">Partner</option>
            </select>
          )}
        </div>
      ))}
      {!hasOthers && (
        <div className="flex flex-col gap-2 rounded-xl border border-border p-3 text-sm">
          <p>No one else has signed in yet. Share the link:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate text-muted">{appUrl}</code>
            <button
              type="button"
              onClick={copyLink}
              className="rounded-full border border-border px-3 py-1.5 text-sm font-medium"
            >
              Copy link
            </button>
          </div>
        </div>
      )}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-background"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
