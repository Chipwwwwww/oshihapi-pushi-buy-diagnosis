# status summary (latest)

## What is done
- post_merge_routine.ps1: PS 5.1 compatible, build-first pipeline, parity gate (config-driven)
- StyleMode concept clarified:
  - FlowMode (診断深さ) vs StyleMode (文案世界観 ver0/1/2)

## What is NOT yet visible (current pain)
- StyleMode toggle is not guaranteed to exist on HOME/flow yet.
  - If only result page was updated, users won't see the feature early.

## Next PR (Codex)
- Implement StyleMode end-to-end (HOME + flow + result) using:
  - docs/mode_copy_spec_latest.md
  - src/oshihapi/modes/style_copy_dictionary.ts
- Rename FlowMode section label to avoid confusion.

## Acceptance criteria
- npm run build ✅
- Manual: change StyleMode on HOME -> flow question copy changes -> result copy changes
- verdict/reasons/actions semantics unchanged

