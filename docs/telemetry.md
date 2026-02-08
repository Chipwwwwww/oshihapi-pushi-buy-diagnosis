# Anonymous telemetry (opt-in)

This project supports an opt-in telemetry pipeline that stores anonymized diagnostic runs in the
Neon Postgres table `telemetry_runs`. Data is only sent when the user explicitly presses the
"匿名データを送信する" button. If a user has opted in once, later L1 feedback clicks are also
sent.

## What is collected

Each event is stored as one row in `telemetry_runs` with:
- `id`: random UUID (server generated)
- `session_id`: random UUID stored in `localStorage` (`oshihapi_session_id`)
- `source`: event name (`run_export` or `l1_feedback`)
- `data`: JSON payload with non-identifying diagnostic data

The JSON payload includes:
- `event` (duplicated for easy querying)
- `runId`, `createdAt`, `locale`, `category`, `mode`
- `meta` (deadline/itemKind, and optionally price/itemName)
- `answersSummary` (question id + selected option or scale value; text answers are excluded)
- `behavior` (timing + interaction counters)
- `result` (decision, confidence, score summary, merch method)
- `label` (only for `l1_feedback` events)

## Privacy defaults

- Price and item name are **not** sent by default.
- The UI provides explicit checkboxes to allow sending price and/or item name.
- Free-text answers are never included.
- No login, email, or IP address is stored.

## Example queries

See `docs/sql/queries.sql` for ready-to-run queries, including:
- latest 10 rows
- counts per event
- filtering L1 feedback events

## Client opt-in state

- Opt-in is stored in `localStorage` key `oshihapi_telemetry_opt_in`.
- When opt-in is true, L1 feedback clicks send an additional `l1_feedback` event.
