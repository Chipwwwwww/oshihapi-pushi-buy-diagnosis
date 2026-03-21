import type { HTMLAttributes } from "react";

export type ProgressProps = HTMLAttributes<HTMLDivElement> & {
  value: number;
  max?: number;
  label?: string;
};

export default function Progress({ value, max = 100, label, className = "", ...props }: ProgressProps) {
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = Math.round((clamped / safeMax) * 100);
  const progressLabel = label ?? `進捗 ${percent}%`;

  return (
    <div
      role="progressbar"
      aria-label={progressLabel}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={clamped}
      aria-valuetext={`${clamped}/${safeMax} (${percent}%)`}
      className={[
        "h-2.5 w-full overflow-hidden rounded-full bg-muted",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
