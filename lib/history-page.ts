/** Data for a team's history page (docs/specs/history.md). */
import "server-only";

import { today } from "@/lib/clock";
import { endOfMonth } from "@/lib/dates";
import { listCheckinsBetween, listPartners } from "@/lib/queries/checkins";
import type { TeamSummary } from "@/lib/queries/teams";
import { getTrackingData } from "@/lib/queries/tracking";
import {
  buildHistoryData,
  parseMonth,
  type HistoryData,
} from "@/lib/view/history";

export async function loadHistoryPage(
  team: TeamSummary,
  monthParam: string | string[] | undefined,
): Promise<HistoryData> {
  const todayDate = today();
  const month = parseMonth(monthParam, todayDate);
  const monthStart = `${month}-01`;

  const [tracking, partners, checkins] = await Promise.all([
    getTrackingData([team.id]),
    listPartners(team.ownerId),
    listCheckinsBetween(team.id, monthStart, endOfMonth(monthStart)),
  ]);

  return buildHistoryData({
    month,
    today: todayDate,
    ...tracking.get(team.id)!,
    contract: {
      contractStart: team.contractStart,
      contractEnd: team.contractEnd,
    },
    partners,
    checkins,
  });
}
