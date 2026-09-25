import DayView from "@/components/DayView";
import TeamNav from "@/components/TeamNav";
import { today } from "@/lib/clock";
import { loadDayPage } from "@/lib/day-page";
import { teamName } from "@/lib/format";
import { loadTeammateTeam } from "@/lib/team-page";

/** A teammate's today, read-only (DT-07, TEAM-03). */
export default async function TeamTodayPage({
  params,
}: PageProps<"/team/[teamId]">) {
  const { teamId } = await params;
  const { me, team } = await loadTeammateTeam(teamId, "/today");

  return (
    <>
      <TeamNav teamId={team.id} teamName={teamName(team.ownerName)} />
      <DayView {...await loadDayPage(today(), me, team)} />
    </>
  );
}
