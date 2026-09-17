import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic redirect only (docs/ARCHITECTURE.md § Request flow) — cookie
 * presence, never a database check. `(app)/layout.tsx`'s `requireUser()` is
 * the actual authorization boundary.
 */
export function proxy(request: NextRequest) {
  const hasSession = Boolean(getSessionCookie(request));
  const { pathname } = request.nextUrl;

  if (pathname === "/" && hasSession) {
    return NextResponse.redirect(new URL("/today", request.url));
  }

  if (pathname !== "/" && !hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon(?:/|$)|opengraph-image(?:/|$)).*)",
  ],
};
