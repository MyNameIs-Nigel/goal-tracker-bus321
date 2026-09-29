import { loadExportPage } from "@/lib/export-page";
import { csvFileName, toCsv } from "@/lib/view/export";

/** EXP-14 — the report as a CSV download, for the session's own team only. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const { data, ownerName } = await loadExportPage({
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    given: params.get("given") ?? undefined,
  });
  return new Response(toCsv(data.records), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFileName(ownerName, data.range)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
