import ContractView from "@/components/ContractView";
import { requireUser } from "@/lib/dal";
import { listPartners } from "@/lib/queries/checkins";
import { getContractWindow, getDocuments } from "@/lib/queries/documents";
import { sanitizeDocumentHtml } from "@/lib/sanitize";

/** docs/specs/contract-and-vision.md — dates → vision → contract → partners. */
export default async function ContractPage() {
  const user = await requireUser();
  const [documents, contract, partners] = await Promise.all([
    getDocuments(),
    getContractWindow(),
    listPartners(),
  ]);

  // Stored HTML is already sanitized (lib/actions/documents.ts); sanitizing
  // again on the way out is the belt-and-braces in ARCHITECTURE.md § Rich text.
  for (const key of ["vision", "contract"] as const) {
    documents[key].bodyHtml = sanitizeDocumentHtml(documents[key].bodyHtml);
  }

  return (
    <ContractView
      role={user.role}
      contract={contract}
      documents={documents}
      partners={partners.map((partner) => partner.name)}
    />
  );
}
