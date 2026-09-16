export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="h-1 w-12 rounded-full bg-accent" />
      <h1 className="text-3xl font-semibold tracking-tight text-balance">
        BUS 321 Goal Tracker
      </h1>
      <p className="text-lg leading-relaxed text-muted text-pretty">
        Nigel&rsquo;s accountability document, as an app. His goals, whether he
        hit them today, and the contract he signed — open to his partners.
      </p>
      <p className="text-sm text-muted">Sign-in is coming next.</p>
    </main>
  );
}
