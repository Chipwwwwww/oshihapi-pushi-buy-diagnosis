import type { InputMeta } from './model';

// Price tiers are heuristics for messaging (not strict)
export type PriceTier = 'cheap' | 'mid' | 'expensive' | 'unknown';

export function priceTier(priceYen?: number): PriceTier {
  if (priceYen == null || Number.isNaN(priceYen)) return 'unknown';
  if (priceYen < 2000) return 'cheap';
  if (priceYen < 12000) return 'mid';
  return 'expensive';
}

// Build a search query string for link-outs.
// MVP: do not call APIs; just produce good keywords.
export function buildSearchQuery(meta: InputMeta, extraKeywords: string[] = []): string {
  const parts: string[] = [];
  if (meta.itemName) parts.push(meta.itemName.trim());
  if (meta.itemKind) {
    const kindMap: Record<string, string> = {
      goods: 'グッズ',
      blind_draw: 'くじ',
      used: '中古',
      preorder: '予約',
      ticket: 'チケット',
    };
    parts.push(kindMap[meta.itemKind] ?? '');
  }
  for (const k of extraKeywords) {
    if (k && k.trim()) parts.push(k.trim());
  }
  return parts.filter(Boolean).join(' ');
}

export function googleSiteSearchUrl(domain: string, query: string): string {
  const q = encodeURIComponent(`site:${domain} ${query}`);
  return `https://www.google.com/search?q=${q}`;
}

export function buildDefaultLinkOuts(query: string) {
  return [
    { label: 'メルカリで相場を見る', url: googleSiteSearchUrl('jp.mercari.com', query) },
    { label: '駿河屋で見る', url: googleSiteSearchUrl('suruga-ya.jp', query) },
    { label: 'ヤフオクで見る', url: googleSiteSearchUrl('auctions.yahoo.co.jp', query) },
  ];
}
