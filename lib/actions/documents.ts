"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { documents, settings } from "@/db/schema";
import { now } from "@/lib/clock";
import { ForbiddenError, requireUser } from "@/lib/dal";
import { compareDates } from "@/lib/dates";
import type { ContractWindow, DocumentView } from "@/lib/queries/documents";
import { sanitizeDocumentHtml } from "@/lib/sanitize";
import { isValidCalendarDate } from "@/lib/validate-date";

const DOCUMENT_MAX_LENGTH = 20_000;

export type SaveDocumentResult =
  { ok: true; document: DocumentView } | { ok: false; error: string };

export type SaveContractDatesResult =
  { ok: true; contract: ContractWindow } | { ok: false; error: string };

async function requireOwnerCaller() {
  const user = await requireUser();
  if (user.role !== "owner") throw new ForbiddenError();
  return user;
}

/** CV-02/03/04 — owner saves a document; stored HTML is always sanitized. */
export async function saveDocument(
  key: string,
  html: string,
): Promise<SaveDocumentResult> {
  const user = await requireOwnerCaller();
  if (key !== "vision" && key !== "contract") {
    return { ok: false, error: "Unknown document." };
  }

  const bodyHtml = sanitizeDocumentHtml(html);
  if (bodyHtml.length > DOCUMENT_MAX_LENGTH) {
    return {
      ok: false,
      error: "This is too long — keep it under 20,000 characters",
    };
  }

  const instant = now();
  const [row] = await db
    .update(documents)
    .set({ bodyHtml, updatedAt: instant, updatedBy: user.id })
    .where(eq(documents.key, key))
    .returning();

  revalidatePath("/contract");
  return {
    ok: true,
    document: {
      key,
      bodyHtml: row.bodyHtml,
      updatedAt: row.updatedAt.toISOString(),
      updatedByName: user.name,
    },
  };
}

function parseDate(value: string): string | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isValidCalendarDate(trimmed) ? trimmed : undefined;
}

/** CV-07 — owner sets (or clears) the contract dates. */
export async function saveContractDates(
  start: string,
  end: string,
): Promise<SaveContractDatesResult> {
  await requireOwnerCaller();

  const contractStart = parseDate(start);
  const contractEnd = parseDate(end);
  if (contractStart === undefined || contractEnd === undefined) {
    return { ok: false, error: "Enter a valid date" };
  }
  if (
    contractStart &&
    contractEnd &&
    compareDates(contractEnd, contractStart) < 0
  ) {
    return { ok: false, error: "End date can't be before start date" };
  }

  const [row] = await db
    .update(settings)
    .set({ contractStart, contractEnd, updatedAt: now() })
    .where(eq(settings.id, 1))
    .returning();

  revalidatePath("/contract");
  revalidatePath("/today");
  return {
    ok: true,
    contract: {
      contractStart: row.contractStart,
      contractEnd: row.contractEnd,
    },
  };
}
