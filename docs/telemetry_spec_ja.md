# オシハピ｜推し買い診断 Telemetry（匿名データ）仕様（MVP）

目的：
- ルール/重み/閾値の改善、質問の改善、UX改善のための匿名ログを取得する
- 個人情報は収集しない（ログインなし、メールなし、IP保存なしを基本）
- 「ユーザーが明示的に送信」した場合のみ送る（デフォルトOFF）

## 送信タイミング（MVP）
- 結果ページに「学習のために匿名データを送信」カードを追加
- ユーザーがボタンを押したときだけ `POST /api/telemetry` を実行
- L1フィードバック（買った/保留した/買わなかった/まだ）を押したときに「同意がONなら」追加で送信
  - MVPでは「送信ボタン」を押すと同意ONにする（次回以降もONにしたい場合は localStorage）

## 送信データ（基本）
- event: 'run_export' | 'l1_feedback'
- sessionId: localStorageに保存するランダムUUID（個人識別しない）
- runId: 既存runId（localStorageのrun record）
- mode: short/medium/long
- itemKind: goods/ticket（将来）
- answersSummary:
  - 選択肢ID/スケール値のみ（自由入力は送らない）
  - qId, value, ms（回答時間）を含める
- result:
  - decision (buy/hold/stop)
  - confidence/tilt
  - dimensionScores（予算圧力/推し度/希少性/後悔リスク/機会コスト…）
- meta（送る/送らない制御）
  - price: デフォルト送らない（ユーザーがチェックを外したら送れる）
  - itemName: デフォルト送らない（同上）
  - deadline: enum（today/tomorrow…）は送ってOK

## DB
- Neon(Postgres) に `telemetry_runs` テーブル
- 1行=1イベント（JSONBに全部入れてスキーマを固定しすぎない）
