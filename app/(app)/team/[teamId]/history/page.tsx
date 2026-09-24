import HistoryView from "@/components/HistoryView";
import TeamNav from "@/components/TeamNav";
import { teamName } from "@/lib/format";
import { loadHistoryPage } from "@/lib/history-page";
import { loadTeammateTeam } from "@/lib/team-page";

/** A teammate's month (docs/specs/history.md); links stay on their team. */
export default async function TeamHistoryPage({
  params,
  searchParams,
}: PageProps<"/team/[teamId]/history">) {
  const { teamId } = await params;
  const { month } = await searchParams;
  const ownRoute =
    typeof month === "string"
      ? `/history?month=${encodeURIComponent(month)}`
      : "/history";
  const { team } = await loadTeammateTeam(teamId, ownRoute);

  return (
    <>
      <TeamNav teamId={team.id} teamName={teamName(team.ownerName)} />
      <HistoryView data={await loadHistoryPage(team, month)} teamId={team.id} />
    </>
  );
}
