/**
 * Test-mode seed (docs/TESTING.md § E2E setup). Used by `POST /api/e2e/reset`.
 *
 * Truncates every app table (including Better Auth's) and reseeds: three
 * users — owner@e2e.local, partner@e2e.local, viewer@e2e.local, created
 * through Better Auth's own sign-up so their `account` row and password hash
 * are real and `POST /api/e2e/sign-in` can sign in as them — plus
 * settings.contract_start = 2026-09-19 and two empty documents.
 */
import "server-only";

import { eq, sql } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { E2E_PASSWORD, E2E_ROLES, e2eEmail } from "@/lib/e2e";

import { db } from "./client";
import {
  account,
  completions,
  documents,
  exceptions,
  goals,
  partnerCheckins,
  session,
  settings,
  user,
  verification,
} from "./schema";

export async function seedE2e() {
  await db.execute(
    sql`TRUNCATE TABLE
      ${completions}, ${exceptions}, ${goals},
      ${partnerCheckins}, ${documents}, ${settings},
      ${session}, ${account}, ${verification}, ${user}
    RESTART IDENTITY CASCADE`,
  );

  for (const role of E2E_ROLES) {
    await auth.api.signUpEmail({
      body: {
        email: e2eEmail(role),
        password: E2E_PASSWORD,
        name: `Test ${role[0].toUpperCase()}${role.slice(1)}`,
      },
    });
    await db
      .update(user)
      .set({ role })
      .where(eq(user.email, e2eEmail(role)));
  }

  await db.insert(documents).values([{ key: "vision" }, { key: "contract" }]);
  await db.insert(settings).values({ id: 1, contractStart: "2026-09-19" });
}
