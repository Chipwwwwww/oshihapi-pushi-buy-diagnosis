import { merch_v2_ja } from "./merch_v2_ja";
import type { DecisionRun } from "./model";

export type TelemetryEvent = "run_export" | "l1_feedback";

export type TelemetryOptions = {
  includePrice?: boolean;
  includeItemName?: boolean;
  label?: string;
};

const SESSION_KEY = "oshihapi_session_id";
export const TELEMETRY_OPT_IN_KEY = "oshihapi_telemetry_opt_in";

const questionTypeById = new Map(
  merch_v2_ja.questions.map((question) => [question.id, question.type]),
);

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  const stored = window.localStorage.getItem(SESSION_KEY);
  if (stored) return stored;
  const next = crypto.randomUUID();
  window.localStorage.setItem(SESSION_KEY, next);
  return next;
}

export function buildTelemetryPayloadFromRun(
  run: DecisionRun,
  options?: Pick<TelemetryOptions, "includePrice" | "includeItemName">,
) {
  const includePrice = options?.includePrice ?? false;
  const includeItemName = options?.includeItemName ?? false;

  const answersSummary = Object.entries(run.answers)
    .filter(([questionId]) => questionTypeById.get(questionId) !== "text")
    .map(([questionId, value]) => ({
      questionId,
      value,
    }));

  const meta = {
    itemKind: run.meta.itemKind,
    deadline: run.meta.deadline,
    ...(includePrice ? { priceYen: run.meta.priceYen } : {}),
    ...(includeItemName ? { itemName: run.meta.itemName } : {}),
  };

  return {
    runId: run.runId,
    createdAt: run.createdAt,
    locale: run.locale,
    category: run.category,
    mode: run.mode,
    meta,
    answersSummary,
    behavior: run.behavior,
    result: {
      decision: run.output.decision,
      confidence: run.output.confidence,
      score: run.output.score,
      scoreSummary: run.output.scoreSummary,
      merchMethod: {
        method: run.output.merchMethod.method,
        ...(run.output.merchMethod.blindDrawCap
          ? { blindDrawCap: run.output.merchMethod.blindDrawCap }
          : {}),
      },
    },
  };
}

export async function sendTelemetry(
  event: TelemetryEvent,
  run: DecisionRun,
  options?: TelemetryOptions,
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const sessionId = getOrCreateSessionId();
  if (!sessionId) return false;

  const payload = buildTelemetryPayloadFromRun(run, options);
  const data = {
    event,
    ...payload,
    ...(options?.label ? { label: options.label } : {}),
  };

  const response = await fetch("/api/telemetry", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event,
      sessionId,
      data,
    }),
  });

  return response.ok;
}
