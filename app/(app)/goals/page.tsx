import GoalList from "@/components/GoalList";
import { today } from "@/lib/clock";
import { requireUser } from "@/lib/dal";
import { listGoalsWithMeta } from "@/lib/queries/goals";

/** docs/specs/goals.md — always your own team's goals (GOAL-11). */
export default async function GoalsPage() {
  const { teamId } = await requireUser();
  return (
    <GoalList
      initialGoals={await listGoalsWithMeta(teamId)}
      defaultStartsOn={today()}
    />
  );
}
