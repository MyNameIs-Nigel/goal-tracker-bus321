"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { teamPaths } from "@/lib/paths";

/** TEAM-09 — the label and links on every page of a teammate's team. */
export default function TeamNav({
  teamId,
  teamName,
}: {
  teamId: string;
  teamName: string;
}) {
  const pathname = usePathname();
  const paths = teamPaths(teamId);
  const links = [
    {
      label: "Today",
      href: paths.today,
      current:
        pathname === paths.today || pathname.startsWith(`${paths.today}/day/`),
    },
    {
      label: "Contract",
      href: paths.contract,
      current: pathname === paths.contract,
    },
    {
      label: "History",
      href: paths.history(),
      current: pathname === paths.history(),
    },
  ];

  return (
    <nav
      aria-label={teamName}
      className="-mt-3 mb-3 flex flex-wrap items-center gap-x-3 text-sm font-medium"
    >
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {teamName}
      </span>
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          aria-current={link.current ? "page" : undefined}
          className={`ui-hover-accent ${link.current ? "text-accent" : "text-foreground/80"}`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
