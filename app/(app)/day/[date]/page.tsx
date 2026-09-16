export default async function DayPage({ params }: PageProps<"/day/[date]">) {
  const { date } = await params;

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">{date}</h1>
      <p className="text-muted">Day editing arrives in Phase 2.</p>
    </div>
  );
}
