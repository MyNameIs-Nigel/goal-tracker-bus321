/**
 * Test mode is double-gated (docs/ARCHITECTURE.md § Environments): the
 * `E2E_AUTH=1` env var, and `VERCEL_ENV` not being `production`. Production
 * never sets the flag, so `VERCEL_ENV` is the second lock.
 */
export function isE2eEnabled(): boolean {
  return (
    process.env.E2E_AUTH === "1" && process.env.VERCEL_ENV !== "production"
  );
}

export type E2eRole = "owner" | "partner" | "viewer";

export const E2E_ROLES: readonly E2eRole[] = ["owner", "partner", "viewer"];

/** Not a real secret — only ever used against the seeded test-mode accounts. */
export const E2E_PASSWORD = "e2e-test-password-not-a-secret";

export function e2eEmail(role: E2eRole): string {
  return `${role}@e2e.local`;
}
