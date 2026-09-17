/**
 * Data for `/today` and `/day/[date]` (docs/specs/daily-tracking.md). Fetches
 * the tracker's raw rows and hands them to the client so it can recompute
 * status locally after a toggle — see components/DayView.tsx.
 */
import "server-only";

import { today as todayFn } from "@/lib/clock";
import type { Role } from "@/lib/dal";
import {
  listCheckinsOn,
  listPartners,
  type CheckinRecord,
  type PartnerSummary,
} from "@/lib/queries/checkins";
import { getOwnerFirstName } from "@/lib/queries/owner";
import { getTrackingData } from "@/lib/queries/tracking";
import type { Completion } from "@/lib/status";
import type { Contract, ExceptionRecord, ViewGoal } from "@/lib/view/day";

export type DayPageData = {
  date: string;
  todayDate: string;
  role: Role;
  currentUserId: string;
  ownerFirstName: string;
  goals: ViewGoal[];
  completions: Completion[];
  exceptions: ExceptionRecord[];
  contract: Contract;
  partners: PartnerSummary[];
  checkins: CheckinRecord[];
};

export async function loadDayPage(
  date: string,
  viewer: { id: string; role: Role },
): Promise<DayPageData> {
  const [
    { goals, completions, exceptions, contract },
    ownerFirstName,
    partners,
    checkins,
  ] = await Promise.all([
    getTrackingData(),
    getOwnerFirstName(),
    listPartners(),
    listCheckinsOn(date),
  ]);

  return {
    date,
    todayDate: todayFn(),
    role: viewer.role,
    currentUserId: viewer.id,
    ownerFirstName,
    goals,
    completions,
    exceptions,
    contract,
    partners,
    checkins,
  };
}
