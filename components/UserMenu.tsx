"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { signOut } from "@/lib/auth-client";
import type { Role, SessionUser } from "@/lib/dal";
import { initials } from "@/lib/format";

const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  partner: "Partner",
  viewer: "Viewer",
};

/** AUTH-12 — avatar (or initials), name, email and role label; AUTH-06 sign-out. */
export default function UserMenu({
  name,
  email,
  image,
  role,
}: Pick<SessionUser, "name" | "email" | "image" | "role">) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="User menu"
        className="ui-hover-outline flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-medium text-white"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar comes from Google, not a local/optimizable asset
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          initials(name)
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-border bg-background p-3 shadow-lg"
        >
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted">{email}</p>
          <p className="mt-1 text-xs text-muted">{ROLE_LABELS[role]}</p>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push("/");
              router.refresh();
            }}
            className="ui-hover-surface mt-3 w-full rounded-full border border-border px-3 py-1.5 text-left text-sm font-medium"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
