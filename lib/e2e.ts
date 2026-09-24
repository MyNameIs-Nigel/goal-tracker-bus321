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

/** The fake students (ADR-0005 T6). Dana is not seeded: she signs up on first use. */
export type E2eStudent = "avery" | "blake" | "casey" | "dana";

export const SEEDED_STUDENTS = ["avery", "blake", "casey"] as const;

export type SeededStudent = (typeof SEEDED_STUDENTS)[number];

export const E2E_NAMES: Record<E2eStudent, string> = {
  avery: "Avery Adams",
  blake: "Blake Brown",
  casey: "Casey Clark",
  dana: "Dana Diaz",
};

/** Fixed, so E2E tests can build `/team/<id>` URLs without a lookup. */
export const E2E_TEAM_IDS: Record<SeededStudent, string> = {
  avery: "00000000-0000-4000-8000-00000000000a",
  blake: "00000000-0000-4000-8000-00000000000b",
  casey: "00000000-0000-4000-8000-00000000000c",
};

export function isE2eStudent(value: unknown): value is E2eStudent {
  return typeof value === "string" && Object.hasOwn(E2E_NAMES, value);
}

/** Not a real secret — only ever used against the fake test-mode accounts. */
export const E2E_PASSWORD = "e2e-test-password-not-a-secret";

export function e2eEmail(student: E2eStudent): string {
  return `${student}@e2e.local`;
}
