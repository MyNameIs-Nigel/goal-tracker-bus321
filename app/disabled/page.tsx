import DisabledSignOut from "@/components/DisabledSignOut";

/** ADM-04 — where `requireUser()` sends a disabled user. */
export default function DisabledPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-xl font-semibold tracking-tight">
        Your account is disabled.
      </h1>
      <p className="text-sm text-muted">
        Ask the admin if you think this is a mistake.
      </p>
      <DisabledSignOut />
    </main>
  );
}
