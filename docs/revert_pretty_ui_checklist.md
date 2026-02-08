# Revert to Pretty UI — ローカル確認チェックリスト

## PC (Desktop)
- [ ] Home の見た目が「以前の基調」に戻っている（余白/カード/タイポ）
- [ ] 「迷ったらおすすめ」：変に重たい帯/潰れ/薄すぎる文字が無い
- [ ] モード選択：自然なカードUI（点だけ問題/過剰デザインが無い）

## Build
- [ ] `npm run build` が通る（TS error 0）
- [ ] Vercel が Deploy 成功

## Commands (Windows)
```powershell
npm ci
npm run build
npm run dev -- --webpack
```
