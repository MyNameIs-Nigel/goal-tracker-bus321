/**
 * Reads for `checkins` and a team's partners (docs/DATA_MODEL.md § checkins,
 * § Partners).
 */
import "server-only";

import { and, asc, eq, gte, lte, ne } from "drizzle-orm";

import { db } from "@/db/client";
import { checkins, teams, user } from "@/db/schema";

export type PartnerSummary = { id: string; name: string; image: string | null };

/** A check-in as the pages show it; `createdAt` is ISO for the client. */
export type CheckinRecord = {
  teamId: string;
  userId: string;
  date: string;
  note: string | null;
  createdAt: string;
};

export function toCheckinRecord(row: {
  teamId: string;
  userId: string;
  date: string;
  note: string | null;
  createdAt: Date;
}): CheckinRecord {
  return {
    teamId: row.teamId,
    userId: row.userId,
    date: row.date,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Every student except the team's owner, by name (TEAM-02, PCI-10). */
export async function listPartners(ownerId: string): Promise<PartnerSummary[]> {
  return db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(user)
    .innerJoin(teams, eq(teams.ownerId, user.id))
    .where(and(ne(user.id, ownerId), eq(user.disabled, false)))
    .orderBy(asc(user.name));
}

/** Every check-in on the team on `date`. */
export async function listCheckinsOn(
  teamId: string,
  date: string,
): Promise<CheckinRecord[]> {
  const rows = await db
    .select()
    .from(checkins)
    .where(and(eq(checkins.teamId, teamId), eq(checkins.date, date)));
  return rows.map(toCheckinRecord);
}

/** Every check-in `userId` made on `date`, on any team (PCI-01). */
export async function listCheckinsBy(
  userId: string,
  date: string,
): Promise<CheckinRecord[]> {
  const rows = await db
    .select()
    .from(checkins)
    .where(and(eq(checkins.userId, userId), eq(checkins.date, date)));
  return rows.map(toCheckinRecord);
}

/** Check-ins on the team from `start` to `end` inclusive (HIST-06). */
export async function listCheckinsBetween(
  teamId: string,
  start: string,
  end: string,
): Promise<{ userId: string; date: string }[]> {
  return db
    .select({ userId: checkins.userId, date: checkins.date })
    .from(checkins)
    .where(
      and(
        eq(checkins.teamId, teamId),
        gte(checkins.date, start),
        lte(checkins.date, end),
      ),
    );
}
