import { Suspense } from "react";
import ConfirmClient from "./ConfirmClient";
import { containerClass, helperTextClass } from "@/components/ui/tokens";

export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className={`${containerClass} flex min-h-screen flex-col items-center justify-center py-10`}>
          <p className={helperTextClass}>読み込み中...</p>
        </div>
      }
    >
      <ConfirmClient />
    </Suspense>
  );
}
