"use client";

import { useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { helperTextClass, sectionTitleClass } from "@/components/ui/tokens";
import type { ProviderCandidate, ProviderTier } from "@/src/oshihapi/providerPlanner";
import { getProviderConfig } from "@/src/oshihapi/providerRegistry";
import type { ScenarioKey } from "@/src/oshihapi/scenarioCoverage";

type Props = {
  cards: ProviderCandidate[];
  onProviderClick: (providerId: string) => void;
  scenarioKey?: ScenarioKey | null;
};

const TIER_LABELS: Record<ProviderTier, string> = {
  recommended: "優先して確認",
  okay: "余裕があれば確認",
  lowProbability: "優先度低め",
};

const TIER_HELPERS: Record<ProviderTier, string> = {
  recommended: "診断の次の一歩に近い候補です。",
  okay: "比較や補足確認向けの候補です。",
  lowProbability: "状況が合う時だけ見る予備候補です。",
};

const TIER_BADGE_STYLES: Record<ProviderTier, string> = {
  recommended: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  okay: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  lowProbability: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
};

const RENDER_MODE_LABELS: Record<NonNullable<ProviderCandidate["renderMode"]>, string> = {
  primary: "主候補",
  reference: "確認用",
  fallback: "予備候補",
};

const RENDER_MODE_STYLES: Record<NonNullable<ProviderCandidate["renderMode"]>, string> = {
  primary: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  reference: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  fallback: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
};

function groupCards(cards: ProviderCandidate[]): Record<ProviderTier, ProviderCandidate[]> {
  return cards.reduce(
    (acc, card) => {
      if (!card.tier) return acc;
      acc[card.tier].push(card);
      return acc;
    },
    { recommended: [], okay: [], lowProbability: [] } as Record<ProviderTier, ProviderCandidate[]>,
  );
}

function TierSection({
  tier,
  items,
  onProviderClick,
  defaultCollapsed = false,
}: {
  tier: ProviderTier;
  items: ProviderCandidate[];
  onProviderClick: (providerId: string) => void;
  defaultCollapsed?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);
  if (items.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">{TIER_LABELS[tier]}</h3>
          <p className="text-xs text-muted-foreground">{TIER_HELPERS[tier]}</p>
        </div>
        {defaultCollapsed ? (
          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            {isOpen ? "閉じる" : `${items.length}件を見る`}
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="space-y-2">
          {items.map((card) => {
            const config = getProviderConfig(card.providerId);
            return (
              <div
                key={card.providerId}
                className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{config.displayName}</p>
                    <Badge variant="outline" className={TIER_BADGE_STYLES[tier]}>
                      {TIER_LABELS[tier]}
                    </Badge>
                    {card.renderMode ? (
                      <Badge variant="outline" className={RENDER_MODE_STYLES[card.renderMode]}>
                        {RENDER_MODE_LABELS[card.renderMode]}
                      </Badge>
                    ) : null}
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
                  {card.ctaLabel}
                </a>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export default function ProviderComparisonModule({ cards, onProviderClick, scenarioKey }: Props) {
  const grouped = useMemo(() => groupCards(cards), [cards]);

  if (cards.length === 0) return null;

  const lowProbabilityCollapsed = grouped.lowProbability.length > 1;
  const okayCollapsed = grouped.okay.length > 0;
  const introText =
    scenarioKey === "exchange_path"
      ? "交換前提の判断を補強するため、購入先よりも在庫・単品移行・相場確認に役割を分けて並べています。"
      : "購入を煽る一覧ではなく、診断で意味があった確認先だけを優先度順に絞っています。";

  return (
    <Card className="space-y-4 border-slate-200/80 bg-white/90 dark:border-white/10 dark:bg-white/4">
      <div className="space-y-1">
        <h2 className={sectionTitleClass}>診断に沿って確認する場所</h2>
        <p className={helperTextClass}>{introText}</p>
      </div>

      <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
        <p className="text-xs font-medium text-muted-foreground">表示ルール</p>
        <p className="mt-1 text-sm text-muted-foreground">主候補 → 確認用 → 予備候補 の順で、診断に必要な役割差が見えるよう整理しています。</p>
      </div>

      <div className="space-y-4">
        <TierSection tier="recommended" items={grouped.recommended} onProviderClick={onProviderClick} />
        <TierSection tier="okay" items={grouped.okay} onProviderClick={onProviderClick} defaultCollapsed={okayCollapsed} />
        <TierSection
          tier="lowProbability"
          items={grouped.lowProbability}
          onProviderClick={onProviderClick}
          defaultCollapsed={lowProbabilityCollapsed}
        />
      </div>

      <div className="space-y-1 border-t border-border/70 pt-3">
        <p className={helperTextClass}>※外部サイトへ移動します。</p>
        <p className={helperTextClass}>※一部リンクにはアフィリエイト/PRを含む場合がありますが、表示順は診断ロジックに従います。</p>
      </div>
    </Card>
  );
}
