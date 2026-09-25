"use client";

import Link from "next/link";
import { useState } from "react";

import Avatar from "@/components/Avatar";
import CheckinControl from "@/components/CheckinControl";
import { firstName } from "@/lib/format";
import { teamPaths } from "@/lib/paths";
import type { CheckinRecord } from "@/lib/queries/checkins";
import type { Teammate } from "@/lib/view/teammates";

/** PCI-07 — the only student so far. */
function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-3 text-sm">
      <p>No teammates yet. Share the link:</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate text-muted">{url}</code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          }}
          className="ui-hover-surface rounded-full border border-border px-3 text-sm font-medium"
        >
          Copy link
        </button>
      </div>
      {copied && (
        <p role="status" className="text-xs text-accent">
          Link copied
        </p>
      )}
    </div>
  );
}

/** PCI-01..08 — "Your teammates" on /today: everyone else, one tap each. */
export default function TeammateList({
  date,
  teammates,
  shareUrl,
}: {
  date: string;
  teammates: readonly Teammate[];
  shareUrl: string;
}) {
  const [checkins, setCheckins] = useState<Record<string, CheckinRecord>>(() =>
    Object.fromEntries(
      teammates.flatMap((t) => (t.checkin ? [[t.teamId, t.checkin]] : [])),
    ),
  );
  const checked = teammates.filter((t) => checkins[t.teamId]).length;

  return (
    <section
      aria-labelledby="teammates-heading"
      className="flex flex-col gap-2"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="teammates-heading"
          className="text-sm font-semibold uppercase tracking-wide text-muted"
        >
          Your teammates
        </h2>
        {teammates.length > 0 && (
          <span className="text-sm text-muted">
            {checked} of {teammates.length} checked
          </span>
        )}
      </div>

      {teammates.length === 0 ? (
        <ShareLink url={shareUrl} />
      ) : (
        <ul className="flex flex-col gap-2">
          {teammates.map((teammate) => (
            <li
              key={teammate.teamId}
              className="ui-hover-edge flex flex-col gap-2 rounded-xl border border-border p-3"
            >
              <CheckinControl
                teamId={teammate.teamId}
                firstName={firstName(teammate.name)}
                date={date}
                checkin={checkins[teammate.teamId] ?? null}
                onChanged={(checkin) =>
                  setCheckins((prev) => ({
                    ...prev,
                    [checkin.teamId]: checkin,
                  }))
                }
              >
                <Avatar name={teammate.name} image={teammate.image} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={teamPaths(teammate.teamId).today}
                    className="ui-hover-accent block truncate font-medium"
                  >
                    {teammate.name}
                  </Link>
                  <p className="text-sm text-muted">{teammate.summary}</p>
                </div>
              </CheckinControl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
