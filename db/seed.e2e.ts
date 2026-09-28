/**
 * Test-mode seed (docs/TESTING.md § E2E setup). Used by `POST /api/e2e/reset`.
 *
 * Truncates every app table (including Better Auth's) and reseeds three fake
 * students — Avery, Blake and Casey, created through Better Auth's own sign-up
 * so their `account` row and password hash are real and
 * `POST /api/e2e/sign-in` can sign in as them — each with a team (fixed ids,
 * `contract_start = 2026-09-19`). With `demo`, adds the fake demo class.
 */
import "server-only";

import { eq, sql } from "drizzle-orm";

import { now, today } from "@/lib/clock";
import { auth } from "@/lib/auth";
import {
  E2E_NAMES,
  E2E_PASSWORD,
  E2E_TEAM_IDS,
  SEEDED_STUDENTS,
  e2eEmail,
  type SeededStudent,
} from "@/lib/e2e";
import { periodFor } from "@/lib/periods";

import { db } from "./client";
import { buildDemo } from "./demo.e2e";
import {
  account,
  admins,
  checkins,
  completions,
  documents,
  exceptions,
  goals,
  session,
  teams,
  user,
  verification,
} from "./schema";

export async function seedE2e({ demo = false }: { demo?: boolean } = {}) {
  await db.execute(
    sql`TRUNCATE TABLE
      ${checkins}, ${completions}, ${exceptions}, ${goals}, ${documents},
      ${teams}, ${admins}, ${session}, ${account}, ${verification}, ${user}
    RESTART IDENTITY CASCADE`,
  );

  const userIds = {} as Record<SeededStudent, string>;
  for (const student of SEEDED_STUDENTS) {
    const { user: created } = await auth.api.signUpEmail({
      body: {
        email: e2eEmail(student),
        password: E2E_PASSWORD,
        name: E2E_NAMES[student],
      },
    });
    userIds[student] = created.id;
  }

  await db.insert(teams).values(
    SEEDED_STUDENTS.map((student) => ({
      id: E2E_TEAM_IDS[student],
      ownerId: userIds[student],
      contractStart: "2026-09-19",
    })),
  );

  // Avery is the test admin (docs/specs/admin.md).
  await db.insert(admins).values({ email: e2eEmail("avery") });

  if (demo) await seedDemo(userIds);
}

async function seedDemo(userIds: Record<SeededStudent, string>) {
  const { start, teams: demo } = buildDemo(today(), now().toISOString());
  const updatedAt = now();

  for (const student of SEEDED_STUDENTS) {
    const teamId = E2E_TEAM_IDS[student];
    const team = demo[student];

    await db
      .update(teams)
      .set({ contractStart: start, contractEnd: null })
      .where(eq(teams.id, teamId));

    const inserted = await db
      .insert(goals)
      .values(
        team.goals.map((goal, index) => ({
          teamId,
          title: goal.title,
          cadence: goal.cadence,
          startsOn: start,
          sortOrder: index,
        })),
      )
      .returning({ id: goals.id });

    const done = team.goals.flatMap((goal, index) =>
      goal.done.map((date) => ({
        goalId: inserted[index].id,
        periodStart: periodFor(goal.cadence, date).start,
      })),
    );
    if (done.length) await db.insert(completions).values(done);

    if (team.exceptions.length) {
      await db
        .insert(exceptions)
        .values(team.exceptions.map((e) => ({ ...e, teamId })));
    }

    await db.insert(documents).values([
      { teamId, key: "vision", bodyHtml: team.vision, updatedAt },
      { teamId, key: "contract", bodyHtml: team.contract, updatedAt },
    ]);

    await db.insert(checkins).values(
      team.checkins.map((checkin) => ({
        teamId,
        userId: userIds[checkin.by],
        date: checkin.date,
        note: checkin.note,
        createdAt: new Date(checkin.at),
        updatedAt: new Date(checkin.at),
      })),
    );
  }
}
