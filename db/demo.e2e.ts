/**
 * The fake demo class (docs/TESTING.md § Demo data, AUTH-13): two weeks of
 * believable activity for Avery, Blake and Casey, dated relative to `today`
 * so it always looks current. Pure — `db/seed.e2e.ts` writes it.
 */
import { addDays, compareDates, startOfWeek } from "@/lib/dates";
import type { Cadence } from "@/lib/periods";
import type { SeededStudent } from "@/lib/e2e";

export type DemoGoal = {
  title: string;
  cadence: Cadence;
  /** Period starts with a completion. */
  done: string[];
};

export type DemoCheckin = {
  by: SeededStudent;
  date: string;
  /** ISO instant; past days at 8 PM Denver. */
  at: string;
  note: string | null;
};

export type DemoTeam = {
  goals: DemoGoal[];
  exceptions: { startsOn: string; endsOn: string; reason: string }[];
  vision: string;
  contract: string;
  checkins: DemoCheckin[];
};

const DAYS = 14;

function days(today: string, skip: (offset: number) => boolean): string[] {
  const out: string[] = [];
  for (let offset = DAYS - 1; offset >= 0; offset--) {
    if (!skip(offset)) out.push(addDays(today, -offset));
  }
  return out;
}

/** Mondays of the weeks that ended before today's week. */
function pastWeeks(today: string): string[] {
  const out: string[] = [];
  for (
    let monday = startOfWeek(addDays(today, -(DAYS - 1)));
    compareDates(addDays(monday, 6), today) < 0;
    monday = addDays(monday, 7)
  ) {
    out.push(monday);
  }
  return out;
}

const PEOPLE: readonly SeededStudent[] = ["avery", "blake", "casey"];

const NOTES = [
  "Nice streak, keep it up",
  "Saw the gym check — proud of you",
  "Tomorrow's a new day",
];

export function buildDemo(
  today: string,
  nowIso: string,
): { start: string; teams: Record<SeededStudent, DemoTeam> } {
  const start = addDays(today, -(DAYS - 1));
  const weeks = pastWeeks(today);

  const checkinsOn = (owner: SeededStudent): DemoCheckin[] => {
    const out: DemoCheckin[] = [];
    PEOPLE.filter((p) => p !== owner).forEach((by, pair) => {
      for (let offset = DAYS - 1; offset >= 1; offset--) {
        if ((offset + pair + PEOPLE.indexOf(owner)) % 5 === 0) continue;
        const date = addDays(today, -offset);
        out.push({
          by,
          date,
          at: `${date}T20:00:00-06:00`,
          note: offset % 4 === 0 ? NOTES[offset % NOTES.length] : null,
        });
      }
    });
    return out;
  };

  return {
    start,
    teams: {
      avery: {
        goals: [
          {
            title: "Read 20 pages",
            cadence: "daily",
            done: days(today, (o) => o === 5 || o === 3),
          },
          {
            title: "Workout 30 minutes",
            cadence: "daily",
            done: days(today, (o) => o === 5 || o === 3 || o === 0),
          },
          {
            title: "Journal",
            cadence: "daily",
            done: days(today, (o) => o === 3 || o === 0),
          },
          { title: "Call home", cadence: "weekly", done: weeks },
          { title: "Review budget", cadence: "monthly", done: [] },
        ],
        exceptions: [
          {
            startsOn: addDays(today, -3),
            endsOn: addDays(today, -3),
            reason: "Flu",
          },
        ],
        vision:
          "<p>Someone who <strong>finishes what they start</strong> and shows up for the people counting on them.</p>",
        contract:
          "<h2>Consequence</h2><p>More than five failures in a month means I buy the team lunch.</p><ul><li><p>Sickness and travel are exceptions, with a reason.</p></li></ul>",
        checkins: [
          ...checkinsOn("avery"),
          { by: "blake", date: today, at: nowIso, note: NOTES[0] },
        ],
      },
      blake: {
        goals: [
          {
            title: "Practice Spanish",
            cadence: "daily",
            done: days(today, () => false),
          },
          {
            title: "Lights out by 11",
            cadence: "daily",
            done: days(today, () => false),
          },
          { title: "Long run", cadence: "weekly", done: weeks },
        ],
        exceptions: [],
        vision:
          "<p>Fluent enough to order dinner in Madrid without pointing.</p>",
        contract:
          "<p>If I miss more than five days, I run an extra 5K and post the proof.</p>",
        checkins: checkinsOn("blake"),
      },
      casey: {
        goals: [
          {
            title: "Meditate 10 minutes",
            cadence: "daily",
            done: days(today, () => false),
          },
          {
            title: "No phone before 9",
            cadence: "daily",
            done: days(today, (o) => o === 2 || o === 0),
          },
          { title: "Meal prep", cadence: "weekly", done: weeks.slice(1) },
        ],
        exceptions: [],
        vision: "<p>Calm mornings and a clear head for class.</p>",
        contract:
          "<p>Five failures in a month: I donate $20 to a cause my partners choose.</p>",
        checkins: checkinsOn("casey"),
      },
    },
  };
}
