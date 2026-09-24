import DayView from "@/components/DayView";
import { today } from "@/lib/clock";
import { loadDayPage } from "@/lib/day-page";
import { loadOwnTeam } from "@/lib/team-page";

/** `/today` is `/day/<today>` for your own team, plus your teammates (DT-16). */
export default async function TodayPage() {
  const { me, team } = await loadOwnTeam();
  return <DayView {...await loadDayPage(today(), me, team)} />;
}
