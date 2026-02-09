import type { ButtonHTMLAttributes, ReactNode } from "react";

type RadioCardProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  title: string;
  description?: string;
  isSelected?: boolean;
  footer?: ReactNode;
};

export default function RadioCard({
  title,
  description,
  isSelected = false,
  footer,
  className = "",
  ...props
}: RadioCardProps) {
  return (
    <button
      type="button"
      className={[
        "flex w-full min-h-11 flex-col gap-2 rounded-2xl border px-4 py-4 text-left transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:focus-visible:ring-pink-400/40",
        isSelected
          ? "border-primary/70 bg-primary/5 text-foreground shadow-sm dark:border-pink-400/40 dark:bg-white/8 dark:text-zinc-50 dark:ring-1 dark:ring-pink-400/50"
          : "border-border bg-card text-foreground hover:border-primary/40 dark:border-white/10 dark:bg-white/6 dark:text-zinc-50 dark:hover:border-pink-400/40",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-base font-semibold">{title}</p>
        <span
          className={[
            "h-3.5 w-3.5 rounded-full border-2",
            isSelected
              ? "border-primary bg-primary dark:border-pink-400 dark:bg-pink-400"
              : "border-muted-foreground dark:border-white/30",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      </div>
      {description ? (
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      ) : null}
      {footer}
    </button>
  );
}
