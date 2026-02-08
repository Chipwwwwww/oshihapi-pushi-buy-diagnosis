# Hotfix 検証チェックリスト（ローカル）

## 必須（Vercel/Build）
- [ ] Vercel build 成功（TypeScript error 0）
- [ ] Flow の選択UIが動く（選択→次へ）

## Home（/）
- [ ] 「迷ったらおすすめ」濃い帯：文字が消えない（標準/説明が見える）
- [ ] チップ（締切/予算）：折り返しOK、読める
- [ ] モード選択：未選択=空丸 / 選択=点、未選択に点が出ない

## Mobile（iPhone12 390x844）
- [ ] 横スクロールなし
- [ ] テキスト 12px 未満になってない（体感でOK）
- [ ] DecisionScale / 共有 / フィードバックが読める

## Commands（Windows）
```powershell
npm ci
npm run dev -- --webpack
```
