"use client";

import type { PresentationMode as ModeId } from "@/src/oshihapi/modes/presentationMode";

type ModeToggleProps = {
  value: ModeId;
  onChange: (mode: ModeId) => void;
  className?: string;
};

const MODE_OPTIONS: { id: ModeId; label: string }[] = [
  { id: "standard", label: "標準" },
  { id: "kawaii", label: "かわいい" },
  { id: "oshi", label: "推し活用語" },
];

export default function ModeToggle({ value, onChange, className }: ModeToggleProps) {
  return (
    <div className={className}>
      <p className="text-sm font-semibold text-foreground">風格 / 表現モード</p>
      <div className="mt-2 grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-2 dark:border-white/10 dark:bg-white/6">
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={[
              "min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition",
              value === option.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-transparent text-slate-700 hover:bg-white dark:text-zinc-200 dark:hover:bg-white/10",
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
