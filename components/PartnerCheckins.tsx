"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";

import { checkIn, saveNote } from "@/lib/actions/checkins";
import type { Role } from "@/lib/dal";
import { formatTime, initials } from "@/lib/format";
import type { CheckinRecord, PartnerSummary } from "@/lib/queries/checkins";
import { NOTE_MAX_LENGTH, validateNote } from "@/lib/validation/checkins";

function Avatar({ name, image }: { name: string; image: string | null }) {
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element -- Google avatar URL, any host
    <img
      src={image}
      alt=""
      className="h-8 w-8 shrink-0 rounded-full object-cover"
    />
  ) : (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold text-muted"
    >
      {initials(name)}
    </span>
  );
}

/** PCI-02/03/04 — the current partner's own row on today's page. */
function OwnRow({
  date,
  checkin,
  onChanged,
}: {
  date: string;
  checkin: CheckinRecord | null;
  onChanged: (checkin: CheckinRecord) => void;
}) {
  const [note, setNote] = useState(checkin?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleCheckIn() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await checkIn(date);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onChanged(result.checkin);
    });
  }

  function handleSaveNote(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setSaved(false);
    const validated = validateNote(note);
    if ("error" in validated) {
      setError(validated.error);
      return;
    }
    startTransition(async () => {
      const result = await saveNote(date, note);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      onChanged(result.checkin);
    });
  }

  if (!checkin) {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={handleCheckIn}
          disabled={pending}
          className="ui-hover-solid self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          I checked today
        </button>
        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSaveNote} className="flex flex-col gap-2">
      <label
        htmlFor="checkin-note"
        className="text-sm font-medium text-foreground"
      >
        Leave a note (optional)
      </label>
      <textarea
        id="checkin-note"
        value={note}
        onChange={(event) => {
          setNote(event.target.value);
          setSaved(false);
        }}
        rows={2}
        className="ui-hover-edge rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="ui-hover-surface rounded-full border border-border px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          Save note
        </button>
        <span className="text-xs text-muted">
          {note.length}/{NOTE_MAX_LENGTH}
        </span>
        {saved && <span className="text-xs text-accent">Saved</span>}
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}

/** PCI-01..08 / DT-16 — the "Accountability partners" section of a day page. */
export default function PartnerCheckins({
  date,
  todayDate,
  role,
  currentUserId,
  partners,
  checkins: initialCheckins,
}: {
  date: string;
  todayDate: string;
  role: Role;
  currentUserId: string;
  partners: readonly PartnerSummary[];
  checkins: readonly CheckinRecord[];
}) {
  const [checkins, setCheckins] = useState<CheckinRecord[]>([
    ...initialCheckins,
  ]);

  function handleChanged(checkin: CheckinRecord) {
    setCheckins((prev) => [
      ...prev.filter((c) => c.userId !== checkin.userId),
      checkin,
    ]);
  }

  const canAct = role === "partner" && date === todayDate;

  return (
    <section aria-labelledby="partners-heading" className="flex flex-col gap-2">
      <h2
        id="partners-heading"
        className="text-sm font-semibold uppercase tracking-wide text-muted"
      >
        Accountability partners
      </h2>

      {partners.length === 0 ? (
        <p className="text-muted">
          No partners yet.
          {role === "owner" && (
            <>
              {" "}
              <Link
                href="/people"
                className="ui-hover-underline font-medium text-accent"
              >
                Promote someone on the People page
              </Link>
            </>
          )}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {partners.map((partner) => {
            const checkin =
              checkins.find((c) => c.userId === partner.id) ?? null;
            const isSelf = canAct && partner.id === currentUserId;
            return (
              <li
                key={partner.id}
                className="ui-hover-edge flex flex-col gap-2 rounded-xl border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={partner.name} image={partner.image} />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {partner.name}
                  </span>
                  <span
                    className={`text-sm ${checkin ? "text-accent" : "text-muted"}`}
                  >
                    {checkin
                      ? `Checked ✓ ${formatTime(checkin.createdAt)}`
                      : "Not yet"}
                  </span>
                </div>
                {isSelf ? (
                  <OwnRow
                    date={date}
                    checkin={checkin}
                    onChanged={handleChanged}
                  />
                ) : (
                  checkin?.note && (
                    <p className="pl-11 text-sm text-muted">{checkin.note}</p>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
