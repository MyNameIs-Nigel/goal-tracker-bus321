"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { completions, goals } from "@/db/schema";
import { today } from "@/lib/clock";
import { ForbiddenError, requireUser } from "@/lib/dal";
import { compareDates } from "@/lib/dates";
import { periodFor, type Cadence } from "@/lib/periods";

export type ToggleCompletionResult =
  { ok: true; completed: boolean } | { ok: false; error: string };

function revalidateDayPages(date: string) {
  revalidatePath("/today");
  revalidatePath(`/day/${date}`);
}

/**
 * DT-03/04 — toggle a goal's completion for the period containing `date`.
 * DT-05 — the owner may do this for any date ≤ today (edit the past).
 * DT-06 — a future date is rejected.
 */
export async function toggleCompletion(
  goalId: string,
  date: string,
): Promise<ToggleCompletionResult> {
  const user = await requireUser();
  if (user.role !== "owner") throw new ForbiddenError();

  if (compareDates(date, today()) > 0) {
    return {
      ok: false,
      error: "Can't check off a day that hasn't happened yet.",
    };
  }

  const [goal] = await db.select().from(goals).where(eq(goals.id, goalId));
  if (!goal) return { ok: false, error: "Goal not found." };

  const period = periodFor(goal.cadence as Cadence, date);
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
