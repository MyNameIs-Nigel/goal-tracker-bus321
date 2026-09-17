/** docs/DATA_MODEL.md § Contract day (DT-01). */
import { compareDates, daysBetween, formatMonthLong } from "@/lib/dates";

export function contractDayLabel(
  today: string,
  contract: { contractStart: string | null; contractEnd: string | null },
): string | null {
  const { contractStart, contractEnd } = contract;
  if (!contractStart) return null;

  if (compareDates(today, contractStart) < 0) {
    const days = daysBetween(today, contractStart);
    return `Contract starts in ${days} day${days === 1 ? "" : "s"}`;
  }

  if (contractEnd && compareDates(today, contractEnd) > 0) {
    return `Contract ended ${formatMonthLong(contractEnd)}`;
  }

  const day = daysBetween(contractStart, today) + 1;
  if (contractEnd) {
    const total = daysBetween(contractStart, contractEnd) + 1;
    return `Day ${day} of ${total}`;
  }
  return `Day ${day}`;
}
