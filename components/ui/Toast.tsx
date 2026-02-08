import type { HTMLAttributes } from "react";

type ToastProps = HTMLAttributes<HTMLDivElement> & {
  message: string;
};

export default function Toast({ message, className = "", ...props }: ToastProps) {
  return (
    <div
      className={[
        "fixed bottom-6 left-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 rounded-full bg-foreground px-5 py-3 text-center text-sm font-semibold text-background shadow-lg",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
      {...props}
    >
      {message}
    </div>
  );
}
