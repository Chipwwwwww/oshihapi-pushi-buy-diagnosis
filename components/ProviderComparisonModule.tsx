import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { bodyTextClass, helperTextClass, sectionTitleClass } from "@/components/ui/tokens";
import type { ProviderCandidate } from "@/src/oshihapi/providerPlanner";
import { getProviderConfig } from "@/src/oshihapi/providerRegistry";

type Props = {
  cards: ProviderCandidate[];
  onProviderClick: (providerId: string) => void;
};

export default function ProviderComparisonModule({ cards, onProviderClick }: Props) {
  if (cards.length === 0) return null;

  return (
    <Card className="space-y-4">
      <h2 className={sectionTitleClass}>次にチェックする場所</h2>
      <div className="grid gap-3">
        {cards.map((card) => {
          const config = getProviderConfig(card.providerId);
          return (
            <div key={card.providerId} className="space-y-2 rounded-2xl border border-border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{config.displayName}</p>
                {card.badge ? <Badge variant="outline">{card.badge}</Badge> : null}
              </div>
              <p className={bodyTextClass}>{card.roleReason}</p>
              <a
                href={card.outHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onProviderClick(card.providerId)}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent"
              >
                {card.ctaLabel}
              </a>
              <p className={helperTextClass}>{config.externalSiteNote ?? "※外部サイトに移動します"}</p>
              {config.disclosureRequired ? (
                <p className={helperTextClass}>{config.disclosureNote ?? "※一部リンクにはアフィリエイト/PRを含む場合があります"}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
