# オシハピ｜推し買い診断（アニメ周辺グッズ購買決策特化）SPEC.md

> MVP：モバイル優先Web/PWA、ログイン不要、localStorage中心。  
> 主題：**アニメ周辺グッズ（くじ/BOX/中古/予約/限定/特典/イベント参加=チケット）**の「買う/やめる/保留」を60秒で出す。

---

## 1. プロダクト要件（MVP）

### 1.1 コア
- 入力（任意/推奨）
  - 商品名（任意）
  - 価格（任意だが推奨）
  - 締切（任意：今日/明日/1週間以内/未定）
  - 種別（任意：グッズ/くじ/チケット/中古/予約）※内部はすべて「グッズ」扱い
- 質問：**4〜7問**（急ぎ=4〜6、通常=6〜7）
- 出力：
  - 結論：BUY / THINK / SKIP（表示は日本語：買う/保留/やめる）
  - 理由：3〜6（個別回答に応じて）
  - 行動：1〜3（具体的な次アクション）
  - 追加：買い方提案（中古単品/BOX/盲抽上限/見送り）
  - 共有：結果カード画像 + shareText（金額非表示オプション）

### 1.2 “急ぎ/非急ぎ” の扱い
- urgent：AI/外部検索を前提にしない。短問答で即決を支援。
- normal：相場確認や比較の導線を提供（リンク跳转）。将来AIを足せる余地を残す。

---

## 2. 情報設計（IA）/ 画面

### 2.1 Routes（Next.js App Router推奨）
- `/` Home：開始（急ぎ/通常）、簡易入力
- `/flow` Wizard：質問フロー
- `/result/[runId]` 結果表示 + 共有 + 保存
- `/history` 履歴（直近20件）
- `/settings` 設定（隠す金額デフォルト、診断の性格）
- `/about` / `/privacy`

### 2.2 Home UI
- ブランド：オシハピ / サービス名：推し買い診断
- サブコピー：`推しグッズの「買う/保留/やめる」を60秒で。くじ・中古・予約もOK`
- CTA
  - `急いで決める（30秒）`
  - `じっくり決める（60秒）`
- 入力（任意）
  - 商品名（text）
  - 価格（number）
  - 締切（select：今日/明日/3日以内/1週間以内/未定）
  - 種別（select：グッズ/くじ/中古/予約/チケット）
  - 価格を共有カードに出すか（toggle）

### 2.3 Flow UI（Wizard）
- 1問1画面（カード）
- 進捗（例：3/6）
- 戻る/中断
- urgent：`urgentCore=true` の質問のみで完走できるように

### 2.4 Result UI
- 結論（大きく）：買う / 保留 / やめる
- confidence（0–100）
- 理由（3–6）・行動（1–3）
- 買い方提案（中古単品 / BOX / 盲抽上限 / 見送り）
- 価格はデフォルト非表示（設定でオン/オフ）
- 相場導線（リンク跳转）
  - `メルカリで相場を見る`（Google site検索でもOK）
  - `ヤフオクで見る`
  - `駿河屋で見る`
- 共有
  - 画像カード生成（html-to-image/html2canvas）
  - shareTextコピー
  - Web Share API（対応ならファイル共有）

### 2.5 History UI
- 直近20件
- 表示項目：日付 / 結論 / impulseIndex（高・中・低）
- クリックで結果へ遷移

---

## 3. データモデル（TypeScript）

### 3.1 enums & types（抜粋）
- Category：MVPは `merch` のみ（ただし `itemKind` でくじ/中古/予約/チケット等をタグ化）
- Mode：urgent / normal

- Score Dimensions（0-100）
  - desire, affordability, urgency, rarity, restockChance, regretRisk, impulse, opportunityCost

- Output
  - decision (BUY/THINK/SKIP)
  - confidence
  - scoreSummary（dimensions）
  - reasons/actions（テンプレ＋タグ）
  - merchMethod（USED_SINGLE/BOX/BLIND_DRAW/PASS + cap）

---

## 4. 題庫（merch_v2_ja）設計方針
- 合計7問（通常）
- urgentCore（急ぎで必ず聞く）を4〜6問設定
- 質問は “5〜10秒で答えられる” 形式（single/scale中心）
- 盲抽/BOX/中古/燙角・冷角/再販/転売回収を最低限カバー

---

## 5. エンジン（ルール＋加重）

### 5.1 計算
- 各質問の回答を各dimensionへ加点（0-100換算）
- dimensionを正規化：`norm = (x-50)/50`（-1〜+1）
- DecisionScore = Σ(norm(dimension)*weight)

### 5.2 デフォルトweight（engineConfig.ts）
- desire +0.35
- affordability +0.20
- rarity +0.10
- urgency +0.10
- restockChance -0.08
- regretRisk -0.15
- impulse -0.10
- opportunityCost -0.12

### 5.3 thresholds
- BUY：score >= +0.20
- SKIP：score <= -0.20
- それ以外 THINK

### 5.4 confidence
- `confidence = clamp(50, 95, 50 + abs(score)*70 - unknownPenalty)`
- unknownPenalty：重要項目（価格/稀少/再販/狙い方）が “わからない” の数で減点

### 5.5 理由・行動（reasonRules.ts）
- ルールトリガー（例）
  - affordability低 + price入力あり → 「今月の負担が大きい」
  - desire高 → 「満足度が出やすい」
  - urgency高×restock低×impulse高 → 「焦り圧が強い、判断が荒れやすい」
  - cold（冷角）×目的=一点狙い → 「中古単品が堅い」
  - hot（燙角）×一点狙い×転売NG → 「盲抽は期待値が悪化、単品で確実に」
  - set目的×封入不明 → 「まず封入/揃うか確認」
- actions例
  - `24時間だけ寝かせる`
  - `相場を1分だけ見る（メルカリ/駿河屋）`
  - `上限予算を固定して超えたら見送り`
  - `盲抽は上限{cap}回で止める`

### 5.6 買い方提案（merchMethod.ts）
- 目的が “一点狙い/セット/体験” を軸に
- hot/cold、転売許容、後悔リスク、予算痛みを加味して
  - USED_SINGLE / BOX / BLIND_DRAW(cap) / PASS を出す

---

## 6. 相場リンク（linkBuilder）
- MVPはAPI不要：Google site検索で十分
- 例：
  - mercari：`https://www.google.com/search?q=site:jp.mercari.com+{query}`
  - surugaya：`https://www.google.com/search?q=site:suruga-ya.jp+{query}`
- queryは `itemName` + tags（作品名/キャラ/シリーズ/型番）を結合

---

## 7. ローカル保存（localStorage）
- keys
  - `oshihapi:runs:v1` -> DecisionRun[]
  - `oshihapi:settings:v1` -> Settings
- runsは最大20件、古い順に削除

---

## 8. 共有カード（Share Card）
- サイズ：1080x1350（推奨）
- 内容
  - 結論（買う/保留/やめる）
  - 理由2-3
  - 行動1
  - ロゴ（オシハピ）
  - 価格（オプション：非表示）
- 生成：`html-to-image` or `html2canvas`
- Web Share API対応なら画像共有、非対応はダウンロード＋テキストコピー

---

## 9. 受け入れ条件（DoD）
- Home→Flow→Resultが通る（urgent/normal）
- 出力が安定（理由3つ以上、行動1つ以上）
- 買い方提案が出る（中古/BOX/盲抽cap/見送り）
- 結果カードが生成できる（価格非表示切替）
- 履歴20件保存・表示
- 全UI日本語（MVPはjaのみ）

---

## 10. Codex向けタスク指示（貼り付け用）
```md
Next.js + TypeScriptで「オシハピ｜推し買い診断」を実装してください。
- ルート：/ /flow /result/[runId] /history /settings /about /privacy
- カテゴリはmerchのみ（itemKindで くじ/中古/予約/チケット を扱う）
- merch_v2_ja.ts（7問）を実装し、urgentはurgentCoreのみで完走
- engineConfig.tsのweight/thresholdでBUY/THINK/SKIP判定
- reasonRules.tsで理由3-6件、actions1-3件生成
- merchMethod.tsで中古単品/BOX/盲抽cap/見送りを提案
- localStorageに直近20件保存
- 結果カード画像生成（価格非表示オプション）＋共有テキスト
- 相場導線はGoogle site検索リンクでOK（メルカリ/駿河屋/ヤフオク）
まずHome→Flow→Resultを最短で動かし、次にshare、最後にhistoryを追加してください。
```

## Next PR（Codex用）: Friend Test + ML data foundation（質問は増やさない）

P0: build must stay green（npm run build が通ること）

P1: 友達テスト最低限（MVPを壊さず改善）
1) 結果ページに 1タップフィードバック（L1）を追加：
   - UI文言：このあとどうした？（買った / 保留 / 買わなかった / まだ）
   - runStorage に feedback_immediate を保存（runId に紐付け）

2) 行動ログ（behavior）を保存（まずは localStorage のみ）：
   - time_total_ms
   - time_per_q_ms[]
   - num_changes（選び直し回数）
   - num_backtracks（戻る回数）
   - actions_clicked（copy/share/links など）

3) ガード強化：
   - /history：履歴0件の表示（「まだ履歴がありません」）
   - /result/[runId]：該当 run が無い場合の表示（戻る導線）

4) コピーUX改善：
   - navigator.clipboard 成功時に軽いトースト表示

