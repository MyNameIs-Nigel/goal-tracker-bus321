/**
 * Reads for a team's `documents` (docs/DATA_MODEL.md § documents) as the
 * contract pages show them. A missing row is an empty, never-saved document.
 */
import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { documents } from "@/db/schema";

export type DocumentKey = "vision" | "contract";

export type DocumentView = {
  key: DocumentKey;
  bodyHtml: string;
  /** ISO instant of the last save; null until the owner has saved once. */
  updatedAt: string | null;
};

export type ContractWindow = {
  contractStart: string | null;
  contractEnd: string | null;
};

export async function getDocuments(
  teamId: string,
): Promise<Record<DocumentKey, DocumentView>> {
  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.teamId, teamId));

  const empty = (key: DocumentKey): DocumentView => ({
    key,
    bodyHtml: "",
    updatedAt: null,
  });
  const result = { vision: empty("vision"), contract: empty("contract") };
  for (const row of rows) {
    if (row.key !== "vision" && row.key !== "contract") continue;
    result[row.key] = {
      key: row.key,
      bodyHtml: row.bodyHtml,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
  return result;
}
