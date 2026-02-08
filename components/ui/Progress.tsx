import type { HTMLAttributes } from "react";

export type ProgressProps = HTMLAttributes<HTMLDivElement> & {
  value: number;
  max?: number;
};

export default function Progress({ value, max = 100, className = "" }: ProgressProps) {
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = Math.round((clamped / safeMax) * 100);

  return (
    <div
      className={[
        "h-2 w-full rounded-full bg-muted",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="h-2 rounded-full bg-primary transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
