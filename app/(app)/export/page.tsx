import type { Metadata } from "next";

import ExportView from "@/components/ExportView";
import { requireUser } from "@/lib/dal";
import { loadExportPage } from "@/lib/export-page";

/** Browsers name the saved PDF after the title (docs/specs/export.md). */
export async function generateMetadata(): Promise<Metadata> {
  const me = await requireUser();
  return { title: `Goal report — ${me.name}` };
}

/** docs/specs/export.md — your printable report, `?from=&to=&given=1`. */
export default async function ExportPage({
  searchParams,
}: PageProps<"/export">) {
  const { data, documents, given, csvHref } = await loadExportPage(
    await searchParams,
  );
  return (
    <ExportView
      data={data}
      documents={documents}
      given={given}
      csvHref={csvHref}
    />
  );
}
