"use client";

import { useId, useState } from "react";

const choices = ["light", "system", "dark"] as const;
type Theme = (typeof choices)[number];

function ThemeIcon({ theme }: { theme: Theme }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {theme === "light" ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
        </>
      ) : theme === "system" ? (
        <>
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M12 17v4m-4 0h8" />
        </>
      ) : (
        <path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z" />
      )}
    </svg>
  );
}

/** Mounted only when the profile opens, after the head script sets the theme. */
export default function ThemeSelector() {
  const name = useId();
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = document.documentElement.dataset.theme;
    return saved === "light" || saved === "dark" ? saved : "system";
  });
  function select(value: Theme) {
    document.documentElement.setAttribute("data-theme", value);
    setTheme(value);
    try {
      localStorage.setItem("bus321-theme", value);
    } catch {
      /* Storage can be disabled; the current page still works. */
    }
  }
  return (
    <fieldset className="mt-4 border-t border-border pt-3">
      <legend className="sr-only">Appearance</legend>
      <p aria-hidden="true" className="mb-2 text-xs font-medium text-muted">
        Appearance
      </p>
      <div className="relative grid grid-cols-3 rounded-full bg-accent-soft p-1">
        <span
          aria-hidden="true"
          className="theme-indicator pointer-events-none absolute bottom-1 left-1 top-1 rounded-full border border-border bg-background shadow-sm"
          style={{
            width: "calc((100% - 8px) / 3)",
            transform: `translateX(${choices.indexOf(theme) * 100}%)`,
          }}
        />
        {choices.map((choice) => (
          <label
            key={choice}
            className="relative flex min-h-11 cursor-pointer flex-col items-center justify-center gap-1 rounded-full px-2 py-2 text-[11px] font-medium text-muted has-checked:text-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
          >
            <input
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              type="radio"
              name={name}
              value={choice}
              checked={theme === choice}
              onChange={() => select(choice)}
            />
            <ThemeIcon theme={choice} />
            {choice[0].toUpperCase() + choice.slice(1)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
