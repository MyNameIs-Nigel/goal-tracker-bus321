/** Data for a team's contract page (docs/specs/contract-and-vision.md). */
import "server-only";

import { listPartners } from "@/lib/queries/checkins";
import {
  getDocuments,
  type ContractWindow,
  type DocumentKey,
  type DocumentView,
} from "@/lib/queries/documents";
import type { TeamSummary } from "@/lib/queries/teams";
import { sanitizeDocumentHtml } from "@/lib/sanitize";

export async function loadContractPage(team: TeamSummary): Promise<{
  contract: ContractWindow;
  documents: Record<DocumentKey, DocumentView>;
  partners: string[];
}> {
  const [documents, partners] = await Promise.all([
    getDocuments(team.id),
    listPartners(team.ownerId),
  ]);

  // Stored HTML is already sanitized (lib/actions/documents.ts); sanitizing
  // again on the way out is the belt-and-braces in ARCHITECTURE.md § Rich text.
  for (const key of ["vision", "contract"] as const) {
    documents[key].bodyHtml = sanitizeDocumentHtml(documents[key].bodyHtml);
  }

  return {
    contract: {
      contractStart: team.contractStart,
      contractEnd: team.contractEnd,
    },
    documents,
    partners: partners.map((partner) => partner.name),
  };
}
