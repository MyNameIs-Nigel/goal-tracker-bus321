import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  E2E_NAMES,
  E2E_PASSWORD,
  e2eEmail,
  isE2eEnabled,
  isE2eStudent,
} from "@/lib/e2e";

/**
 * AUTH-09/10/11 — 404 outside test mode. In test mode, signs in as a fake
 * student (the same endpoint the sign-in page's test buttons use) and sets the
 * session cookie via Better Auth's own sign-in flow, so the cookie is signed
 * exactly the way `getSession` expects. A student who doesn't exist yet
 * (Dana) is signed up first, the way Google's first sign-in creates one.
 */
export async function POST(request: Request) {
  if (!isE2eEnabled()) {
    return new Response(null, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const student: unknown = body?.student;
  if (!isE2eStudent(student)) {
    return Response.json({ error: "invalid student" }, { status: 400 });
  }
  const email = e2eEmail(student);

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email));
  if (!existing) {
    await auth.api.signUpEmail({
      body: { email, password: E2E_PASSWORD, name: E2E_NAMES[student] },
    });
  }

  return auth.api.signInEmail({
    body: { email, password: E2E_PASSWORD },
    asResponse: true,
  });
}
