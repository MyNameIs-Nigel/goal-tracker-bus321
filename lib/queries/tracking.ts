/**
 * Everything a team's day and history pages need to compute status
 * (docs/DATA_MODEL.md). A class's worth of rows is cheap to read in full and
 * compute over in memory (ADR-0002 G2) rather than querying per goal/period.
 */
import "server-only";

import { eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { completions, exceptions, goals } from "@/db/schema";
import type { Cadence } from "@/lib/periods";
import type { Completion } from "@/lib/status";
import type { ExceptionRecord, ViewGoal } from "@/lib/view/day";

export type TeamTracking = {
  goals: ViewGoal[];
  completions: Completion[];
  exceptions: ExceptionRecord[];
};

/** Each team's goals, completions and exceptions, keyed by team id. */
export async function getTrackingData(
  teamIds: readonly string[],
): Promise<Map<string, TeamTracking>> {
  const byTeam = new Map<string, TeamTracking>(
    teamIds.map((id) => [id, { goals: [], completions: [], exceptions: [] }]),
  );
  if (teamIds.length === 0) return byTeam;

  const ids = [...teamIds];
  const [goalRows, completionRows, exceptionRows] = await Promise.all([
    db.select().from(goals).where(inArray(goals.teamId, ids)),
    db
      .select({
        teamId: goals.teamId,
        goalId: completions.goalId,
        periodStart: completions.periodStart,
      })
      .from(completions)
      .innerJoin(goals, eq(completions.goalId, goals.id))
      .where(inArray(goals.teamId, ids)),
    db.select().from(exceptions).where(inArray(exceptions.teamId, ids)),
  ]);

  for (const row of goalRows) {
    byTeam.get(row.teamId)?.goals.push({
      id: row.id,
      title: row.title,
      cadence: row.cadence as Cadence,
      startsOn: row.startsOn,
      endsOn: row.endsOn,
      sortOrder: row.sortOrder,
    });
  }
  for (const row of completionRows) {
    byTeam
      .get(row.teamId)
      ?.completions.push({ goalId: row.goalId, periodStart: row.periodStart });
  }
  for (const row of exceptionRows) {
    byTeam.get(row.teamId)?.exceptions.push({
      id: row.id,
      goalId: row.goalId,
      startsOn: row.startsOn,
      endsOn: row.endsOn,
      reason: row.reason,
    });
  }
  return byTeam;
}
