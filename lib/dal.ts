/**
 * Data Access Layer (docs/ARCHITECTURE.md § Authorization). Every read of
 * another user's data goes through these; every Server Action starts with
 * one. UI hiding is a courtesy — this is the actual boundary.
 */
import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "./auth";

export type Role = "owner" | "partner" | "viewer";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
};

export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "Forbidden";
  }
}

/** True when `role` may do a partner's job (the daily check-in). */
export function canPartner(role: Role): boolean {
  return role === "partner" || role === "owner";
}

export async function getSession(): Promise<{ user: SessionUser } | null> {
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result) return null;
  const { user } = result;
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
      role: (user as unknown as { role: Role }).role,
    },
  };
}

/** Session or `redirect("/")` (AUTH-01). */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/");
  return session.user;
}

/** Session with role in {partner, owner}, or throws `Forbidden` (ROLE-03/04). */
export async function requirePartner(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canPartner(user.role)) throw new ForbiddenError();
  return user;
}

/** Session with role = owner, or `notFound()` for everyone else (ROLE-02). */
export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "owner") notFound();
  return user;
}
