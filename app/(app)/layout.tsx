import type { ReactNode } from "react";

import Nav from "@/components/Nav";
import UserMenu from "@/components/UserMenu";
import { requireUser } from "@/lib/dal";

/** Requires a session (AUTH-01); everything under (app)/ lives behind this. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="border-b border-border">
        <div className="relative mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-6">
          <span className="text-sm font-semibold tracking-tight">
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
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-6"
      >
        {children}
      </main>
    </>
  );
}
