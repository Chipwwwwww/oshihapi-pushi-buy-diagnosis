# Mode Copywriting (JA) — 完全版

- src/oshihapi/modes/mode_copy_ja.ts が「質問文案・選択肢文案・結果説明/アクション説明」を ver0/ver1/ver2 で切り替える単一ソースです。
- 実装側（Codex）は：
  - Home で style を選択 → localStorage("oshihapi:presentationMode") 保存
  - /flow に pm=standard|kawaii|oshi を渡す
  - Flow の表示文言を QUESTION_COPY で上書き（選択肢キーは変更しない）
  - Result の説明文言を RESULT_COPY で上書き（verdict/reasonTags/actions は不変）
