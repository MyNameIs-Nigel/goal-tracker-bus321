"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { partnerCheckins } from "@/db/schema";
import { now, today } from "@/lib/clock";
import { canPartner, ForbiddenError, requireUser } from "@/lib/dal";
import { toCheckinRecord, type CheckinRecord } from "@/lib/queries/checkins";
import { validateNote } from "@/lib/validation/checkins";

export type CheckinActionResult =
  { ok: true; checkin: CheckinRecord } | { ok: false; error: string };

const NOT_TODAY = "You can only check in for today";

/** ROLE-04 / PCI-06 — partner only; the owner is not a partner here. */
async function requirePartnerCaller() {
  const user = await requireUser();
  if (!canPartner(user.role)) throw new ForbiddenError();
  return user;
}

/**
 * PCI-02 — the session partner checks in for today. `date` is the day the
 * page is showing; anything but today is rejected (PCI-05). The insert is
 * idempotent on (user_id, date) so a double tap is harmless (PCI-08).
 */
export async function checkIn(date: string): Promise<CheckinActionResult> {
  const user = await requirePartnerCaller();
  if (date !== today()) return { ok: false, error: NOT_TODAY };

  const instant = now();
  await db
    .insert(partnerCheckins)
    .values({ userId: user.id, date, createdAt: instant, updatedAt: instant })
    .onConflictDoNothing();

  const [row] = await db
    .select()
    .from(partnerCheckins)
    .where(
      and(eq(partnerCheckins.userId, user.id), eq(partnerCheckins.date, date)),
    );

  revalidatePath("/today");
  return { ok: true, checkin: toCheckinRecord(row) };
}

/** PCI-03/04 — the session partner sets or replaces today's note. */
export async function saveNote(
  date: string,
  rawNote: string,
): Promise<CheckinActionResult> {
  const user = await requirePartnerCaller();
  if (date !== today()) return { ok: false, error: NOT_TODAY };

  const validated = validateNote(rawNote);
  if ("error" in validated) return { ok: false, error: validated.error };

  const [row] = await db
    .update(partnerCheckins)
    .set({ note: validated.note, updatedAt: now() })
    .where(
      and(eq(partnerCheckins.userId, user.id), eq(partnerCheckins.date, date)),
    )
    .returning();
  if (!row) return { ok: false, error: "Check in first" };

  revalidatePath("/today");
  return { ok: true, checkin: toCheckinRecord(row) };
}
