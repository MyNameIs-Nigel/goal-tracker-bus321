"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { user } from "@/db/schema";
import { requireAdmin } from "@/lib/dal";
import { getAdminTarget } from "@/lib/queries/admin";

export type SetUserDisabledResult =
  { ok: true; disabled: boolean } | { ok: false; error: string };

/**
 * ADM-03/05 — enable or disable a user. ADM-06 — admins only.
 * ADM-07 — never an admin (which includes yourself), never a missing user.
 */
export async function setUserDisabled(
  userId: string,
  disabled: boolean,
): Promise<SetUserDisabledResult> {
  await requireAdmin();

  const target = await getAdminTarget(userId);
  if (!target) return { ok: false, error: "User not found." };
  if (target.isAdmin)
    return { ok: false, error: "You can't disable an admin." };

  await db.update(user).set({ disabled }).where(eq(user.id, userId));
  revalidatePath("/admin");
  revalidatePath("/today");
  return { ok: true, disabled };
}
