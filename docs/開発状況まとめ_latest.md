# オシハピ｜推し買い診断　開発状況まとめ（最新版 / 自分用）

更新日: 2026-02-08（JST）

---

## 0) 目的（MVP）
- 推しグッズ購入の意思決定を **60秒**（短は30秒）で支援
- 出力：**買う / 保留 / やめる** + 理由 + 行動 + shareText
- 仕組み：ルール/加重エンジン（TS） + Next.js（App Router）
- 保存：localStorage（ログイン不要、直近20件）
- 共有：テキストコピー（最低限） → 後で画像カード

---

## 1) 現在の状態（重要）
✅ ローカルで **npm run build が通る**（= Vercel に載せられる状態）

✅ docs に設計レポート（ja/zh）が入った（GitHub push 済み）

---

## 2) いまの UI（ホーム）
- モード：
  - 急いで決める（30秒）
  - じっくり決める（60秒）
- 入力（任意）：商品名/価格/締切/種別

---

## 3) 次の実装（P0: 友達テストで体験が伸びる）
### P0-1 結果ページを直感化（DecisionScale）
- 「やめる｜保留｜買う」スケール＋矢印
- 理由/推奨行動/共有コピーの見やすさ改善

### P0-2 “急・中・長”統合（仕様は docs に定義済み）
- 短診断（30秒）＝ urgentCore のみ
- 中間診断（~2分）＝ urgentCore + standard
- 長診断（AI用プロンプト生成）＝ + longOnly（自由入力含む）
  - MVP では「プロンプト生成＋コピー」まで（外部API不要）

---

## 4) ML収集（質問は増やさない）
- 結果ページに 1タップ（L1）：買った/保留/買わなかった/まだ
- 自動ログ：time_total_ms / time_per_q_ms / num_changes / num_backtracks / actions_clicked
- まずは localStorage 保存（RunRecord 拡張）

---

## 5) PowerShell（定番）
```powershell
cd C:\Users\User\dev\oshihapi-pushi-buy-diagnosis
git pull origin main
npm ci
npm run build
npm run dev
```
