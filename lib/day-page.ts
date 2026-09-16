/**
 * Data for `/today` and `/day/[date]` (docs/specs/daily-tracking.md). Fetches
 * the tracker's raw rows and hands them to the client so it can recompute
 * status locally after a toggle — see components/DayView.tsx.
 */
import "server-only";

import { today as todayFn } from "@/lib/clock";
import type { Role } from "@/lib/dal";
import { getOwnerFirstName } from "@/lib/queries/owner";
import { getTrackingData } from "@/lib/queries/tracking";
import type { Completion, Exception } from "@/lib/status";
import type { ViewGoal, Contract } from "@/lib/view/day";

export type DayPageData = {
  date: string;
  todayDate: string;
  role: Role;
  ownerFirstName: string;
  goals: ViewGoal[];
  completions: Completion[];
  exceptions: Exception[];
  contract: Contract;
};

export async function loadDayPage(
  date: string,
  role: Role,
): Promise<DayPageData> {
  const [{ goals, completions, exceptions, contract }, ownerFirstName] =
    await Promise.all([getTrackingData(), getOwnerFirstName()]);

  return {
    date,
    todayDate: todayFn(),
    role,
    ownerFirstName,
    goals,
    completions,
    exceptions,
    contract,
  };
}
