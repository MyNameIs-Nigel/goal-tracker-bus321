/**
 * Which team a page shows (docs/specs/teams.md): your own for the top-level
 * routes; a teammate's for `/team/<id>/…`, where an unknown id is a 404
 * (TEAM-05) and your own id goes to your own route (TEAM-04).
 */
import "server-only";

import { notFound, redirect } from "next/navigation";

import { requireUser, type SessionUser } from "@/lib/dal";
import { getTeam, type TeamSummary } from "@/lib/queries/teams";

export async function loadOwnTeam(): Promise<{
  me: SessionUser;
  team: TeamSummary;
}> {
  const me = await requireUser();
  return { me, team: (await getTeam(me.teamId))! };
}

export async function loadTeammateTeam(
  teamId: string,
  ownRoute: string,
): Promise<{ me: SessionUser; team: TeamSummary }> {
  const me = await requireUser();
  const team = await getTeam(teamId);
  if (!team) notFound();
  if (team.ownerId === me.id) redirect(ownRoute);
  return { me, team };
}
