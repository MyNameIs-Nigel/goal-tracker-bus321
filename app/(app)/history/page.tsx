import HistoryView from "@/components/HistoryView";
import { today } from "@/lib/clock";
import { requireUser } from "@/lib/dal";
import { endOfMonth } from "@/lib/dates";
import { listCheckinsBetween, listPartners } from "@/lib/queries/checkins";
import { getTrackingData } from "@/lib/queries/tracking";
import { buildHistoryData, parseMonth } from "@/lib/view/history";

/** docs/specs/history.md — `/history?month=YYYY-MM`, defaulting to this month. */
export default async function HistoryPage({
  searchParams,
}: PageProps<"/history">) {
  await requireUser();
  const todayDate = today();
  const month = parseMonth((await searchParams).month, todayDate);
  const monthStart = `${month}-01`;

  const [{ goals, completions, exceptions, contract }, partners, checkins] =
    await Promise.all([
      getTrackingData(),
      listPartners(),
      listCheckinsBetween(monthStart, endOfMonth(monthStart)),
    ]);

  const data = buildHistoryData({
    month,
    today: todayDate,
    goals,
    contract,
    completions,
    exceptions,
    partners,
    checkins,
  });

  return <HistoryView data={data} />;
}
