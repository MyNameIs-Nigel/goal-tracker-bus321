/**
 * Reads for the `goals` table (docs/DATA_MODEL.md § goals). Kept separate
 * from lib/actions/goals.ts so a Server Action can be unit-tested by mocking
 * these functions instead of the Drizzle query chain directly.
 */
import "server-only";

import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { completions, goals } from "@/db/schema";

export type Cadence = "daily" | "weekly" | "monthly";

export type GoalRecord = {
  id: string;
  title: string;
  description: string | null;
  cadence: Cadence;
  startsOn: string;
  endsOn: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type GoalWithMeta = GoalRecord & { hasCompletions: boolean };

const HAS_COMPLETIONS = sql<boolean>`EXISTS (SELECT 1 FROM ${completions} WHERE ${completions.goalId} = ${goals.id})`;

/** Every goal, active and archived, for the `/goals` page. */
export async function listGoalsWithMeta(): Promise<GoalWithMeta[]> {
  const rows = await db
    .select({
      id: goals.id,
      title: goals.title,
      description: goals.description,
      cadence: goals.cadence,
      startsOn: goals.startsOn,
      endsOn: goals.endsOn,
      sortOrder: goals.sortOrder,
      createdAt: goals.createdAt,
      updatedAt: goals.updatedAt,
      hasCompletions: HAS_COMPLETIONS,
    })
    .from(goals);
  return rows as GoalWithMeta[];
}

export async function getGoal(id: string): Promise<GoalRecord | null> {
  const [row] = await db.select().from(goals).where(eq(goals.id, id));
  return (row as GoalRecord | undefined) ?? null;
}

export async function getGoalWithMeta(
  id: string,
): Promise<GoalWithMeta | null> {
  const [row] = await db
    .select({
      id: goals.id,
      title: goals.title,
      description: goals.description,
      cadence: goals.cadence,
      startsOn: goals.startsOn,
      endsOn: goals.endsOn,
      sortOrder: goals.sortOrder,
      createdAt: goals.createdAt,
      updatedAt: goals.updatedAt,
      hasCompletions: HAS_COMPLETIONS,
    })
    .from(goals)
    .where(eq(goals.id, id));
  return (row as GoalWithMeta | undefined) ?? null;
}

export async function goalHasCompletions(id: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(completions)
    .where(eq(completions.goalId, id))
    .limit(1);
  return rows.length > 0;
}

/** Active goals (`ends_on IS NULL`) in one cadence, in display order. */
export async function activeGoalsInCadence(
  cadence: Cadence,
): Promise<GoalRecord[]> {
  const rows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.cadence, cadence), isNull(goals.endsOn)))
    .orderBy(asc(goals.sortOrder));
  return rows as GoalRecord[];
}
