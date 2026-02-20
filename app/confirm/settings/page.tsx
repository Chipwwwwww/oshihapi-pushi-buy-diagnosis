import { Suspense } from "react";
import ConfirmSettingsClient from "./ConfirmSettingsClient";
import { containerClass, helperTextClass } from "@/components/ui/tokens";

export default function ConfirmSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className={`${containerClass} flex min-h-screen flex-col items-center justify-center py-10`}>
          <p className={helperTextClass}>読み込み中...</p>
        </div>
      }
    >
      <ConfirmSettingsClient />
    </Suspense>
  );
}
