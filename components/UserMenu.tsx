"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import ThemeSelector from "./ThemeSelector";

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
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  return (
    <div
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        ref={trigger}
        aria-controls={panelId}
        aria-expanded={open}
        aria-label="User menu"
        className="ui-hover-outline flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-medium text-on-accent"
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
          id={panelId}
          role="region"
          aria-label="Your profile"
          className="absolute right-5 top-full z-10 mb-3 w-64 rounded-xl border border-border bg-background p-3 shadow-lg sm:right-6"
        >
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted">{email}</p>
          <p className="mt-1 text-xs text-muted">{ROLE_LABELS[role]}</p>
          <ThemeSelector />
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push("/");
              router.refresh();
            }}
            className="ui-hover-surface mt-3 min-h-11 w-full rounded-full border border-border px-3 py-1.5 text-left text-sm font-medium"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
