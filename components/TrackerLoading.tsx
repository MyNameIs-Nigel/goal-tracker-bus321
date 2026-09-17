export default function TrackerLoading() {
  return (
    <div role="status" className="space-y-6" aria-live="polite">
      <p className="text-sm text-muted">Loading your tracker…</p>
      <div aria-hidden="true" className="space-y-4">
        <div className="h-8 w-2/3 rounded-lg bg-accent-soft" />
        <div className="h-20 rounded-xl border border-border" />
        <div className="h-20 rounded-xl border border-border" />
      </div>
    </div>
  );
}
