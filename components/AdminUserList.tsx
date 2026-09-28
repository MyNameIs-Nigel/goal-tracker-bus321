"use client";

import { useState, useTransition } from "react";

import Avatar from "@/components/Avatar";
import { setUserDisabled } from "@/lib/actions/admin";
import type { AdminUser } from "@/lib/queries/admin";

/** ADM-01/03/05/07 — every user, with an Enable/Disable button on non-admins. */
export default function AdminUserList({ users }: { users: AdminUser[] }) {
  const [rows, setRows] = useState(users);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(person: AdminUser) {
    setError(null);
    startTransition(async () => {
      const result = await setUserDisabled(person.id, !person.disabled);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRows((prev) =>
        prev.map((row) =>
          row.id === person.id ? { ...row, disabled: result.disabled } : row,
        ),
      );
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {rows.map((person) => (
          <li
            key={person.id}
            className="ui-hover-edge flex items-center gap-3 rounded-xl border border-border p-3"
          >
            <Avatar name={person.name} image={person.image} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{person.name}</p>
              <p className="truncate text-xs text-muted">{person.email}</p>
              <p className="text-xs text-muted">
                {person.disabled ? "Disabled" : "Active"}
              </p>
            </div>
            {!person.isAdmin && (
              <button
                type="button"
                disabled={pending}
                onClick={() => toggle(person)}
                aria-label={`${person.disabled ? "Enable" : "Disable"} ${person.name}`}
                className="ui-hover-surface min-h-11 rounded-full border border-border px-4 py-1.5 text-sm font-medium"
              >
                {person.disabled ? "Enable" : "Disable"}
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
