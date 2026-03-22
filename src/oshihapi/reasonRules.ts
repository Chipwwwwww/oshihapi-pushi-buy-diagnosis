import type { ActionItem, GoodsSubtype, HoldSubtype, ReasonItem, ScoreDimension } from './model';
import { buildDefaultLinkOuts, buildSearchQuery } from './supportData';
import type { InputMeta } from './model';

type FactorBuckets = {
  desireAttachment: number;
  urgencyOpportunity: number;
  budgetPressure: number;
  readinessLogistics: number;
  uncertaintyUnknowns: number;
  impulseVolatility: number;
  itemKindRisk: number;
};

type RuleContext = {
  meta: InputMeta;
  tags: string[];
  scores: Record<ScoreDimension, number>; // 0-100
  decision: 'BUY' | 'THINK' | 'SKIP';
  blindDrawCap?: number;
  holdSubtype?: HoldSubtype;
  factorBuckets?: FactorBuckets;
};

function has(tag: string, tags: string[]) {
  return tags.includes(tag);
}

export function pickReasons(ctx: RuleContext): ReasonItem[] {
  const r: ReasonItem[] = [];
  const buckets = ctx.factorBuckets;

  if (ctx.scores.affordability <= 30 || has('budget_force', ctx.tags) || has('budget_hard', ctx.tags)) {
    r.push({ id: 'budget', severity: 'strong', text: '今月の負担が大きめ。ここで無理すると後悔に繋がりやすい。' });
  } else if (ctx.scores.affordability >= 70) {
    r.push({ id: 'budget_ok', severity: 'info', text: '予算的には比較的安全。買うなら上限だけ固定するとさらに安心。' });
  }

  if (ctx.scores.desire >= 75) {
    r.push({ id: 'desire_high', severity: 'strong', text: '推し度が高いので、満足度が出やすい買い物。' });
  } else if (ctx.scores.desire <= 35) {
    r.push({ id: 'desire_low', severity: 'warn', text: '推し度はそこまで高くないかも。勢い買いになりやすい。' });
  }

  const pressure = ctx.scores.urgency >= 70 && ctx.scores.restockChance <= 40;
  if (pressure && ctx.scores.impulse >= 60) {
    r.push({ id: 'fomo_pressure', severity: 'warn', text: '「今しかない」圧が強いと判断が荒れやすい。いったん呼吸してOK。' });
  } else if (ctx.scores.rarity >= 70 && ctx.scores.restockChance <= 35) {
    r.push({ id: 'rare', severity: 'info', text: '希少性は高め。買うなら納得感が出やすい条件。' });
  } else if (ctx.scores.restockChance >= 70) {
    r.push({ id: 'restock', severity: 'info', text: '再販しそう。今すぐ決めなくても後悔しにくいタイプ。' });
  }


  if (has('bonus_pressure_high', ctx.tags) || has('bonus_pressure_mid', ctx.tags)) {
    r.push({ id: 'bonus_anxiety', severity: 'warn', text: '特典や限定仕様への不安が強く、判断が急ぎ寄りになっています。' });
  }

  if (has('collection_pressure', ctx.tags)) {
    r.push({ id: 'collection_completion_pressure', severity: 'warn', text: '揃えたい気持ちが強い一方で、交換・中古・再販で補える可能性もあります。' });
  }

  if (has('actor_fan_primary', ctx.tags)) {
    r.push({ id: 'actor_fan_filter', severity: 'info', text: '推し声優の参加が主な購入理由なら、作品そのものを後で見直しても遅くないかもしれません。' });
  }

  if (has('media_usage_unready', ctx.tags)) {
    r.push({ id: 'media_usage_concern', severity: 'warn', text: '再生環境や見返す頻度を考えると、今すぐでなくてもよい可能性があります。' });
  }

  if (ctx.scores.regretRisk >= 70) {
    r.push({ id: 'regret_high', severity: 'strong', text: '後悔リスクが高め。買う場合は「条件」を決めて自分を守ろう。' });
  }
  if (ctx.scores.impulse >= 70) {
    r.push({ id: 'impulse_high', severity: 'warn', text: '今は勢いが強い状態。保留→冷却で精度が上がる。' });
  }

  if (ctx.decision === 'THINK' && ctx.holdSubtype) {
    const subtypeReason: Record<HoldSubtype, string> = {
      needs_check: '結論を動かしうる確認項目が残っています。',
      conflicting: '買う理由と止める理由が強くぶつかっています。',
      timing_wait: 'モノ自体より、今このタイミングが不利です。',
    };
    r.push({ id: `hold_${ctx.holdSubtype}`, severity: 'warn', text: subtypeReason[ctx.holdSubtype] });
  }

  if (buckets && buckets.itemKindRisk >= 70) {
    r.push({ id: 'itemkind_risk_high', severity: 'warn', text: 'この種別は固有リスクが高め。一般グッズより慎重判断が有効。' });
  }

  if (r.length < 3) r.push({ id: 'neutral_1', severity: 'info', text: 'いまの条件を整理できれば、後悔の確率は下げられる。' });
  if (r.length < 3) r.push({ id: 'neutral_2', severity: 'info', text: '「買う/買わない」より「どう買うか」が大事なケース。' });

  return r.slice(0, 6);
}

export function pickActions(ctx: RuleContext): ActionItem[] {
  const a: ActionItem[] = [];
  const unknowns = ctx.tags.filter(t => t.startsWith('unknown_')).length;

  if (ctx.decision === 'THINK' || ctx.scores.impulse >= 65 || ctx.scores.regretRisk >= 70) {
    a.push({ id: 'cooldown', text: '24時間だけ寝かせる（クールダウン）' });
  }

  if (unknowns > 0 || ctx.decision === 'THINK') {
    const query = buildSearchQuery(ctx.meta);
    const links = buildDefaultLinkOuts(query);
    a.push({ id: 'market', text: '相場を1分だけ見る（中古/通販）', linkOut: links[0] });
  }

  if (ctx.scores.affordability <= 40 || has('budget_some', ctx.tags) || has('budget_hard', ctx.tags) || has('budget_force', ctx.tags)) {
    a.push({ id: 'budget_cap', text: '上限予算を決めて、超えたら見送る' });
  }

  if (ctx.holdSubtype === 'needs_check') {
    a.push({ id: 'info_gap_close', text: '未確認情報を2点だけ埋めて再診断（相場/状態/条件）' });
  }
  if (ctx.holdSubtype === 'conflicting') {
    a.push({ id: 'conflict_sort', text: '欲しい理由と止める理由を1つずつ書き出し、どちらが重いか整理する' });
  }
  if (ctx.holdSubtype === 'timing_wait') {
    a.push({ id: 'timing_wait', text: '再販・中古・相場落ちの見込みがあるかを見て、動く時期をずらす' });
  }

  if (ctx.blindDrawCap != null) {
    a.push({ id: 'blind_cap', text: `くじ/盲抽は上限${ctx.blindDrawCap}回で止める（当たっても追い追加しない）` });
  }

  if (a.length === 0) {
    if (ctx.decision === 'BUY') {
      a.push({ id: 'buy_guardrail', text: '買うなら上限予算を先に固定して、その条件で進める' });
    } else if (ctx.decision === 'SKIP') {
      a.push({ id: 'skip_and_revisit_later', text: '今回は見送り、必要なら後日相場だけ静かに見直す' });
    } else {
      a.push({ id: 'recheck_one_point', text: '重要な確認を1つだけ済ませてから再診断する' });
    }
  }

  return a.slice(0, 3);
}

export function getStorageGuidance(goodsSubtype?: GoodsSubtype) {
  if (goodsSubtype === 'e_ticket') {
    return {
      reason: '電子チケットの確認情報が不足。入場条件の取り違えは機会損失になりやすい。',
      action: '利用端末・表示方法・入場条件を先に確認しよう。',
    };
  }
  if (goodsSubtype === 'digital_goods') {
    return {
      reason: 'デジタル特典の保存/利用条件が未確認。後で使えないリスクがある。',
      action: 'DL期限・閲覧条件・保存先を先に確認しよう。',
    };
  }
  return {
    reason: '置き場所が未確定（買った後の置き場が決まってない）',
    action: '先に置き場所を決める（棚/ケース/引き出し）',
  };
}

export function buildShareText(decisionJa: string, reasons: ReasonItem[]): string {
  const top = reasons.slice(0, 2).map(r => r.text.replace(/。$/, '')).join(' / ');
  return `オシハピ｜推し買い診断の判定：${decisionJa}。理由：${top} #推し活`;
}
