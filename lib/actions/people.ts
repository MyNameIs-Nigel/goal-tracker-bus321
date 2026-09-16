"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { user } from "@/db/schema";
import { ForbiddenError, requireUser } from "@/lib/dal";

export type SetRoleResult =
  | { ok: true; name: string; role: "partner" | "viewer" }
  | { ok: false; error: string };

/**
 * PPL-02/03 — owner promotes/demotes a viewer or partner.
 * ROLE-03 — rejected for anyone but the owner.
 * ROLE-06 — the owner can't be changed, by targeting them or by role "owner".
 */
export async function setRole(
  userId: string,
  role: string,
): Promise<SetRoleResult> {
  const currentUser = await requireUser();
  if (currentUser.role !== "owner") throw new ForbiddenError();

  if (role !== "partner" && role !== "viewer") {
    return { ok: false, error: "Invalid role." };
  }
  if (userId === currentUser.id) {
    return { ok: false, error: "You can't change your own role." };
  }

  const [target] = await db.select().from(user).where(eq(user.id, userId));
  if (!target || target.role === "owner") {
    return { ok: false, error: "That role can't be changed." };
  }

  await db.update(user).set({ role }).where(eq(user.id, userId));
  revalidatePath("/people");

  return { ok: true, name: target.name, role };
}
