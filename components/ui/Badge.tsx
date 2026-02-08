import type { HTMLAttributes, PropsWithChildren } from "react";

export type BadgeVariant = "primary" | "neutral" | "accent" | "outline";

const variantClasses: Record<BadgeVariant, string> = {
  primary: "bg-primary/10 text-primary",
  neutral: "bg-muted text-muted-foreground",
  accent: "bg-amber-100 text-amber-700",
  outline: "border border-border bg-card text-muted-foreground",
};

export default function Badge({
  variant = "neutral",
  className = "",
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLSpanElement>> & {
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}
