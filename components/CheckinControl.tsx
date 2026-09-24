"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";

import { checkIn, saveNote } from "@/lib/actions/checkins";
import { formatTime } from "@/lib/format";
import type { CheckinRecord } from "@/lib/queries/checkins";
import { NOTE_MAX_LENGTH, validateNote } from "@/lib/validation/checkins";

/**
 * PCI-02/03/04/08 — your check-in on one teammate's team for today: one tap
 * to check in, then an optional note. `children` is the row's name block.
 */
export default function CheckinControl({
  teamId,
  firstName,
  date,
  checkin,
  onChanged,
  children,
}: {
  teamId: string;
  firstName: string;
  date: string;
  checkin: CheckinRecord | null;
  onChanged: (checkin: CheckinRecord) => void;
  children: ReactNode;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(checkin?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // The control that was tapped unmounts (Check in, Save note, Cancel), so
  // hand focus to the note button rather than letting it fall to the page.
  const noteButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (!noteOpen && restoreFocus.current) {
      restoreFocus.current = false;
      noteButton.current?.focus();
    }
  }, [noteOpen, checkin]);

  function closeNote() {
    restoreFocus.current = true;
    setNoteOpen(false);
  }

  function handleCheckIn() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await checkIn(teamId, date);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      restoreFocus.current = true;
      onChanged(result.checkin);
    });
  }

  function handleSaveNote(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    const validated = validateNote(note);
    if ("error" in validated) {
      setError(validated.error);
      return;
    }
    startTransition(async () => {
      const result = await saveNote(teamId, date, note);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onChanged(result.checkin);
      closeNote();
    });
  }

  const noteId = `note-${teamId}`;

  return (
    <>
      <div className="flex items-center gap-3">
        {children}
        {checkin ? (
          <span className="shrink-0 text-sm font-medium text-accent">
            Checked ✓ {formatTime(checkin.createdAt)}
          </span>
        ) : (
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={pending}
            aria-label={`Check in on ${firstName}`}
            className="ui-hover-solid shrink-0 rounded-full bg-accent px-4 text-sm font-medium text-on-accent disabled:opacity-60"
          >
            Check in
          </button>
        )}
      </div>

      {checkin &&
        (noteOpen ? (
          <form onSubmit={handleSaveNote} className="flex flex-col gap-2 pl-11">
            <label htmlFor={noteId} className="text-sm font-medium">
              Note for {firstName}
            </label>
            <textarea
              id={noteId}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              autoFocus
              rows={2}
              className="ui-hover-edge rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={pending}
                className="ui-hover-surface rounded-full border border-border px-4 text-sm font-medium disabled:opacity-60"
              >
                Save note
              </button>
              <button
                type="button"
                onClick={() => {
                  setNote(checkin.note ?? "");
                  setError(null);
                  closeNote();
                }}
                className="ui-hover-accent px-2 text-sm font-medium text-muted"
              >
                Cancel
              </button>
              <span className="text-xs text-muted">
                {note.length}/{NOTE_MAX_LENGTH}
              </span>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 pl-11">
            {checkin.note && (
              <p className="text-sm text-muted">{checkin.note}</p>
            )}
            <button
              ref={noteButton}
              type="button"
              onClick={() => setNoteOpen(true)}
              className="ui-hover-accent text-sm font-medium text-muted underline"
            >
              {checkin.note ? "Edit note" : "Add a note"}
            </button>
          </div>
        ))}

      {error && (
        <p role="alert" className="pl-11 text-xs text-red-600">
          {error}
        </p>
      )}
    </>
  );
}
