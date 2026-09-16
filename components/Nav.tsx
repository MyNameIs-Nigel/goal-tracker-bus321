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
      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium"
    >
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-foreground/80 hover:text-foreground"
        >
          {link.label}
        </Link>
      ))}
      {role === "owner" && (
        <Link
          href="/people"
          className="text-foreground/80 hover:text-foreground"
        >
          People
        </Link>
      )}
    </nav>
  );
}
