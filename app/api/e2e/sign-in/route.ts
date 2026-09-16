import { auth } from "@/lib/auth";
import { E2E_PASSWORD, E2E_ROLES, e2eEmail, isE2eEnabled } from "@/lib/e2e";
import type { E2eRole } from "@/lib/e2e";

function isE2eRole(value: unknown): value is E2eRole {
  return E2E_ROLES.includes(value as E2eRole);
}

/**
 * AUTH-09/10/11 — 404 outside test mode. In test mode, signs in as the
 * seeded `<role>@e2e.local` user (the same endpoint the sign-in page's test
 * buttons use) and sets the session cookie via Better Auth's own sign-in
 * flow, so the cookie is signed exactly the way `getSession` expects.
 */
export async function POST(request: Request) {
  if (!isE2eEnabled()) {
    return new Response(null, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!isE2eRole(body?.role)) {
    return Response.json({ error: "invalid role" }, { status: 400 });
  }

  return auth.api.signInEmail({
    body: { email: e2eEmail(body.role), password: E2E_PASSWORD },
    asResponse: true,
  });
}
