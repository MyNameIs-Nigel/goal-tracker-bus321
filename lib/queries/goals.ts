/**
 * Reads for the `goals` table (docs/DATA_MODEL.md § goals), always scoped to
 * one team. Kept separate from lib/actions/goals.ts so a Server Action can be
 * unit-tested by mocking these functions instead of the Drizzle query chain.
 */
import "server-only";

import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { completions, goals } from "@/db/schema";

export type Cadence = "daily" | "weekly" | "monthly";

export type GoalRecord = {
  id: string;
  teamId: string;
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

const WITH_META = {
  id: goals.id,
  teamId: goals.teamId,
  title: goals.title,
  description: goals.description,
  cadence: goals.cadence,
  startsOn: goals.startsOn,
  endsOn: goals.endsOn,
  sortOrder: goals.sortOrder,
  createdAt: goals.createdAt,
  updatedAt: goals.updatedAt,
  hasCompletions: HAS_COMPLETIONS,
};

/** Every goal of the team, active and archived, for `/goals`. */
export async function listGoalsWithMeta(
  teamId: string,
): Promise<GoalWithMeta[]> {
  const rows = await db
    .select(WITH_META)
    .from(goals)
    .where(eq(goals.teamId, teamId));
  return rows as GoalWithMeta[];
}

/** The goal if — and only if — it belongs to `teamId` (TEAM-06). */
export async function getGoal(
  teamId: string,
  id: string,
): Promise<GoalRecord | null> {
  const [row] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.teamId, teamId)));
  return (row as GoalRecord | undefined) ?? null;
}

export async function getGoalWithMeta(
  teamId: string,
  id: string,
): Promise<GoalWithMeta | null> {
  const [row] = await db
    .select(WITH_META)
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.teamId, teamId)));
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

/** The team's active goals (`ends_on IS NULL`) in one cadence, in display order. */
export async function activeGoalsInCadence(
  teamId: string,
  cadence: Cadence,
): Promise<GoalRecord[]> {
  const rows = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.teamId, teamId),
        eq(goals.cadence, cadence),
        isNull(goals.endsOn),
      ),
    )
    .orderBy(asc(goals.sortOrder));
  return rows as GoalRecord[];
}
