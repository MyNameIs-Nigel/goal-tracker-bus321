"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { completions } from "@/db/schema";
import { today } from "@/lib/clock";
import { requireUser } from "@/lib/dal";
import { compareDates } from "@/lib/dates";
import { periodFor } from "@/lib/periods";
import { getGoal } from "@/lib/queries/goals";

export type ToggleCompletionResult =
  { ok: true; completed: boolean } | { ok: false; error: string };

function revalidateDayPages(date: string) {
  revalidatePath("/today");
  revalidatePath(`/day/${date}`);
}

/**
 * DT-03/04 — toggle one of your own goals for the period containing `date`.
 * DT-05 — any date ≤ today (edit the past). DT-06 — a future date is rejected.
 * TEAM-06 — a teammate's goal reads as missing.
 */
export async function toggleCompletion(
  goalId: string,
  date: string,
): Promise<ToggleCompletionResult> {
  const { teamId } = await requireUser();

  if (compareDates(date, today()) > 0) {
    return {
      ok: false,
      error: "Can't check off a day that hasn't happened yet.",
    };
  }

  const goal = await getGoal(teamId, goalId);
  if (!goal) return { ok: false, error: "Goal not found." };

  const period = periodFor(goal.cadence, date);
  const where = and(
    eq(completions.goalId, goalId),
    eq(completions.periodStart, period.start),
  );
  const existing = await db.select().from(completions).where(where);

  if (existing.length > 0) {
    await db.delete(completions).where(where);
    revalidateDayPages(date);
    return { ok: true, completed: false };
  }

  await db.insert(completions).values({ goalId, periodStart: period.start });
  revalidateDayPages(date);
  return { ok: true, completed: true };
}
