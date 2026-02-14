# Restore report: main full feature set PR39–PR80+

## Summary
Restore main full feature set PR39–PR80+ after reset to PR77 by replaying missing merged PR content on top of current main baseline.

## Source-of-truth method used
1. Intended method was GitHub PR API/`gh pr view` for PR 39..120.
2. In this environment, GitHub network access and `gh` were unavailable (`CONNECT tunnel failed, response 403`; `gh: command not found`).
3. Fallback source-of-truth was the locally available former main tip commit `5e24aa4` (PR #81 merge), and merge commits discovered from local git history.
4. Temporary machine-readable inventory generated during execution: `ops/tmp_pr_merge_commits.json` (not committed).

## PR restore table

| PR | title | merge commit (historical) | status | notes/conflicts |
|---:|---|---|---|---|
| 39 | fix-home-page-layout-regression | `cf7fd9918ac7bcdab710b3bb806c88102f5ac206` | present | Already on baseline history. |
| 79 | sync-main-from-feature-and-add-db-guard | `3e882b858ff88bc7b249d70c3f55f9d063a8be72` | applied | Replayed via `git cherry-pick -m 1`; no conflicts. |
| 80 | sync-main-with-feature/urgent-medium-long | `34370dabac938159f5c439dd7eadae0d107f9a1c` | applied | Replayed via `git cherry-pick -m 1`; no conflicts. |
| 81 | sync-feature-branch-styles-to-main | `5e24aa47961880f7d22273a83920bb1a6b679d06` | applied | Replayed via `git cherry-pick -m 1`; conflict in `app/page.tsx` resolved minimally by keeping existing style section + diagnosis section structure. |

## Verification commands run
- `npm ci`
- `npm run build` (after each replayed PR)

Build output confirms required routes exist:
- `/`
- `/flow`
- `/history`
- `/result/[runId]`
- `/api/telemetry/health`

## Rollback plan
Safe rollback options:
1. Revert replay commits on main in reverse order after merge, e.g.
   - `git revert <PR81_replay_commit> <PR80_replay_commit> <PR79_replay_commit>`
2. Or reset main to pre-restore backup reference/tag created before merge:
   - `git checkout main && git reset --hard <backup_sha_or_tag>`

Recommended operational safety step before merge:
- Create backup tag/branch from current main, e.g. `backup/pre-restore-pr39-80plus-<date>`.
