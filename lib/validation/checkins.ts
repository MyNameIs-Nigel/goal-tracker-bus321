/**
 * PCI-03/04 — shared by the save-note Server Action and its form. Kept out
 * of lib/actions/checkins.ts because a "use server" file's exports must all
 * be async Server Actions.
 */
export const NOTE_MAX_LENGTH = 280;

export function validateNote(
  raw: string,
): { note: string | null } | { error: string } {
  const note = raw.trim();
  if (note.length > NOTE_MAX_LENGTH) {
    return { error: `Keep the note under ${NOTE_MAX_LENGTH} characters` };
  }
  return { note: note || null };
}
