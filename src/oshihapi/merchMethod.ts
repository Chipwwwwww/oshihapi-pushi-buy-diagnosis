import type { MerchMethod, ScoreDimension } from './model';
import { clamp } from './engineConfig';

type MethodContext = {
  tags: string[];
  scores: Record<ScoreDimension, number>;
  goal?: 'single' | 'set' | 'fun' | 'unknown';
  popularity?: 'hot' | 'normal' | 'cold' | 'unknown';
  resaleOk?: boolean; // future; MVP can infer from tags if you add a question
};

function has(tag: string, tags: string[]) { return tags.includes(tag); }

export function decideMerchMethod(ctx: MethodContext): { method: MerchMethod; cap?: number; note: string } {
  const desireHigh = ctx.scores.desire >= 70;
  const affordLow = ctx.scores.affordability <= 30;
  const regretHigh = ctx.scores.regretRisk >= 70;
  const impulseHigh = ctx.scores.impulse >= 70;

  // Hard stop
  if (affordLow && (regretHigh || impulseHigh) && !desireHigh) {
    return { method: 'PASS', note: '今回は見送り寄り。予算と気持ちが整ってからでも遅くない。' };
  }

  // Determine goal
  const goal =
    ctx.goal ??
    (has('goal_single', ctx.tags) ? 'single' :
     has('goal_set', ctx.tags) ? 'set' :
     has('goal_fun', ctx.tags) ? 'fun' :
     has('goal_unknown', ctx.tags) ? 'unknown' : 'single');

  const popularity =
    ctx.popularity ??
    (has('hot', ctx.tags) ? 'hot' :
     has('cold', ctx.tags) ? 'cold' :
     has('normal_popularity', ctx.tags) ? 'normal' : 'unknown');

  // Goal: set
  if (goal === 'set') {
    if (regretHigh || affordLow) {
      return { method: 'BOX', note: '揃えたいならBOXが安定。ただし上限を決めて無理はしない。' };
    }
    return { method: 'BOX', note: '揃えたいならBOXが安定。足りない分は中古で補うのもアリ。' };
  }

  // Goal: fun (blind draw)
  if (goal === 'fun') {
    // cap based on affordability & regret
    const base = Math.round((ctx.scores.affordability / 100) * 8) + 1; // 1..9
    const penalty = regretHigh ? 3 : 0;
    const cap = clamp(1, 10, base - penalty);
    return { method: 'BLIND_DRAW', cap, note: `楽しむ目的ならOK。上限${cap}回で止めよう。` };
  }

  // Goal: unknown / no preference
  if (goal === 'unknown') {
    return { method: 'USED_SINGLE', note: '買い方が未定なら、まずは単品相場の確認から始めると安全。' };
  }

  // Goal: single target
  if (popularity === 'cold') {
    return { method: 'USED_SINGLE', note: '冷め枠一点狙いなら、中古単品がいちばん後悔しにくい。' };
  }

  if (popularity === 'hot') {
    // Hot target -> avoid blind draw if regret/afford issues
    if (regretHigh || affordLow || impulseHigh) {
      return { method: 'USED_SINGLE', note: '人気枠一点狙いは、盲抽より単品で確実に取るほうが安全。' };
    }
    return { method: 'USED_SINGLE', note: '人気枠は相場ブレが大きい。単品で確実に狙うのが無難。' };
  }

  // Unknown popularity -> suggest market check via actions; default to USED_SINGLE
  return { method: 'USED_SINGLE', note: '一点狙いなら単品が堅い。相場を見てから決めるとさらに安心。' };
}
