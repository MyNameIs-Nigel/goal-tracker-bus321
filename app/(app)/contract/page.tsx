import ContractView from "@/components/ContractView";
import { loadContractPage } from "@/lib/contract-page";
import { loadOwnTeam } from "@/lib/team-page";

/** docs/specs/contract-and-vision.md — your own: dates → vision → contract → partners. */
export default async function ContractPage() {
  const { team } = await loadOwnTeam();
  return <ContractView isOwn {...await loadContractPage(team)} />;
}
