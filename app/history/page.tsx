"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DecisionRun } from "@/src/oshihapi/model";
import { loadRuns } from "@/src/oshihapi/runStorage";

function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate(),
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function impulseLabel(run: DecisionRun) {
  const impulse = run.output.scoreSummary.impulse ?? 0;
  if (impulse >= 70) return "高";
  if (impulse >= 45) return "中";
  return "低";
}

const decisionLabels: Record<string, string> = {
  BUY: "買う",
  THINK: "保留",
  SKIP: "やめる",
};

export default function HistoryPage() {
  const [runs, setRuns] = useState<DecisionRun[]>([]);

  useEffect(() => {
    setRuns(loadRuns());
  }, []);

  const hasRuns = useMemo(() => runs.length > 0, [runs]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-pink-600">履歴</p>
        <h1 className="text-2xl font-bold text-zinc-900">診断履歴</h1>
        <p className="text-sm text-zinc-500">直近20件まで表示されます。</p>
      </header>

      {!hasRuns ? (
        <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500">
          まだ履歴がありません。ホームから診断を始めてください。
        </section>
      ) : (
        <section className="space-y-3">
          {runs.map((run) => (
            <Link
              key={run.runId}
              href={`/result/${run.runId}`}
              className="block rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-pink-300"
            >
              <div className="flex flex-col gap-2 text-sm text-zinc-600">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>{formatDate(run.createdAt)}</span>
                  <span>衝動度: {impulseLabel(run)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold text-zinc-800">
                  <span>{decisionLabels[run.output.decision]}</span>
                  <span>{run.meta.itemName ?? "（商品名なし）"}</span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}

      <Link
        href="/"
        className="rounded-full border border-zinc-300 px-6 py-3 text-center text-sm font-semibold text-zinc-600"
      >
        Homeへ戻る
      </Link>
    </div>
  );
}
