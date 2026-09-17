"use client";

export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold">We couldn’t load this page</h1>
      <p className="mt-3 text-muted">Something went wrong. Please try again.</p>
      <button
        type="button"
        onClick={retry}
        className="ui-hover-surface mt-6 rounded-full border border-border px-5 py-2 font-medium"
      >
        Try again
      </button>
    </main>
  );
}
