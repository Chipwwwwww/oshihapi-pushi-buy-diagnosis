import type { HTMLAttributes, PropsWithChildren } from "react";
import { cardClass } from "./tokens";

export default function Card({
  className = "",
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={[cardClass, className].filter(Boolean).join(" ")} {...props}>
      {children}
    </div>
  );
}
