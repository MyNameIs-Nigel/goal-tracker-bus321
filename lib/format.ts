import { APP_TIMEZONE } from "@/lib/clock";

/** Up to two initials from a display name, for an avatar fallback. */
export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

/** The first word of a display name, for "<First name> hasn't …" copy. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** "Team Avery" — a team is always named for its owner (ADR-0005 T1). */
export function teamName(ownerName: string): string {
  return `Team ${firstName(ownerName)}`;
}

/** "8:12 PM" in America/Denver (docs/specs/partner-check-ins.md § UI). */
export function formatTime(instant: Date | string): string {
  const value = typeof instant === "string" ? new Date(instant) : instant;
  return value.toLocaleTimeString("en-US", {
    timeZone: APP_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}
