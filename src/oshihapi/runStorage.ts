import type { DecisionRun } from "./model";

const STORAGE_KEY = "oshihapi:runs:v1";
const MAX_RUNS = 20;

export function loadRuns(): DecisionRun[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as DecisionRun[];
    }
    return [];
  } catch {
    return [];
  }
}

export function saveRun(run: DecisionRun): DecisionRun[] {
  if (typeof window === "undefined") return [];
  const runs = loadRuns();
  const nextRuns = [run, ...runs].slice(0, MAX_RUNS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRuns));
  return nextRuns;
}

export function findRun(runId: string): DecisionRun | undefined {
  return loadRuns().find((run) => run.runId === runId);
}
