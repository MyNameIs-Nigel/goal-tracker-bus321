/**
 * Data for the export (docs/specs/export.md): always the session's own team
 * (EXP-16) — there is no team parameter to read.
 */
import "server-only";

import { today } from "@/lib/clock";
import {
  listCheckinNotesBetween,
  listCheckinsMadeBetween,
  listPartners,
  type PartnerSummary,
} from "@/lib/queries/checkins";
import { getDocuments } from "@/lib/queries/documents";
import { getTrackingData } from "@/lib/queries/tracking";
import { loadOwnTeam } from "@/lib/team-page";
import { buildExport, parseRange, type ExportData } from "@/lib/view/export";

export type ExportParams = {
  from?: string | string[];
  to?: string | string[];
  given?: string | string[];
};

export type ExportPage = {
  data: ExportData;
  ownerName: string;
  given: boolean;
  documents: { vision: string; contract: string };
  csvHref: string;
};

export async function loadExportPage(
  params: ExportParams,
): Promise<ExportPage> {
  const { me, team } = await loadOwnTeam();
  const todayDate = today();
  const contract = {
    contractStart: team.contractStart,
    contractEnd: team.contractEnd,
  };
  const given = params.given === "1";

  const [tracking, partners, documents] = await Promise.all([
    getTrackingData([team.id]).then((map) => map.get(team.id)!),
    listPartners(team.ownerId),
    getDocuments(team.id),
  ]);
  const range = parseRange(params, {
    today: todayDate,
    contract,
    goals: tracking.goals,
  });
  const [received, made] = await Promise.all([
    listCheckinNotesBetween(team.id, range.from, range.to),
    given
      ? listCheckinsMadeBetween(me.id, range.from, range.to)
      : Promise.resolve(null),
  ]);

  // Current partners, plus anyone who has since left but checked in.
  const people = new Map<string, PartnerSummary>(
    partners.map((person) => [person.id, person]),
  );
  for (const checkin of received) {
    if (!people.has(checkin.userId)) {
      people.set(checkin.userId, {
        id: checkin.userId,
        name: checkin.name,
        image: null,
      });
    }
  }

  const query = new URLSearchParams({ from: range.from, to: range.to });
  if (given) query.set("given", "1");

  return {
    data: buildExport({
      ownerName: team.ownerName,
      range,
      today: todayDate,
      ...tracking,
      contract,
      partners: [...people.values()],
      received,
      given: made,
    }),
    ownerName: team.ownerName,
    given,
    documents: {
      vision: documents.vision.bodyHtml,
      contract: documents.contract.bodyHtml,
    },
    csvHref: `/export/csv?${query}`,
  };
}
