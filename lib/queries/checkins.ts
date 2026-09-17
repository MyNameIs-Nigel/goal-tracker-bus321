/**
 * Reads for the `partner_checkins` table and the partner list
 * (docs/DATA_MODEL.md § partner_checkins).
 */
import "server-only";

import { and, asc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/db/client";
import { partnerCheckins, user } from "@/db/schema";

export type PartnerSummary = { id: string; name: string; image: string | null };

/** A check-in as the day page shows it; `createdAt` is ISO for the client. */
export type CheckinRecord = {
  userId: string;
  date: string;
  note: string | null;
  createdAt: string;
};

export function toCheckinRecord(row: {
  userId: string;
  date: string;
  note: string | null;
  createdAt: Date;
}): CheckinRecord {
  return {
    userId: row.userId,
    date: row.date,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Everyone with role partner, by name (PCI-01). */
export async function listPartners(): Promise<PartnerSummary[]> {
  return db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(user)
    .where(eq(user.role, "partner"))
    .orderBy(asc(user.name));
}

/** Every check-in on `date`, whoever made it. */
export async function listCheckinsOn(date: string): Promise<CheckinRecord[]> {
  const rows = await db
    .select()
    .from(partnerCheckins)
    .where(eq(partnerCheckins.date, date));
  return rows.map(toCheckinRecord);
}

/** Every check-in from `start` to `end` inclusive, with the user's name (HIST-06). */
export async function listCheckinsBetween(
  start: string,
  end: string,
): Promise<{ userId: string; date: string; userName: string }[]> {
  return db
    .select({
      userId: partnerCheckins.userId,
      date: partnerCheckins.date,
      userName: user.name,
    })
    .from(partnerCheckins)
    .innerJoin(user, eq(partnerCheckins.userId, user.id))
    .where(
      and(gte(partnerCheckins.date, start), lte(partnerCheckins.date, end)),
    );
}
