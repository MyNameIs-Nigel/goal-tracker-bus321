import type { ReactNode } from "react";

import Nav from "@/components/Nav";
import UserMenu from "@/components/UserMenu";
import { requireUser } from "@/lib/dal";

/** Requires a session (AUTH-01); everything under (app)/ lives behind this. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">
            BUS 321 Goal Tracker
          </span>
          <Nav role={user.role} />
          <UserMenu
            name={user.name}
            email={user.email}
            image={user.image}
            role={user.role}
          />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        {children}
      </main>
    </>
  );
}
