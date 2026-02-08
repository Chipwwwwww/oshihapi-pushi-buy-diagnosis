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
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        isSelected
          ? "border-primary/70 bg-primary/5 text-foreground shadow-sm"
          : "border-border bg-card text-foreground hover:border-primary/40",
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
            isSelected ? "border-primary bg-primary" : "border-muted-foreground",
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
