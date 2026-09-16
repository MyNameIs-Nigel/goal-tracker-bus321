/**
 * Everything the day pages need to compute status (docs/DATA_MODEL.md).
 * One user's worth of rows is cheap to read in full and compute over in
 * memory (ADR-0002 G2) rather than querying per goal/period.
 */
import "server-only";

import { db } from "@/db/client";
import { completions, exceptions, goals, settings } from "@/db/schema";
import type { Cadence } from "@/lib/periods";
import type { Completion, Exception } from "@/lib/status";
import type { ViewGoal } from "@/lib/view/day";

export type Contract = {
  contractStart: string | null;
  contractEnd: string | null;
};

export async function getTrackingData(): Promise<{
  goals: ViewGoal[];
  completions: Completion[];
  exceptions: Exception[];
  contract: Contract;
}> {
  const [goalRows, completionRows, exceptionRows, settingsRows] =
    await Promise.all([
      db.select().from(goals),
      db
        .select({
          goalId: completions.goalId,
          periodStart: completions.periodStart,
        })
        .from(completions),
      db.select().from(exceptions),
      db.select().from(settings),
    ]);

  const settingsRow = settingsRows[0];

  return {
    goals: goalRows.map((row) => ({
      id: row.id,
      title: row.title,
      cadence: row.cadence as Cadence,
      startsOn: row.startsOn,
      endsOn: row.endsOn,
      sortOrder: row.sortOrder,
    })),
    completions: completionRows,
    exceptions: exceptionRows.map((row) => ({
      goalId: row.goalId,
      startsOn: row.startsOn,
      endsOn: row.endsOn,
      reason: row.reason,
    })),
    contract: {
      contractStart: settingsRow?.contractStart ?? null,
      contractEnd: settingsRow?.contractEnd ?? null,
    },
  };
}
