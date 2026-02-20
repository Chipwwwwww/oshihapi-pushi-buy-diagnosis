"use client";

import Button from "@/components/ui/Button";

type StickyStartBarProps = {
  onStart: () => void;
  disabled?: boolean;
};

export default function StickyStartBar({ onStart, disabled = false }: StickyStartBarProps) {
  return (
    <>
      <div className="h-24" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur dark:border-white/10 dark:bg-[#0b0f1a]/95">
        <div className="mx-auto w-full max-w-3xl">
          <Button onClick={onStart} disabled={disabled} className="w-full text-base">
            診断をはじめる
          </Button>
          <p className="mt-2 text-center text-xs text-slate-600 dark:text-zinc-300">
            迷ったらまずは即決でOK。途中で戻ることもできます。
          </p>
        </div>
      </div>
    </>
  );
}
