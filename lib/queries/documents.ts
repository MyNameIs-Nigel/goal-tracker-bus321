/**
 * Reads for `documents` and `settings` (docs/DATA_MODEL.md § documents,
 * § settings) as the /contract page shows them.
 */
import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { documents, settings, user } from "@/db/schema";

export type DocumentKey = "vision" | "contract";

export type DocumentView = {
  key: DocumentKey;
  bodyHtml: string;
  /** ISO instant of the last save; null until the owner has saved once. */
  updatedAt: string | null;
  updatedByName: string | null;
};

export type ContractWindow = {
  contractStart: string | null;
  contractEnd: string | null;
};

export async function getDocuments(): Promise<
  Record<DocumentKey, DocumentView>
> {
  const rows = await db
    .select({
      key: documents.key,
      bodyHtml: documents.bodyHtml,
      updatedAt: documents.updatedAt,
      updatedBy: documents.updatedBy,
      updatedByName: user.name,
    })
    .from(documents)
    .leftJoin(user, eq(documents.updatedBy, user.id));

  const empty = (key: DocumentKey): DocumentView => ({
    key,
    bodyHtml: "",
    updatedAt: null,
    updatedByName: null,
  });
  const result = { vision: empty("vision"), contract: empty("contract") };
  for (const row of rows) {
    if (row.key !== "vision" && row.key !== "contract") continue;
    result[row.key] = {
      key: row.key,
      bodyHtml: row.bodyHtml,
      updatedAt: row.updatedBy ? row.updatedAt.toISOString() : null,
      updatedByName: row.updatedBy ? row.updatedByName : null,
    };
  }
  return result;
}

export async function getContractWindow(): Promise<ContractWindow> {
  const [row] = await db.select().from(settings).limit(1);
  return {
    contractStart: row?.contractStart ?? null,
    contractEnd: row?.contractEnd ?? null,
  };
}
