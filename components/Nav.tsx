import Link from "next/link";

const LINKS = [
  { href: "/today", label: "Today" },
  { href: "/goals", label: "Goals" },
  { href: "/contract", label: "Contract" },
  { href: "/history", label: "History" },
] as const;

/** TEAM-08 — the same four links for every student, all to their own team. */
export default function Nav() {
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
    </nav>
  );
}
