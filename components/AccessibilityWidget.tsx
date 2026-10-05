"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Prefs = {
  text: "sm" | "md" | "lg" | "xl";
  contrast: "default" | "high";
  links: boolean;
  motion: boolean;
  leading: "normal" | "relaxed";
  tracking: "normal" | "wide";
  font: "default" | "readable";
  focus: boolean;
};

const KEY = "forge_a11y";
const DEFAULTS: Prefs = {
  text: "md",
  contrast: "default",
  links: false,
  motion: false,
  leading: "normal",
  tracking: "normal",
  font: "default",
  focus: false,
};

function readPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      text: parsed.text === "sm" || parsed.text === "lg" || parsed.text === "xl" ? parsed.text : "md",
      contrast: parsed.contrast === "high" ? "high" : "default",
      links: Boolean(parsed.links),
      motion: Boolean(parsed.motion),
      leading: parsed.leading === "relaxed" ? "relaxed" : "normal",
      tracking: parsed.tracking === "wide" ? "wide" : "normal",
      font: parsed.font === "readable" ? "readable" : "default",
      focus: Boolean(parsed.focus),
    };
  } catch {
    return DEFAULTS;
  }
}

export function applyAccessibility(prefs: Prefs) {
  const root = document.documentElement;
  root.dataset.text = prefs.text;
  root.dataset.contrast = prefs.contrast;
  root.dataset.links = prefs.links ? "on" : "off";
  root.dataset.motion = prefs.motion ? "reduce" : "off";
  root.dataset.leading = prefs.leading;
  root.dataset.tracking = prefs.tracking;
  root.dataset.font = prefs.font;
  root.dataset.focus = prefs.focus ? "on" : "off";
}

export function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const stored = readPrefs();
    setPrefs(stored);
    applyAccessibility(stored);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function update(patch: Partial<Prefs>) {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      applyAccessibility(next);
      window.localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <>
      <button type="button" className="rounded-full px-1 py-1 text-xs font-semibold text-mist hover:text-cream" onClick={() => setOpen(true)}>
        Accessibility
      </button>
      {open
        ? createPortal(
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[min(90dvh,40rem)] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 text-cream shadow-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id={titleId} className="text-xl font-extrabold tracking-tight">
                Accessibility
              </h2>
              <button
                ref={closeRef}
                type="button"
                className="inline-flex min-h-10 items-center gap-1 rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-semibold"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Exit
              </button>
            </div>
            <p className="mt-2 text-sm leading-5 text-mist">
              These choices stay in this browser. They change how GeroForge looks. They do not change the original videos or articles.
            </p>
            <fieldset className="mt-4">
              <legend className="text-sm font-semibold">Text size</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ["sm", "Smaller"],
                    ["md", "Default"],
                    ["lg", "Large"],
                    ["xl", "Largest"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={prefs.text === value}
                    className={`min-h-10 rounded-full px-3 py-1.5 text-xs font-semibold ${prefs.text === value ? "bg-copper text-white" : "bg-[#f3f4f6]"}`}
                    onClick={() => update({ text: value })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-4">
              <legend className="text-sm font-semibold">Contrast</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ["default", "Default"],
                    ["high", "High contrast"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={prefs.contrast === value}
                    className={`min-h-10 rounded-full px-3 py-1.5 text-xs font-semibold ${prefs.contrast === value ? "bg-copper text-white" : "bg-[#f3f4f6]"}`}
                    onClick={() => update({ contrast: value })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-4">
              <legend className="text-sm font-semibold">Text spacing</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={prefs.leading === "relaxed"}
                  className={`min-h-10 rounded-full px-3 py-1.5 text-xs font-semibold ${prefs.leading === "relaxed" ? "bg-copper text-white" : "bg-[#f3f4f6]"}`}
                  onClick={() => update({ leading: prefs.leading === "relaxed" ? "normal" : "relaxed" })}
                >
                  More line spacing
                </button>
                <button
                  type="button"
                  aria-pressed={prefs.tracking === "wide"}
                  className={`min-h-10 rounded-full px-3 py-1.5 text-xs font-semibold ${prefs.tracking === "wide" ? "bg-copper text-white" : "bg-[#f3f4f6]"}`}
                  onClick={() => update({ tracking: prefs.tracking === "wide" ? "normal" : "wide" })}
                >
                  Wider letters
                </button>
              </div>
            </fieldset>
            <label className="mt-4 flex min-h-10 items-center gap-2 text-sm">
              <input type="checkbox" checked={prefs.font === "readable"} onChange={(event) => update({ font: event.target.checked ? "readable" : "default" })} />
              Readable font
            </label>
            <label className="mt-2 flex min-h-10 items-center gap-2 text-sm">
              <input type="checkbox" checked={prefs.links} onChange={(event) => update({ links: event.target.checked })} />
              Underline links
            </label>
            <label className="mt-2 flex min-h-10 items-center gap-2 text-sm">
              <input type="checkbox" checked={prefs.focus} onChange={(event) => update({ focus: event.target.checked })} />
              Stronger keyboard focus
            </label>
            <label className="mt-2 flex min-h-10 items-center gap-2 text-sm">
              <input type="checkbox" checked={prefs.motion} onChange={(event) => update({ motion: event.target.checked })} />
              Reduce motion
            </label>
            <button type="button" className="mt-4 min-h-10 text-sm font-semibold text-copper" onClick={() => update(DEFAULTS)}>
              Reset to default
            </button>
          </div>
        </div>,
        document.body,
      )
        : null}
    </>
  );
}
