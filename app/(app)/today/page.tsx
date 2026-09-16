import { today } from "@/lib/clock";

export default function TodayPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
      <p className="text-muted">{today()}</p>
      <p className="text-muted">Goals and daily tracking arrive in Phase 2.</p>
    </div>
  );
}
