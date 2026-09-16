/**
 * GOAL-03 — shared by add and edit. Kept out of lib/actions/goals.ts because
 * a "use server" file's exports must all be async Server Actions.
 */
export function validateGoalInput(input: {
  title: string;
  description: string;
}): string | null {
  const title = input.title.trim();
  if (!title) return "Title is required";
  if (title.length > 120) return "Keep the title under 120 characters";
  if (input.description.length > 500) {
    return "Keep the description under 500 characters";
  }
  return null;
}
