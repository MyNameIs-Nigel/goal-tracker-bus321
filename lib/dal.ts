/**
 * Data Access Layer (docs/ARCHITECTURE.md § Authorization). Every page and
 * Server Action starts here. The rule is ownership: the session's team is the
 * only one its user writes. UI hiding is a courtesy — this is the boundary.
 */
import "server-only";

import { cache } from "react";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ensureTeam } from "@/lib/queries/teams";

import { auth } from "./auth";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  /** The team this student owns — created on first use (TEAM-01). */
  teamId: string;
};

export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "Forbidden";
  }
}

// Deduplicate layout/page checks within one render; never cache across requests.
export const getSession = cache(
  async (): Promise<{ user: SessionUser } | null> => {
    const result = await auth.api.getSession({ headers: await headers() });
    if (!result) return null;
    const { user } = result;
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image ?? null,
        teamId: await ensureTeam(user.id),
      },
    };
  },
);

/** Session or `redirect("/")` (AUTH-01). */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/");
  return session.user;
}
