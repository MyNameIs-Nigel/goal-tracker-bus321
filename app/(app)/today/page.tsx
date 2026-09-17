import DayView from "@/components/DayView";
import { today } from "@/lib/clock";
import { loadDayPage } from "@/lib/day-page";
import { requireUser } from "@/lib/dal";

/** `/today` is `/day/<today>` (docs/specs/daily-tracking.md). */
export default async function TodayPage() {
  const user = await requireUser();
  const data = await loadDayPage(today(), user.role);

  return <DayView {...data} />;
}
