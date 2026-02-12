import type { PresentationMode } from "@/src/oshihapi/modes/presentationMode";

export const RESULT_COPY: Record<
  PresentationMode,
  {
    ui: {
      styleSectionTitle: string;
      styleSectionHelp: string;
      styleOptionLabel: Record<PresentationMode, string>;
      resultSummaryTitle: string;
      adviceTitle: string;
      actionsTitle: string;
      reasonsTitle: string;
    };
    verdictSubcopy: Record<"BUY" | "THINK" | "SKIP", string>;
    waitTypeHint: Record<string, string>;
    reasonExplain: Record<string, string>;
    actionExplain: Record<string, string>;
    itemTypeHint: Record<string, string>;
  }
> = {
  standard: {
    ui: {
      styleSectionTitle: "表示スタイル",
      styleSectionHelp: "文言・トーンのみ切り替わります（判定ロジックは共通です）。",
      styleOptionLabel: {
        standard: "標準",
        kawaii: "かわいい",
        oshi: "推し活用語",
      },
      resultSummaryTitle: "診断サマリー",
      adviceTitle: "アドバイス",
      actionsTitle: "今すぐやる",
      reasonsTitle: "理由タグ",
    },
    verdictSubcopy: {
      BUY: "今の条件ならOK。上限だけ決めて進もう。",
      THINK: "今は保留でOK。条件が整ったらまた検討しよう。",
      SKIP: "今回は見送りでOK。次の推し活に回そう。",
    },
    waitTypeHint: {
      none: "待機なし。いまの材料で判断しやすい状態です。",
      short: "短め待機。熱量をいったん整えて再確認。",
      long: "長め待機。時間を置いても欲しいかを確認。",
    },
    reasonExplain: {
      budget: "予算の負担が重め。無理を避ける視点が重要です。",
      budget_ok: "予算に余力あり。上限を決めるとさらに安心です。",
      desire_high: "満足につながりやすい高い欲しさです。",
      desire_low: "勢い買いになりやすい温度感です。",
    },
    actionExplain: {
      cooldown: "時間を空けると、衝動買いリスクを下げられます。",
      market: "相場確認で割高購入を避けやすくなります。",
      budget_cap: "先に上限を決めると後悔を防ぎやすいです。",
    },
    itemTypeHint: {
      blind_draw: "くじ系は回数上限を先に固定するのが安全です。",
      used: "中古は相場差が大きいので比較が有効です。",
      preorder: "予約は到着時期と再販可能性も確認しましょう。",
      ticket: "チケットは期限・条件を優先して確認しましょう。",
      game_billing: "課金は天井・評価・使用頻度の3点確認が有効です。",
    },
  },
  kawaii: {
    ui: {
      styleSectionTitle: "ことばのふんいき",
      styleSectionHelp: "けっかは同じで、見た目と話し方だけかわるよ。",
      styleOptionLabel: {
        standard: "標準",
        kawaii: "かわいい",
        oshi: "推し活用語",
      },
      resultSummaryTitle: "けっかサマリー",
      adviceTitle: "ひとことアドバイス",
      actionsTitle: "つぎにやること",
      reasonsTitle: "りゆうメモ",
    },
    verdictSubcopy: {
      BUY: "いまの条件ならだいじょうぶ。予算ラインだけ決めて進もう。",
      THINK: "いったん保留でOK。条件がそろったらもう一度みよう。",
      SKIP: "今回はおやすみでOK。次のときめきにそなえよう。",
    },
    waitTypeHint: {
      none: "いまの情報で決めやすいよ。",
      short: "ちょこっと待つと気持ちが整うよ。",
      long: "ゆっくり待っても欲しいか見てみよう。",
    },
    reasonExplain: {
      budget: "お財布がしんどくなりそう。むりしないでね。",
      budget_ok: "お財布はだいじょうぶそう。上限だけ先にきめよう。",
      desire_high: "ときめき高めで満足しやすいよ。",
      desire_low: "勢いだけで買いやすい温度かも。",
    },
    actionExplain: {
      cooldown: "少し寝かせると、気持ちがすっきりするよ。",
      market: "相場を見ておくと安心して決められるよ。",
      budget_cap: "先に上限をきめるとあとで楽だよ。",
    },
    itemTypeHint: {
      blind_draw: "くじは回数を先にきめておくと安心だよ。",
      used: "中古はお店ごとの差が出やすいよ。",
      preorder: "予約は再販の可能性も見ておこう。",
      ticket: "チケットは期限チェックが最優先だよ。",
      game_billing: "課金は天井と評価を先に見ておこう。",
    },
  },
  oshi: {
    ui: {
      styleSectionTitle: "表示スタイル",
      styleSectionHelp: "判定は固定。文面だけ推し活トーンに切り替えます。",
      styleOptionLabel: {
        standard: "標準",
        kawaii: "かわいい",
        oshi: "推し活用語",
      },
      resultSummaryTitle: "判定サマリー",
      adviceTitle: "作戦メモ",
      actionsTitle: "次アクション",
      reasonsTitle: "根拠タグ",
    },
    verdictSubcopy: {
      BUY: "回収条件は良好。上限固定して安全運転でいこう。",
      THINK: "いったん保留でOK。条件が揃ってから再判定。",
      SKIP: "今回は見送り。次案件にリソースを残そう。",
    },
    waitTypeHint: {
      none: "待機なし。現時点の材料で判断可能。",
      short: "小休止して熱量を整えるフェーズ。",
      long: "作戦待機で優先度を見極めるフェーズ。",
    },
    reasonExplain: {
      budget: "資金圧が高め。無理課金は回避推奨。",
      budget_ok: "資金余力あり。上限固定で安定運用。",
      desire_high: "推し熱高。満足度に繋がりやすい案件。",
      desire_low: "勢い先行の可能性あり。再確認推奨。",
    },
    actionExplain: {
      cooldown: "作戦待機で衝動判断を抑制できます。",
      market: "界隈相場の確認で取りこぼしを防げます。",
      budget_cap: "上限固定は資金防衛の基本です。",
    },
    itemTypeHint: {
      blind_draw: "盲抽は天井管理を先に設定。",
      used: "中古は相場巡回で最適解を探しましょう。",
      preorder: "予約案件は再販見込みの確認が有効です。",
      ticket: "チケットは期限と条件を最優先で確認。",
      game_billing: "課金案件は天井距離と評価確認が必須。",
    },
  },
};
