import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { user } from "@/db/schema";
import { firstName } from "@/lib/format";

/** For "<Owner first name> hasn't added goals yet." style empty states. */
export async function getOwnerFirstName(): Promise<string> {
  const [row] = await db.select().from(user).where(eq(user.role, "owner"));
  return row ? firstName(row.name) : "the owner";
}
