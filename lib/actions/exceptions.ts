"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { exceptions } from "@/db/schema";
import { ForbiddenError, requireUser } from "@/lib/dal";
import type { ExceptionRecord } from "@/lib/view/day";
import { validateExceptionInput } from "@/lib/validation/exceptions";

export type ExceptionInput = {
  scope: "whole-day" | "goal";
  goalId: string | null;
  startsOn: string;
  endsOn: string;
  reason: string;
};

export type ExceptionActionResult =
  { ok: true; exception: ExceptionRecord } | { ok: false; error: string };

export type SimpleActionResult = { ok: true } | { ok: false; error: string };

async function requireOwnerCaller() {
  const user = await requireUser();
  if (user.role !== "owner") throw new ForbiddenError();
  return user;
}

/** EXC-02/03 — owner marks a whole-day or goal-specific exception. */
export async function createException(
  input: ExceptionInput,
): Promise<ExceptionActionResult> {
  await requireOwnerCaller();

  const error = validateExceptionInput(input);
  if (error) return { ok: false, error };

  if (input.scope === "goal" && !input.goalId) {
    return { ok: false, error: "Choose a goal." };
  }
  const goalId = input.scope === "goal" ? input.goalId : null;

  const [row] = await db
    .insert(exceptions)
    .values({
      goalId,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      reason: input.reason.trim(),
    })
    .returning();

  revalidatePath("/today");

  return {
    ok: true,
    exception: {
      id: row.id,
      goalId: row.goalId,
      startsOn: row.startsOn,
      endsOn: row.endsOn,
      reason: row.reason,
    },
  };
}

/** EXC-06 — owner removes an exception. */
export async function removeException(id: string): Promise<SimpleActionResult> {
  await requireOwnerCaller();

  await db.delete(exceptions).where(eq(exceptions.id, id));
  revalidatePath("/today");

  return { ok: true };
}
