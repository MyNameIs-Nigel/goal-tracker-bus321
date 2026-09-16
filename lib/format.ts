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

/** The first word of a display name, for "<Owner first name> hasn't …" copy. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** "Joined <Mon D>" (docs/specs/people.md PPL-01). */
export function formatJoined(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return `Joined ${value.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}
