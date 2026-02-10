"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DecisionRun } from "@/src/oshihapi/model";
import { decisivenessLabels } from "@/src/oshihapi/decisiveness";
import { loadMarketMemos } from "@/src/oshihapi/marketMemoStorage";
import { loadRuns } from "@/src/oshihapi/runStorage";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  bodyTextClass,
  containerClass,
  helperTextClass,
  pageTitleClass,
  sectionTitleClass,
} from "@/components/ui/tokens";

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

const marketLevelLabels: Record<string, string> = {
  high: "高騰",
  normal: "ふつう",
  calm: "落ち着いてる",
};

function formatPercent(count: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}

export default function HistoryPage() {
  const router = useRouter();
  const [runs] = useState<DecisionRun[]>(() => loadRuns());
  const [marketMemos] = useState(() => loadMarketMemos());

  const hasRuns = useMemo(() => runs.length > 0, [runs]);
  const summary = useMemo(() => {
    const counts = { BUY: 0, THINK: 0, SKIP: 0 } as const;
    const mutable = { ...counts };
    for (const run of runs) {
      if (run.output.decision === "BUY" || run.output.decision === "THINK" || run.output.decision === "SKIP") {
        mutable[run.output.decision] += 1;
      }
    }
    return mutable;
  }, [runs]);

  return (
    <div className={`${containerClass} flex min-h-screen flex-col gap-6 py-10`}>
      <header className="space-y-2">
        <p className="text-sm font-semibold text-accent">履歴</p>
        <h1 className={pageTitleClass}>診断履歴</h1>
        <p className={helperTextClass}>直近20件まで表示されます。</p>
      </header>

      {hasRuns ? (
        <Card className="space-y-3">
          <h2 className={sectionTitleClass}>集計</h2>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <p className="text-muted-foreground">買う</p>
              <p className="text-base font-semibold">{summary.BUY}件 ({formatPercent(summary.BUY, runs.length)})</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <p className="text-muted-foreground">保留</p>
              <p className="text-base font-semibold">{summary.THINK}件 ({formatPercent(summary.THINK, runs.length)})</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <p className="text-muted-foreground">やめる</p>
              <p className="text-base font-semibold">{summary.SKIP}件 ({formatPercent(summary.SKIP, runs.length)})</p>
            </div>
          </div>
        </Card>
      ) : null}

      {!hasRuns ? (
        <Card className="border-dashed text-center">
          <p className={bodyTextClass}>まだ履歴がありません。</p>
          <p className={helperTextClass}>診断するとここに結果が保存されます。</p>
        </Card>
      ) : (
        <section className="space-y-4">
          <h2 className={sectionTitleClass}>最近の診断</h2>
          <div className="grid gap-4">
            {runs.map((run) => (
              <Link key={run.runId} href={`/result/${run.runId}`} className="block">
                <Card className="space-y-4 transition hover:border-primary/40">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{formatDate(run.createdAt)}</span>
                    <Badge variant="outline">衝動度: {impulseLabel(run)}</Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-foreground">
                      {decisionLabels[run.output.decision]}
                    </p>
                    {marketMemos[run.runId] ? (
                      <p className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                        相場: {marketLevelLabels[marketMemos[run.runId].level]}
                      </p>
                    ) : null}
                    <p className={helperTextClass}>
                      {run.meta.itemName ?? "（商品名なし）"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <p className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                        決め切り度: {decisivenessLabels[run.decisiveness ?? "standard"]}
                      </p>
                      {run.useCase === "game_billing" ? (
                        <p className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                          種別: ゲーム課金
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Button
        variant="outline"
        className="w-full rounded-xl"
        onClick={() => router.push("/")}
      >
        Homeへ戻る
      </Button>
    </div>
  );
}
