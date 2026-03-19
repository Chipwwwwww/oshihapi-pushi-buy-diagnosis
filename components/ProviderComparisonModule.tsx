"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { helperTextClass, sectionTitleClass } from "@/components/ui/tokens";
import type { ProviderCandidate, ProviderTier } from "@/src/oshihapi/providerPlanner";
import { getProviderConfig } from "@/src/oshihapi/providerRegistry";

type Props = {
  cards: ProviderCandidate[];
  onProviderClick: (providerId: string) => void;
};

const TIER_LABELS: Record<ProviderTier, string> = {
  recommended: "おすすめ",
  okay: "見てもよい",
  lowProbability: "低確率",
};

const TIER_BADGE_STYLES: Record<ProviderTier, string> = {
  recommended: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  okay: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  lowProbability: "border-zinc-500/40 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
};

const RENDER_MODE_LABELS: Record<NonNullable<ProviderCandidate["renderMode"]>, string> = {
  primary: "購入先",
  reference: "特典確認先",
  fallback: "比較用",
};

const RENDER_MODE_STYLES: Record<NonNullable<ProviderCandidate["renderMode"]>, string> = {
  primary: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  reference: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  fallback: "border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300",
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
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{TIER_LABELS[tier]}</h3>
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
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
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
                  className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent sm:min-w-44"
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

export default function ProviderComparisonModule({ cards, onProviderClick }: Props) {
  if (cards.length === 0) return null;

  const grouped = groupCards(cards);
  const lowProbabilityCollapsed = grouped.lowProbability.length > 1;

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className={sectionTitleClass}>次にチェックする場所</h2>
        <p className={helperTextClass}>特典確認先・専門店・比較先を分けて表示しています。必要なら下の検索ツールも使ってください。</p>
      </div>

      <div className="space-y-4">
        <TierSection tier="recommended" items={grouped.recommended} onProviderClick={onProviderClick} />
        <TierSection tier="okay" items={grouped.okay} onProviderClick={onProviderClick} />
        <TierSection
          tier="lowProbability"
          items={grouped.lowProbability}
          onProviderClick={onProviderClick}
          defaultCollapsed={lowProbabilityCollapsed}
        />
      </div>

      <div className="space-y-1 border-t border-border/70 pt-3">
        <p className={helperTextClass}>※外部サイトへ移動します。</p>
        <p className={helperTextClass}>※一部リンクにはアフィリエイト/PRを含む場合があります。</p>
      </div>
    </Card>
  );
}
