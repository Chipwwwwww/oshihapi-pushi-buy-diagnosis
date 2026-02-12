# status summary (latest)

## What is done (spec/data)
- StyleMode / FlowMode の区別を明文化（docs/mode_copy_spec_latest.md）
- “完全な題庫” の分岐設計（docs/question_bank_spec_latest.md）
- StyleMode の質問/結果文案辞書（src/oshihapi/modes/style_copy_dictionary.ts）
- Codex に渡す実装プロンプト（docs/codex_prompt_stylemode_questionbank_fullstack_20260213.txt）

## What is NOT yet visible (why you didn't see it)
- 既存の PR は「結果ページだけ」の切替に寄っていたため、HOME/FLOW で見えない
- FlowMode の UI を “モード” と書いたため StyleMode と混同した
- Vercel は production branch の commit を表示するため、作業 branch を見ていない可能性

## Next action (Codex)
- HOME に StyleMode toggle を追加し、FLOW/RESULT に伝播させる
- FlowMode+ItemType による質問ルーティングを実装して “全部見える” 状態にする
- build-first: npm run build ✅
