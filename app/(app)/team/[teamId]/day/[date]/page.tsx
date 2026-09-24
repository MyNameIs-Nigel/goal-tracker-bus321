import { notFound } from "next/navigation";

import DayView from "@/components/DayView";
import TeamNav from "@/components/TeamNav";
import { loadDayPage } from "@/lib/day-page";
import { teamName } from "@/lib/format";
import { loadTeammateTeam } from "@/lib/team-page";
import { isValidCalendarDate } from "@/lib/validate-date";

/** A teammate's day, read-only (DT-07); DT-08 — only real dates. */
export default async function TeamDayPage({
  params,
}: PageProps<"/team/[teamId]/day/[date]">) {
  const { teamId, date } = await params;
  if (!isValidCalendarDate(date)) notFound();
  const { me, team } = await loadTeammateTeam(teamId, `/day/${date}`);

  return (
    <>
      <TeamNav teamId={team.id} teamName={teamName(team.ownerName)} />
      <DayView {...await loadDayPage(date, me, team)} />
    </>
  );
}
