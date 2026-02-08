import type { DecisionRun } from "./model";

const STORAGE_KEY = "oshihapi:telemetry_events";

type TelemetryPayload = {
  label: string;
  includePrice: boolean;
  includeItemName: boolean;
};

type TelemetryEvent = {
  event: string;
  timestamp: number;
  runId: string;
  payload: TelemetryPayload;
  meta: {
    itemName?: string;
    priceYen?: number;
    itemKind?: string;
    deadline?: string;
  };
  decision: string;
};

export function sendTelemetry(
  event: string,
  run: DecisionRun,
  payload: TelemetryPayload,
) {
  if (typeof window === "undefined") return;
  const meta = {
    itemName: payload.includeItemName ? run.meta.itemName : undefined,
    priceYen: payload.includePrice ? run.meta.priceYen : undefined,
    itemKind: run.meta.itemKind,
    deadline: run.meta.deadline,
  };
  const entry: TelemetryEvent = {
    event,
    timestamp: Date.now(),
    runId: run.runId,
    payload,
    meta,
    decision: run.output.decision,
  };

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as TelemetryEvent[]) : [];
    const next = Array.isArray(parsed) ? [...parsed, entry] : [entry];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([entry]));
  }
}
