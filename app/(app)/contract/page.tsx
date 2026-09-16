import { db } from "@/db/client";
import { settings } from "@/db/schema";

export default async function ContractPage() {
  const [row] = await db.select().from(settings).limit(1);

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">Contract</h1>
      <p className="text-muted">
        {row?.contractStart
          ? `Contract starts ${row.contractStart}.`
          : "No contract dates set yet."}
      </p>
      <p className="text-muted">
        The vision and contract editor arrives in Phase 3.
      </p>
    </div>
  );
}
