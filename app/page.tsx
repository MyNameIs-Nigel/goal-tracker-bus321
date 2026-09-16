import GoogleSignInButton from "@/components/GoogleSignInButton";
import TestSignInButtons from "@/components/TestSignInButtons";
import { isE2eEnabled } from "@/lib/e2e";

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const cancelled = "error" in params;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="h-1 w-12 rounded-full bg-accent" />
      <h1 className="text-3xl font-semibold tracking-tight text-balance">
        BUS 321 Goal Tracker
      </h1>
      <p className="text-lg leading-relaxed text-muted text-pretty">
        Nigel&rsquo;s goals, and the people keeping him honest.
      </p>
      {cancelled && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Sign-in didn&rsquo;t complete. Try again.
        </p>
      )}
      <GoogleSignInButton />
      {isE2eEnabled() && <TestSignInButtons />}
    </main>
  );
}
