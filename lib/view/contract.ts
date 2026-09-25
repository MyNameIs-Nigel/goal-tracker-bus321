/** Pure labels for /contract (docs/specs/contract-and-vision.md § Formats). */
import { APP_TIMEZONE } from "@/lib/clock";
import { formatMonthShort, formatMonthShortYear } from "@/lib/dates";

export function contractRangeLabel(contract: {
  contractStart: string | null;
  contractEnd: string | null;
}): string {
  const { contractStart, contractEnd } = contract;
  if (!contractStart) return "No contract dates yet";
  if (!contractEnd) return `Starts ${formatMonthShortYear(contractStart)}`;
  if (contractStart.slice(0, 4) === contractEnd.slice(0, 4)) {
    return `${formatMonthShort(contractStart)} – ${formatMonthShortYear(contractEnd)}`;
  }
  return `${formatMonthShortYear(contractStart)} – ${formatMonthShortYear(contractEnd)}`;
}

/** CV-05 — "Last updated Sep 18"; null until the first save. */
export function lastUpdatedLabel(updatedAt: string | null): string | null {
  if (!updatedAt) return null;
  const day = new Date(updatedAt).toLocaleDateString("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric",
  });
  return `Last updated ${day}`;
}

export function partnersLabel(names: readonly string[]): string {
  return `Accountability partners: ${names.length ? names.join(", ") : "none yet"}`;
}
