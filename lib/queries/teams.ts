/**
 * Reads for `teams` (docs/DATA_MODEL.md § teams). Every student owns exactly
 * one; `ensureTeam` creates it the first time the student is seen.
 */
import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { teams, user } from "@/db/schema";
import { isTeamId } from "@/lib/paths";

export type TeamSummary = {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerImage: string | null;
  contractStart: string | null;
  contractEnd: string | null;
};

const TEAM_COLUMNS = {
  id: teams.id,
  ownerId: teams.ownerId,
  ownerName: user.name,
  ownerImage: user.image,
  contractStart: teams.contractStart,
  contractEnd: teams.contractEnd,
};

async function teamIdOf(ownerId: string): Promise<string | undefined> {
  const [row] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.ownerId, ownerId));
  return row?.id;
}

/** The owner's team id, creating the team on first use (TEAM-01). */
export async function ensureTeam(ownerId: string): Promise<string> {
  const existing = await teamIdOf(ownerId);
  if (existing) return existing;
  await db
    .insert(teams)
    .values({ ownerId })
    .onConflictDoNothing({ target: teams.ownerId });
  return (await teamIdOf(ownerId))!;
}

/** A team with its owner, or null — including for a malformed id (TEAM-05). */
export async function getTeam(teamId: string): Promise<TeamSummary | null> {
  if (!isTeamId(teamId)) return null;
  const [row] = await db
    .select(TEAM_COLUMNS)
    .from(teams)
    .innerJoin(user, eq(teams.ownerId, user.id))
    .where(eq(teams.id, teamId));
  return row ?? null;
}

/** Every team of an enabled student, by owner name (TEAM-02, ADM-03). */
export async function listTeams(): Promise<TeamSummary[]> {
  return db
    .select(TEAM_COLUMNS)
    .from(teams)
    .innerJoin(user, eq(teams.ownerId, user.id))
    .where(eq(user.disabled, false))
    .orderBy(asc(user.name));
}
