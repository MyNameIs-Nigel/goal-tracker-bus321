import { headers } from "next/headers";

import PeopleList from "@/components/PeopleList";
import { db } from "@/db/client";
import { user } from "@/db/schema";
import type { Role } from "@/lib/dal";
import { requireOwner } from "@/lib/dal";

const ROLE_ORDER: Record<Role, number> = { owner: 0, partner: 1, viewer: 2 };

export default async function PeoplePage() {
  const owner = await requireOwner();

  const rows = await db.select().from(user);
  const sorted = [...rows].sort(
    (a, b) =>
      ROLE_ORDER[a.role as Role] - ROLE_ORDER[b.role as Role] ||
      a.name.localeCompare(b.name),
  );
  const partnerCount = rows.filter((row) => row.role === "partner").length;

  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "bus321.nigel-smith.dev";
  const appUrl = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <p className="text-muted">
          {partnerCount} partner{partnerCount === 1 ? "" : "s"}
        </p>
      </div>
      <PeopleList
        people={sorted.map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          image: row.image,
          role: row.role as Role,
          createdAt: row.createdAt.toISOString(),
        }))}
        ownerId={owner.id}
        appUrl={appUrl}
      />
    </div>
  );
}
