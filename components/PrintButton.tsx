"use client";

/** EXP-13 — the browser's print dialog, where "Save as PDF" lives. */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="ui-hover-solid min-h-11 rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent"
    >
      Download PDF
    </button>
  );
}
