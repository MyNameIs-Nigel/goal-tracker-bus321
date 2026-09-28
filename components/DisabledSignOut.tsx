"use client";

import { useRouter } from "next/navigation";

import { signOut } from "@/lib/auth-client";

/** ADM-04 — the only thing a disabled user can do. */
export default function DisabledSignOut() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await signOut();
        router.push("/");
        router.refresh();
      }}
      className="ui-hover-surface min-h-11 rounded-full border border-border px-5 py-1.5 text-sm font-medium"
    >
      Sign out
    </button>
  );
}
