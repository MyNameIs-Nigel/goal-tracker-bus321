import GoalList from "@/components/GoalList";
import { today } from "@/lib/clock";
import { requireUser } from "@/lib/dal";
import { listGoalsWithMeta } from "@/lib/queries/goals";
import { getOwnerFirstName } from "@/lib/queries/owner";

export default async function GoalsPage() {
  const user = await requireUser();
  const [goals, ownerFirstName] = await Promise.all([
    listGoalsWithMeta(),
    getOwnerFirstName(),
  ]);

  return (
    <GoalList
      initialGoals={goals}
      role={user.role}
      ownerFirstName={ownerFirstName}
      defaultStartsOn={today()}
    />
  );
}
