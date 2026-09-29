/** Data for a team's history page (docs/specs/history.md). */
import "server-only";

import { today } from "@/lib/clock";
import { listCheckinsBetween, listPartners } from "@/lib/queries/checkins";
import type { TeamSummary } from "@/lib/queries/teams";
import { getTrackingData } from "@/lib/queries/tracking";
import {
  buildHistoryData,
  parseMonth,
  partnerWindow,
  type HistoryData,
} from "@/lib/view/history";

export async function loadHistoryPage(
  team: TeamSummary,
  monthParam: string | string[] | undefined,
): Promise<HistoryData> {
  const todayDate = today();
  const month = parseMonth(monthParam, todayDate);
  const contract = {
    contractStart: team.contractStart,
    contractEnd: team.contractEnd,
  };
  const partnerSpan = partnerWindow(month, todayDate, contract);

  const [tracking, partners, checkins] = await Promise.all([
    getTrackingData([team.id]),
    listPartners(team.ownerId),
    listCheckinsBetween(team.id, partnerSpan.start, partnerSpan.end),
  ]);

  return buildHistoryData({
    month,
    today: todayDate,
    ...tracking.get(team.id)!,
    contract,
    partners,
    checkins,
  });
}
