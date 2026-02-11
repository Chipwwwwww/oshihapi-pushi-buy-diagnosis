# 開発状況まとめ (latest) — 2026-02-11

## 今の状態（結論）
- ✅ UI（Vercel Production / Local）を「同じ版」に揃えるための **Vercel==Local パリティゲート** を導入中。
- ✅ merge 後は **`.\post_merge_routine.ps1` を1回実行** するだけで、基本の同期/ビルド/起動まで完了させる方針。
- ⚠️ これを成立させる前提として、Vercel 側に **`/api/version`** が存在し、Production へデプロイされている必要がある。

---

## 何が起きたか（要点）
1) UI のデスクトップ幅調整 PR の過程で、
   - 「Vercel の表示」「Local の表示」「Codex の assess で見る表示」が一時的にズレた  
   （別コミット/別環境/別ドメインを見ていた可能性が高い）
2) 「Vercel == Local」を担保するために parity gate を追加したが、
   - `ops/vercel_prod_host.txt` が未設定（プレースホルダのまま）  
   - `/api/version` が無く 404  
   - スクリプト内の `$Host` 変数上書き（予約変数）  
   - conflict markers（<<<<<<< 等）が残っていた  
   などでスクリプトが壊れる事故が発生

---

## 直した/入れるべき修正
### A. 必須: `/api/version` ルート
- `app/api/version/route.ts` を追加して、Vercel 側で commitSha を返す。
- これが無いと parity gate は 404 になり「Vercel==Local」を判定できない。

### B. 必須: `post_merge_routine.ps1` を堅牢化
- **予約変数を使わない**（`$Host` は使わず `$prodHost` 等）
- **fail-fast**:
  - conflict markers 検出で即停止
  - prod host 未設定は即停止（escape 用に `-SkipVercelParity` は残す）
- **retry**:
  - merge 直後の「Vercel デプロイ待ち」を想定し、一定回数リトライして一致を待つ

---

## 今後の SOP（merge 後に毎回やる）
### 0) 1回だけ設定（Production のドメインを固定）
- Vercel → Project → Deployments → **Production / Current** の詳細を開く
- Domains から **production ドメイン（hostのみ）** をコピー
- どちらかで保存（おすすめはファイル）:
  - `ops/vercel_prod_host.txt` に host だけ書く  
  - もしくは `setx OSH_VERCEL_PROD_HOST "<host>"`（PowerShell 再起動が必要）

### 1) merge 後
- repo root で
  - `.\post_merge_routine.ps1`
- これで:
  - git pull（既定）
  - conflict marker 検出
  - **Vercel==Local の一致確認（リトライ付き）**
  - npm ci → build → dev 起動

---

## 次の確認ポイント
- `Test-Path .pppiersionoute.ts` が True になっているか
- Production の `https://<prod-host>/api/version` が 200 を返すか
- parity gate が `VERCEL == LOCAL ✅` を出すか
