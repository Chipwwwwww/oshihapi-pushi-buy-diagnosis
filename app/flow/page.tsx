import { Suspense } from "react";
import FlowClient from "./FlowClient";

export default function FlowPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-10 text-sm text-zinc-500">
          読み込み中...
        </div>
      }
    >
      <FlowClient />
    </Suspense>
  );
}
