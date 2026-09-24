import HistoryView from "@/components/HistoryView";
import { loadHistoryPage } from "@/lib/history-page";
import { loadOwnTeam } from "@/lib/team-page";

/** docs/specs/history.md — your own month, `?month=YYYY-MM`, defaulting to this month. */
export default async function HistoryPage({
  searchParams,
}: PageProps<"/history">) {
  const { team } = await loadOwnTeam();
  const { month } = await searchParams;
  return <HistoryView data={await loadHistoryPage(team, month)} />;
}
