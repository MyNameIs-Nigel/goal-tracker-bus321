import { notFound } from "next/navigation";

import DayView from "@/components/DayView";
import { loadDayPage } from "@/lib/day-page";
import { loadOwnTeam } from "@/lib/team-page";
import { isValidCalendarDate } from "@/lib/validate-date";

/** DT-08 — anything but a real calendar date is a 404. */
export default async function DayPage({ params }: PageProps<"/day/[date]">) {
  const { date } = await params;
  if (!isValidCalendarDate(date)) notFound();

  const { me, team } = await loadOwnTeam();
  return <DayView {...await loadDayPage(date, me, team)} />;
}
