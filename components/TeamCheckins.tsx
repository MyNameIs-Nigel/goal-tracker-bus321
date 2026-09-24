"use client";

import { useState } from "react";

import Avatar from "@/components/Avatar";
import CheckinControl from "@/components/CheckinControl";
import { formatTime } from "@/lib/format";
import type { CheckinRecord, PartnerSummary } from "@/lib/queries/checkins";

/**
 * PCI-05/06/10/11 — one team's partners and whether each checked in on the
 * day shown. "Checked on you" on your own pages; "Partners" on a teammate's,
 * where your own row carries the check-in control for today.
 */
export default function TeamCheckins({
  heading,
  teamId,
  teamFirstName,
  date,
  todayDate,
  currentUserId,
  partners,
  checkins: initialCheckins,
}: {
  heading: "Checked on you" | "Partners";
  teamId: string;
  teamFirstName: string;
  date: string;
  todayDate: string;
  currentUserId: string;
  partners: readonly PartnerSummary[];
  checkins: readonly CheckinRecord[];
}) {
  const [checkins, setCheckins] = useState<CheckinRecord[]>([
    ...initialCheckins,
  ]);

  return (
    <section
      aria-labelledby="team-checkins-heading"
      className="flex flex-col gap-2"
    >
      <h2
        id="team-checkins-heading"
        className="text-sm font-semibold uppercase tracking-wide text-muted"
      >
        {heading}
      </h2>

      {partners.length === 0 ? (
        <p className="text-muted">No partners yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {partners.map((partner) => {
            const checkin =
              checkins.find((c) => c.userId === partner.id) ?? null;
            const nameBlock = (
              <>
                <Avatar name={partner.name} image={partner.image} />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {partner.name}
                </span>
              </>
            );
            return (
              <li
                key={partner.id}
                className="ui-hover-edge flex flex-col gap-2 rounded-xl border border-border p-3"
              >
                {partner.id === currentUserId && date === todayDate ? (
                  <CheckinControl
                    teamId={teamId}
                    firstName={teamFirstName}
                    date={date}
                    checkin={checkin}
                    onChanged={(changed) =>
                      setCheckins((prev) => [
                        ...prev.filter((c) => c.userId !== changed.userId),
                        changed,
                      ])
                    }
                  >
                    {nameBlock}
                  </CheckinControl>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      {nameBlock}
                      <span
                        className={`shrink-0 text-sm ${checkin ? "text-accent" : "text-muted"}`}
                      >
                        {checkin
                          ? `Checked ✓ ${formatTime(checkin.createdAt)}`
                          : "Not yet"}
                      </span>
                    </div>
                    {checkin?.note && (
                      <p className="pl-11 text-sm text-muted">{checkin.note}</p>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
