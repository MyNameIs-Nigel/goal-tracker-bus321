"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { E2eRole } from "@/lib/e2e";

const ROLES: readonly { role: E2eRole; label: string }[] = [
  { role: "owner", label: "Owner" },
  { role: "partner", label: "Partner" },
  { role: "viewer", label: "Viewer" },
];

export default function TestSignInButtons() {
  const router = useRouter();
  const [pendingRole, setPendingRole] = useState<E2eRole | null>(null);

  async function signInAs(role: E2eRole) {
    setPendingRole(role);
    const response = await fetch("/api/e2e/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (response.ok) {
      router.push("/today");
      router.refresh();
    } else {
      setPendingRole(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">
        Test sign-in
      </p>
      <div className="flex gap-2">
        {ROLES.map(({ role, label }) => (
          <button
            key={role}
            type="button"
            disabled={pendingRole !== null}
            onClick={() => signInAs(role)}
            className="ui-hover-surface flex-1 rounded-full border border-border px-3 py-2 text-sm font-medium disabled:opacity-60"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
