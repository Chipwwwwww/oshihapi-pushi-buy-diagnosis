import type { ActionItem, Decision, ReasonItem } from './model';
import { HEADLINES, type DecisionKey, type PrimaryTag } from './headlineLibrary';

const MAX_HEADLINE_LENGTH = 20;
const TAG_ORDER: PrimaryTag[] = [
  'PRICECHECK',
  'COOLDOWN',
  'SPACE',
  'BUDGETCAP',
  'RERELEASE',
  'PRIORITY',
  'RISK',
  'TOTALCOST',
  'TIMING',
  'GENERAL',
];

const TAG_KEYWORDS: Array<{ tag: PrimaryTag; keywords: string[] }> = [
  { tag: 'PRICECHECK', keywords: ['相場', '中古', '通販', 'プレ値', '高騰'] },
  { tag: 'COOLDOWN', keywords: ['24時間', 'クールダウン', '寝かせ', '明日', '保留'] },
  { tag: 'SPACE', keywords: ['置き場所', '収納', '飾る', '片付け'] },
  { tag: 'BUDGETCAP', keywords: ['上限', '予算', '支払い', '財布'] },
  { tag: 'RERELEASE', keywords: ['再販', '再入荷', '次の波'] },
  { tag: 'PRIORITY', keywords: ['優先度', '候補', '比較', '本命', '順位'] },
  { tag: 'RISK', keywords: ['真贋', '状態', '不安', '付属品', '保証'] },
  { tag: 'TOTALCOST', keywords: ['送料', '総額', '関税', '配送', '手数料'] },
  { tag: 'TIMING', keywords: ['締め日', '来月', 'タイミング', '給料日'] },
];

export type DecisionPresentation = {
  decisionLabel: '買う' | '保留' | 'やめる';
  headline: string;
  badge: string;
  note?: string;
  alternatives?: string[];
  tags?: string[];
};

type BuildPresentationArgs = {
  decision: Decision;
  runId?: string;
  createdAt?: number;
  actions?: Array<ActionItem | string | null | undefined>;
  reasons?: Array<ReasonItem | string | null | undefined>;
  flags?: Array<string | null | undefined>;
};

function toDecisionKey(decision: Decision): DecisionKey {
  if (decision === 'BUY') return 'buy';
  if (decision === 'SKIP') return 'skip';
  return 'hold';
}

function toDecisionLabel(decision: Decision): '買う' | '保留' | 'やめる' {
  if (decision === 'BUY') return '買う';
  if (decision === 'SKIP') return 'やめる';
  return '保留';
}

function toText(items: BuildPresentationArgs['actions'] | BuildPresentationArgs['reasons']): string[] {
  if (!items) return [];
  return items
    .map((item) => {
      if (!item) return '';
      if (typeof item === 'string') return item;
      if ('text' in item && typeof item.text === 'string') return item.text;
      return '';
    })
    .filter(Boolean);
}

function countChars(text: string): number {
  return Array.from(text).length;
}

function stableHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickTags(sourceTexts: string[]): PrimaryTag[] {
  const score = new Map<PrimaryTag, number>();
  for (const tag of TAG_ORDER) {
    score.set(tag, 0);
  }

  for (const text of sourceTexts) {
    for (const entry of TAG_KEYWORDS) {
      if (entry.keywords.some((keyword) => text.includes(keyword))) {
        score.set(entry.tag, (score.get(entry.tag) ?? 0) + 1);
      }
    }
  }

  const picked = TAG_ORDER.filter((tag) => (score.get(tag) ?? 0) > 0).sort((a, b) => {
    const diff = (score.get(b) ?? 0) - (score.get(a) ?? 0);
    if (diff !== 0) return diff;
    return TAG_ORDER.indexOf(a) - TAG_ORDER.indexOf(b);
  });

  return picked.length > 0 ? picked : ['GENERAL'];
}

function poolFor(decisionKey: DecisionKey, tag: PrimaryTag): string[] {
  return HEADLINES[decisionKey][tag].filter((candidate) => countChars(candidate) <= MAX_HEADLINE_LENGTH);
}

function dedupe(list: string[]): string[] {
  return Array.from(new Set(list));
}

export function buildPresentation(args: BuildPresentationArgs): DecisionPresentation {
  const decisionKey = toDecisionKey(args.decision);
  const decisionLabel = toDecisionLabel(args.decision);
  const actionTexts = toText(args.actions);
  const reasonTexts = toText(args.reasons);
  const fallbackTexts = (args.flags ?? []).filter((flag): flag is string => Boolean(flag));
  const sourceTexts = actionTexts.length > 0 ? actionTexts : [...reasonTexts, ...fallbackTexts];
  const seed = `${args.runId ?? ''}:${args.createdAt ?? ''}:${args.decision}:${sourceTexts.join('|')}`;
  const baseHash = stableHash(seed || 'fallback');

  const tags = pickTags(sourceTexts);
  const primaryTag = tags[0] ?? 'GENERAL';
  const primaryPool = poolFor(decisionKey, primaryTag);
  const generalPool = poolFor(decisionKey, 'GENERAL');
  const mainPool = primaryPool.length > 0 ? primaryPool : generalPool;
  const headline = mainPool[baseHash % Math.max(mainPool.length, 1)] ?? `${decisionLabel}`;

  const alternativesSet: string[] = [];
  if (primaryTag !== 'GENERAL') {
    const primaryAlt = poolFor(decisionKey, primaryTag)
      .filter((line) => line !== headline)
      .slice(0, 2);
    alternativesSet.push(...primaryAlt);

    for (const secondaryTag of tags.slice(1)) {
      const secondaryPool = poolFor(decisionKey, secondaryTag);
      if (secondaryPool.length === 0) continue;
      alternativesSet.push(secondaryPool[baseHash % secondaryPool.length]);
      if (alternativesSet.length >= 5) break;
    }
  }

  const orderedAlternatives = dedupe(alternativesSet)
    .filter((line) => line !== headline)
    .sort((a, b) => {
      const ah = stableHash(`${seed}:${a}`);
      const bh = stableHash(`${seed}:${b}`);
      return ah - bh;
    })
    .slice(0, 5);

  return {
    decisionLabel,
    headline,
    badge: `判定：${decisionLabel}`,
    note: orderedAlternatives.length > 0 ? '※判定は変わりません' : undefined,
    alternatives: orderedAlternatives.length > 0 ? orderedAlternatives : undefined,
    tags,
  };
}
