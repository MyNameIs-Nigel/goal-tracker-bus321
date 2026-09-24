"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { checkins } from "@/db/schema";
import { now, today } from "@/lib/clock";
import { ForbiddenError, requireUser } from "@/lib/dal";
import { toCheckinRecord, type CheckinRecord } from "@/lib/queries/checkins";
import { getTeam } from "@/lib/queries/teams";
import { validateNote } from "@/lib/validation/checkins";

export type CheckinActionResult =
  { ok: true; checkin: CheckinRecord } | { ok: false; error: string };

const NOT_TODAY = {
  ok: false,
  error: "You can only check in for today",
} as const;
const NO_TEAM = { ok: false, error: "Team not found." } as const;

/**
 * The caller as a partner of `teamId`: the team must exist and must not be
 * their own (PCI-06 / TEAM-07). The partner is always the session user —
 * there is no user-id parameter (PCI-05).
 */
async function requirePartnerOf(teamId: string) {
  const user = await requireUser();
  const team = await getTeam(teamId);
  if (team && team.ownerId === user.id) throw new ForbiddenError();
  return { user, team };
}

function revalidateCheckinPages(teamId: string) {
  revalidatePath("/today");
  revalidatePath(`/team/${teamId}`);
}

/**
 * PCI-02 — check in on a teammate's team for today. `date` is the day the
 * page is showing; anything but today is rejected (PCI-05). The insert is
 * idempotent on (team_id, user_id, date) so a double tap is harmless (PCI-08).
 */
export async function checkIn(
  teamId: string,
  date: string,
): Promise<CheckinActionResult> {
  const { user, team } = await requirePartnerOf(teamId);
  if (!team) return NO_TEAM;
  if (date !== today()) return NOT_TODAY;

  const instant = now();
  await db
    .insert(checkins)
    .values({
      teamId,
      userId: user.id,
      date,
      createdAt: instant,
      updatedAt: instant,
    })
    .onConflictDoNothing();

  const [row] = await db
    .select()
    .from(checkins)
    .where(
      and(
        eq(checkins.teamId, teamId),
        eq(checkins.userId, user.id),
        eq(checkins.date, date),
      ),
    );

  revalidateCheckinPages(teamId);
  return { ok: true, checkin: toCheckinRecord(row) };
}

/** PCI-03/04 — set or replace the caller's note on today's check-in. */
export async function saveNote(
  teamId: string,
  date: string,
  rawNote: string,
): Promise<CheckinActionResult> {
  const { user, team } = await requirePartnerOf(teamId);
  if (!team) return NO_TEAM;
  if (date !== today()) return NOT_TODAY;

  const validated = validateNote(rawNote);
  if ("error" in validated) return { ok: false, error: validated.error };

  const [row] = await db
    .update(checkins)
    .set({ note: validated.note, updatedAt: now() })
    .where(
      and(
        eq(checkins.teamId, teamId),
        eq(checkins.userId, user.id),
        eq(checkins.date, date),
      ),
    )
    .returning();
  if (!row) return { ok: false, error: "Check in first" };

  revalidateCheckinPages(teamId);
  return { ok: true, checkin: toCheckinRecord(row) };
}
