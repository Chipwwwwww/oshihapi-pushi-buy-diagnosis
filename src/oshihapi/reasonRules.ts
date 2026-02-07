import type { ActionItem, ReasonItem, ScoreDimension } from './model';
import { buildDefaultLinkOuts, buildSearchQuery } from './supportData';
import type { InputMeta } from './model';

type RuleContext = {
  meta: InputMeta;
  tags: string[];
  scores: Record<ScoreDimension, number>; // 0-100
  decision: 'BUY' | 'THINK' | 'SKIP';
  blindDrawCap?: number;
};

function has(tag: string, tags: string[]) {
  return tags.includes(tag);
}

export function pickReasons(ctx: RuleContext): ReasonItem[] {
  const r: ReasonItem[] = [];

  // Affordability / budget
  if (ctx.scores.affordability <= 30 || has('budget_force', ctx.tags) || has('budget_hard', ctx.tags)) {
    r.push({ id: 'budget', severity: 'strong', text: '今月の負担が大きめ。ここで無理すると後悔に繋がりやすい。' });
  } else if (ctx.scores.affordability >= 70) {
    r.push({ id: 'budget_ok', severity: 'info', text: '予算的には比較的安全。買うなら上限だけ固定するとさらに安心。' });
  }

  // Desire
  if (ctx.scores.desire >= 75) {
    r.push({ id: 'desire_high', severity: 'strong', text: '推し度が高いので、満足度が出やすい買い物。' });
  } else if (ctx.scores.desire <= 35) {
    r.push({ id: 'desire_low', severity: 'warn', text: '推し度はそこまで高くないかも。勢い買いになりやすい。' });
  }

  // Urgency / rarity / restock
  const pressure = ctx.scores.urgency >= 70 && ctx.scores.restockChance <= 40;
  if (pressure && ctx.scores.impulse >= 60) {
    r.push({ id: 'fomo_pressure', severity: 'warn', text: '「今しかない」圧が強いと判断が荒れやすい。いったん呼吸してOK。' });
  } else if (ctx.scores.rarity >= 70 && ctx.scores.restockChance <= 35) {
    r.push({ id: 'rare', severity: 'info', text: '希少性は高め。買うなら納得感が出やすい条件。' });
  } else if (ctx.scores.restockChance >= 70) {
    r.push({ id: 'restock', severity: 'info', text: '再販しそう。今すぐ決めなくても後悔しにくいタイプ。' });
  }

  // Regret / impulse
  if (ctx.scores.regretRisk >= 70) {
    r.push({ id: 'regret_high', severity: 'strong', text: '後悔リスクが高め。買う場合は「条件」を決めて自分を守ろう。' });
  }
  if (ctx.scores.impulse >= 70) {
    r.push({ id: 'impulse_high', severity: 'warn', text: '今は勢いが強い状態。保留→冷却で精度が上がる。' });
  }

  // If we still have too few reasons, add neutral ones
  if (r.length < 3) {
    r.push({ id: 'neutral_1', severity: 'info', text: 'いまの条件を整理できれば、後悔の確率は下げられる。' });
  }
  if (r.length < 3) {
    r.push({ id: 'neutral_2', severity: 'info', text: '「買う/買わない」より「どう買うか」が大事なケース。' });
  }

  return r.slice(0, 6);
}

export function pickActions(ctx: RuleContext): ActionItem[] {
  const a: ActionItem[] = [];

  // Basic cooling for THINK or high impulse
  if (ctx.decision === 'THINK' || ctx.scores.impulse >= 65 || ctx.scores.regretRisk >= 70) {
    a.push({ id: 'cooldown', text: '24時間だけ寝かせる（クールダウン）' });
  }

  // Price / market check link-outs (normal mode / when unknown tags exist)
  const unknowns = ctx.tags.filter(t => t.startsWith('unknown_')).length;
  if (unknowns > 0 || ctx.decision === 'THINK') {
    const query = buildSearchQuery(ctx.meta);
    const links = buildDefaultLinkOuts(query);
    a.push({ id: 'market', text: '相場を1分だけ見る（中古/通販）', linkOut: links[0] });
  }

  // Budget guard
  if (ctx.scores.affordability <= 40 || has('budget_some', ctx.tags) || has('budget_hard', ctx.tags) || has('budget_force', ctx.tags)) {
    a.push({ id: 'budget_cap', text: '上限予算を決めて、超えたら見送る' });
  }

  // Blind draw cap
  if (ctx.blindDrawCap != null) {
    a.push({ id: 'blind_cap', text: `くじ/盲抽は上限${ctx.blindDrawCap}回で止める（当たっても追い追加しない）` });
  }

  // Keep 1-3
  return a.slice(0, 3);
}

export function buildShareText(decisionJa: string, reasons: ReasonItem[]): string {
  const top = reasons.slice(0, 2).map(r => r.text.replace(/。$/, '')).join(' / ');
  return `オシハピ｜推し買い診断の判定：${decisionJa}。理由：${top} #推し活`;
}
