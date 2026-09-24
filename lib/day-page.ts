/**
 * Data for a team's day pages (docs/specs/daily-tracking.md). Fetches the
 * team's raw rows and hands them to the client so it can recompute status
 * locally after a toggle — see components/DayView.tsx. On your own today it
 * also summarizes every teammate (docs/specs/partner-check-ins.md PCI-01).
 */
import "server-only";

import { headers } from "next/headers";

import { today as todayFn } from "@/lib/clock";
import type { SessionUser } from "@/lib/dal";
import { firstName, teamName } from "@/lib/format";
import {
  listCheckinsBy,
  listCheckinsOn,
  listPartners,
  type CheckinRecord,
  type PartnerSummary,
} from "@/lib/queries/checkins";
import { listTeams, type TeamSummary } from "@/lib/queries/teams";
import { getTrackingData } from "@/lib/queries/tracking";
import type { Completion } from "@/lib/status";
import type { Contract, ExceptionRecord, ViewGoal } from "@/lib/view/day";
import { teammateSummary, type Teammate } from "@/lib/view/teammates";

export type DayPageData = {
  date: string;
  todayDate: string;
  team: { id: string; name: string; firstName: string };
  /** The signed-in student owns this team: editing is on. */
  isOwn: boolean;
  currentUserId: string;
  goals: ViewGoal[];
  completions: Completion[];
  exceptions: ExceptionRecord[];
  contract: Contract;
  partners: PartnerSummary[];
  checkins: CheckinRecord[];
  /** Everyone else, on your own today only (DT-16). */
  teammates: Teammate[] | null;
  shareUrl: string;
};

async function appUrl(): Promise<string> {
  const host = (await headers()).get("host") ?? "bus321.nigel-smith.dev";
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}

export async function loadDayPage(
  date: string,
  me: SessionUser,
  team: TeamSummary,
): Promise<DayPageData> {
  const todayDate = todayFn();
  const isOwn = team.ownerId === me.id;
  const withTeammates = isOwn && date === todayDate;

  const [allTeams, partners, checkins, myCheckins, shareUrl] =
    await Promise.all([
      withTeammates ? listTeams() : Promise.resolve([team]),
      listPartners(team.ownerId),
      listCheckinsOn(team.id, date),
      withTeammates ? listCheckinsBy(me.id, date) : Promise.resolve([]),
      appUrl(),
    ]);
  const others = allTeams.filter((t) => t.id !== team.id);
  const tracking = await getTrackingData([team.id, ...others.map((t) => t.id)]);
  const own = tracking.get(team.id)!;

  return {
    date,
    todayDate,
    team: {
      id: team.id,
      name: teamName(team.ownerName),
      firstName: firstName(team.ownerName),
    },
    isOwn,
    currentUserId: me.id,
    goals: own.goals,
    completions: own.completions,
    exceptions: own.exceptions,
    contract: {
      contractStart: team.contractStart,
      contractEnd: team.contractEnd,
    },
    partners,
    checkins,
    teammates: withTeammates
      ? others.map((other) => ({
          teamId: other.id,
          name: other.ownerName,
          image: other.ownerImage,
          summary: teammateSummary({
            today: todayDate,
            ...tracking.get(other.id)!,
            contract: {
              contractStart: other.contractStart,
              contractEnd: other.contractEnd,
            },
          }),
          checkin: myCheckins.find((c) => c.teamId === other.id) ?? null,
        }))
      : null,
    shareUrl,
  };
}
