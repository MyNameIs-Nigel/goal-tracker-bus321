import { seedE2e } from "@/db/seed.e2e";
import { setFixedNow } from "@/lib/clock";
import { isE2eEnabled } from "@/lib/e2e";

/**
 * AUTH-10/11/13 — 404 outside test mode. In test mode, pins `lib/clock.ts`
 * to `now` when given (until the next reset), then empties and reseeds every
 * app table — with the fake demo class when `demo` is true, dated from that
 * clock.
 */
export async function POST(request: Request) {
  if (!isE2eEnabled()) {
    return new Response(null, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  setFixedNow(typeof body?.now === "string" ? body.now : null);
  await seedE2e({ demo: body?.demo === true });

  return Response.json({ ok: true });
}
