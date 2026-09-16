/**
 * The owner-bootstrap rule (docs/adr/0001-initial-scope.md B3, AUTH-04):
 * whichever Google account's email matches `OWNER_EMAIL` becomes `owner`.
 * A pure, standalone module so it's unit-testable without constructing the
 * full Better Auth instance (which needs a database).
 */
export function isOwnerEmail(email: string): boolean {
  const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase();
  return Boolean(ownerEmail) && email.toLowerCase() === ownerEmail;
}
