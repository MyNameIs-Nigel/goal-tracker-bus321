"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { E2eStudent } from "@/lib/e2e";

const STUDENTS: readonly { student: E2eStudent; label: string }[] = [
  { student: "avery", label: "Avery" },
  { student: "blake", label: "Blake" },
  { student: "casey", label: "Casey" },
];

/** AUTH-09 / AUTH-13 — test mode only: sign in as a fake student, or load a fake class. */
export default function TestSignInButtons() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function post(url: string, body: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return response.ok;
  }

  async function signInAs(student: E2eStudent, { demo = false } = {}) {
    setPending(true);
    const ok =
      (!demo || (await post("/api/e2e/reset", { demo: true }))) &&
      (await post("/api/e2e/sign-in", { student }));
    if (ok) {
      router.push("/today");
      router.refresh();
    } else {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">
        Test sign-in
      </p>
      <div className="flex gap-2">
        {STUDENTS.map(({ student, label }) => (
          <button
            key={student}
            type="button"
            disabled={pending}
            onClick={() => signInAs(student)}
            className="ui-hover-surface flex-1 rounded-full border border-border px-3 py-2 text-sm font-medium disabled:opacity-60"
          >
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => signInAs("avery", { demo: true })}
        className="ui-hover-surface rounded-full border border-dashed border-border px-3 py-2 text-sm font-medium disabled:opacity-60"
      >
        Load demo data
      </button>
    </div>
  );
}
