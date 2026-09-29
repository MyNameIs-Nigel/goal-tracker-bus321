import { isAdmin } from "@/lib/queries/admin";

/** ADM-08 — whether a user being created should start disabled. */
export async function startsDisabled(
  email: string,
  testMode: boolean,
): Promise<boolean> {
  if (testMode) return false;
  return !(await isAdmin(email));
}
