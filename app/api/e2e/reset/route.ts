import { seedE2e } from "@/db/seed.e2e";
import { setFixedNow } from "@/lib/clock";
import { isE2eEnabled } from "@/lib/e2e";

/**
 * AUTH-10/11 — 404 outside test mode. In test mode, empties and reseeds
 * every app table and, when `now` is given, pins `lib/clock.ts` to it until
 * the next reset.
 */
export async function POST(request: Request) {
  if (!isE2eEnabled()) {
    return new Response(null, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const now = typeof body?.now === "string" ? body.now : null;

  await seedE2e();
  setFixedNow(now);

  return Response.json({ ok: true });
}
