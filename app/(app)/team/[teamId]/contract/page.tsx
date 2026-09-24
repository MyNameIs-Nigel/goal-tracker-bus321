import ContractView from "@/components/ContractView";
import TeamNav from "@/components/TeamNav";
import { loadContractPage } from "@/lib/contract-page";
import { teamName } from "@/lib/format";
import { loadTeammateTeam } from "@/lib/team-page";

/** A teammate's vision, contract and dates, read-only (CV-09). */
export default async function TeamContractPage({
  params,
}: PageProps<"/team/[teamId]/contract">) {
  const { teamId } = await params;
  const { team } = await loadTeammateTeam(teamId, "/contract");

  return (
    <>
      <TeamNav teamId={team.id} teamName={teamName(team.ownerName)} />
      <ContractView isOwn={false} {...await loadContractPage(team)} />
    </>
  );
}
