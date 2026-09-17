import Link from "next/link";

import type { Role } from "@/lib/dal";

const LINKS = [
  { href: "/today", label: "Today" },
  { href: "/goals", label: "Goals" },
  { href: "/contract", label: "Contract" },
  { href: "/history", label: "History" },
] as const;

/** ROLE-08 — People shows only for the owner; everyone else sees the four. */
export default function Nav({ role }: { role: Role }) {
  return (
    <nav
      aria-label="Primary"
      className="order-3 flex w-full flex-wrap items-center justify-between sm:order-none sm:w-auto sm:justify-start gap-x-3 gap-y-1 text-sm font-medium"
    >
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-foreground/80 ui-hover-accent"
        >
          {link.label}
        </Link>
      ))}
      {role === "owner" && (
        <Link href="/people" className="text-foreground/80 ui-hover-accent">
          People
        </Link>
      )}
    </nav>
  );
}
