/**
 * Where a team's pages live (docs/specs/teams.md): your own team's are the
 * top-level routes; a teammate's are under `/team/<id>`. Pure.
 */
export type TeamPaths = {
  today: string;
  contract: string;
  day: (date: string) => string;
  history: (month?: string) => string;
};

/** `null` is the signed-in student's own team. */
export function teamPaths(teamId: string | null): TeamPaths {
  const base = teamId ? `/team/${teamId}` : "";
  return {
    today: teamId ? base : "/today",
    contract: `${base}/contract`,
    day: (date) => `${base}/day/${date}`,
    history: (month) => `${base}/history${month ? `?month=${month}` : ""}`,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** TEAM-05 — anything else is a 404 before it reaches the database. */
export function isTeamId(value: string): boolean {
  return UUID.test(value);
}
