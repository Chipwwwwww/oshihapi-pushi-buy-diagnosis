import type { InputHTMLAttributes, ReactNode } from "react";

type RadioCardProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "children" | "className"
> & {
  title: string;
  description?: string;
  footer?: ReactNode;
  className?: string;
};

export default function RadioCard({
  title,
  description,
  footer,
  className = "",
  ...props
}: RadioCardProps) {
  return (
    <label className={["group block cursor-pointer", className].join(" ")}>
      <input type="radio" className="peer sr-only" {...props} />
      <div
        className={[
          "osh-card flex min-h-11 w-full items-start justify-between gap-3 transition",
          "group-hover:bg-slate-50",
          "peer-checked:bg-slate-50 peer-checked:ring-2 peer-checked:ring-slate-900",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-slate-400",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-base font-semibold text-foreground">{title}</p>
          {description ? (
            <p className="text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
          {footer}
        </div>
        <span
          aria-hidden="true"
          className={[
            "relative mt-1 flex h-4 w-4 items-center justify-center rounded-full border border-slate-400",
            "after:block after:h-2 after:w-2 after:rounded-full after:bg-slate-900 after:opacity-0 after:content-['']",
            "peer-checked:border-slate-900 peer-checked:after:opacity-100",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      </div>
    </label>
  );
}
