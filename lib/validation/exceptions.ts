/**
 * EXC-05 — shared by the create-exception Server Action and its form.
 * Kept out of lib/actions/exceptions.ts because a "use server" file's
 * exports must all be async Server Actions.
 */
import { compareDates, daysBetween } from "@/lib/dates";

export function validateExceptionInput(input: {
  startsOn: string;
  endsOn: string;
  reason: string;
}): string | null {
  const reason = input.reason.trim();
  if (!reason) return "A reason is required";
  if (reason.length > 280) return "Keep the reason under 280 characters";
  if (compareDates(input.endsOn, input.startsOn) < 0) {
    return "End date can't be before start date";
  }
  if (daysBetween(input.startsOn, input.endsOn) > 31) {
    return "Exceptions can cover at most 31 days";
  }
  return null;
}
