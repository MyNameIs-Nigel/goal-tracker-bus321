/**
 * Reads for the admin (docs/specs/admin.md, DATA_MODEL.md § admins).
 */
import "server-only";

import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { admins, user } from "@/db/schema";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  disabled: boolean;
  isAdmin: boolean;
};

// Written out by hand: drizzle would render `user.email` unqualified, and inside
// the subquery that resolves to `admins.email`.
const IS_ADMIN = sql<boolean>`EXISTS (SELECT 1 FROM "admins" a WHERE a."email" = lower("user"."email"))`;

/** Whether `email` is listed in `admins` (case-insensitive). */
export async function isAdmin(email: string): Promise<boolean> {
  const [row] = await db
    .select({ email: admins.email })
    .from(admins)
    .where(eq(admins.email, email.toLowerCase()));
  return Boolean(row);
}

/** Every user, by name (ADM-01). */
export async function listUsers(): Promise<AdminUser[]> {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      disabled: user.disabled,
      isAdmin: IS_ADMIN,
    })
    .from(user)
    .orderBy(asc(user.name));
}

/** The user an admin action targets, or undefined (ADM-07). */
export async function getAdminTarget(
  userId: string,
): Promise<{ id: string; isAdmin: boolean } | undefined> {
  const [row] = await db
    .select({ id: user.id, isAdmin: IS_ADMIN })
    .from(user)
    .where(eq(user.id, userId));
  return row;
}
