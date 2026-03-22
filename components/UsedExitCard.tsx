"use client";

import { useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { helperTextClass, sectionTitleClass } from "@/components/ui/tokens";
import type { ProviderCandidate } from "@/src/oshihapi/providerPlanner";
import { getProviderConfig } from "@/src/oshihapi/providerRegistry";
import { getUsedExitModeLabel, getUsedExitProviderLabel } from "@/src/oshihapi/usedExitPlan";
import type { UsedExitPlan } from "@/src/oshihapi/model";

type Props = {
  plan: UsedExitPlan;
  cards: ProviderCandidate[];
  onProviderClick: (providerId: string) => void;
};

function getHeadline(plan: UsedExitPlan) {
  switch (plan.mode) {
    case "secondary_compare":
      return "中古は比較用の参照だけに使う";
    case "check_first":
      return "先に1点確認してから、中古は必要なら見る";
    case "timing_wait_route":
      return "今は待って、あとで中古の回収ルートを確認する";
    case "delayed_recheck":
      return "今は止める。必要なら後でだけ中古を見直す";
    case "reference_only":
      return "今すぐ探さず、相場だけ参考にして落ち着く";
  }
}

function getProviderCta(plan: UsedExitPlan, providerId: string) {
  if (plan.mode === "reference_only") {
    return providerId === "mercari" ? "メルカリ相場を見る" : "駿河屋在庫を参考確認";
  }
  if (plan.mode === "check_first") {
    return providerId === "mercari" ? "確認後にメルカリを見る" : "確認後に駿河屋を見る";
  }
  if (plan.mode === "delayed_recheck") {
    return providerId === "mercari" ? "後でメルカリを確認" : "後で駿河屋を確認";
  }
  if (plan.mode === "secondary_compare") {
    return providerId === "mercari" ? "メルカリで比較" : "駿河屋で比較";
  }
  return providerId === "mercari" ? "メルカリを確認" : "駿河屋を確認";
}

export default function UsedExitCard({ plan, cards, onProviderClick }: Props) {
  const [isOpen, setIsOpen] = useState(plan.mode !== "delayed_recheck");
  const providerCards = useMemo(
    () => cards.filter((card) => plan.providers.some((provider) => provider.key === card.providerId)),
    [cards, plan.providers],
  );

  return (
    <Card className="space-y-4 border-slate-200/80 bg-white/90 dark:border-white/10 dark:bg-white/4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className={sectionTitleClass}>中古出口の補助ガイド</h2>
          <Badge variant="outline">{getUsedExitModeLabel(plan.mode)}</Badge>
        </div>
        <p className="text-sm text-foreground">{getHeadline(plan)}</p>
        <p className={helperTextClass}>外部リンクは比較のための参照です。結論を押し付けません。</p>
        <p className={helperTextClass}>アフィリエイトを含むリンクがありますが、判定ロジックはリンク有無で変わりません。</p>
      </div>

      {plan.mode === "delayed_recheck" ? (
        <Button variant="outline" onClick={() => setIsOpen((current) => !current)} className="w-full rounded-xl">
          {isOpen ? "後で見る導線をたたむ" : "後で中古を確認する"}
        </Button>
      ) : null}

      {isOpen ? (
        <>
          <div className="space-y-2 rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">診断メモ</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {plan.why.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </div>

          {plan.whatToCheck?.length ? (
            <div className="space-y-2 rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">先に確認すること</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {plan.whatToCheck.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {plan.whenToRecheck ? (
            <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">見直すタイミング</p>
              <p className="mt-2 text-sm text-muted-foreground">{plan.whenToRecheck}</p>
            </div>
          ) : null}

          {plan.afterChecklist?.length ? (
            <div className="space-y-2 rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">確認後の見方</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {plan.afterChecklist.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {providerCards.length ? (
            <div className="space-y-3">
              {providerCards.map((card) => {
                const config = getProviderConfig(card.providerId);
                return (
                  <div
                    key={card.providerId}
                    className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{getUsedExitProviderLabel(card.providerId as "mercari" | "surugaya")}</p>
                        <Badge variant="outline">{config.roleLabel}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{card.shortReason || card.roleReason}</p>
                    </div>
                    <a
                      href={card.outHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onProviderClick(card.providerId)}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted sm:min-w-44"
                    >
                      {getProviderCta(plan, card.providerId)}
                    </a>
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}
