import DisabledSignOut from "@/components/DisabledSignOut";

/** ADM-04 — where `requireUser()` sends a disabled user. */
export default function DisabledPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-xl font-semibold tracking-tight">
        Sorry, you need to ask the admin for access.
      </h1>
      <p className="text-sm text-muted">
        You&apos;re signed in, but the admin hasn&apos;t turned your account on yet. Once
        they do, reload this page.
      </p>
      <DisabledSignOut />
    </main>
  );
}
