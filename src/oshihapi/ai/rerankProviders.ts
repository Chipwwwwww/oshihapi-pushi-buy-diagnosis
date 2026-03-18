import type { ProviderId } from "@/src/oshihapi/providerRegistry";
import { getAiModel, getAiTimeoutMs, getGeminiApiKey } from "@/src/oshihapi/ai/provider";

export type AiRerankAction = "keep" | "promote_one_level" | "demote_one_level";

export type AiRerankCandidateInput = {
  provider: ProviderId;
  baseTier: "recommended" | "okay" | "lowProbability";
  score: number;
  hardBlocked: boolean;
  signals: string[];
};

export type AiRerankRequest = {
  scenario: {
    itemKind?: string;
    goodsClass?: string;
    confidence: number;
    bonusSensitive: boolean;
    usedIntent: boolean;
    mediaIntent: boolean;
  };
  candidates: AiRerankCandidateInput[];
  rules: {
    cannotIntroduceNewProviders: true;
    cannotOverrideHardBlocks: true;
    maxTierChange: 1;
  };
};

export type AiRerankAdjustment = {
  provider: ProviderId;
  action: AiRerankAction;
  reason: string;
};

export type AiRerankResult = {
  adjustments: AiRerankAdjustment[];
  capRecommendedTo?: 0 | 1 | 2;
  confidenceNote?: string;
};

export type AiRerankAttempt = {
  invoked: boolean;
  model: string;
  fallbackReason?: string;
  result: AiRerankResult | null;
};

const GEMINI_API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";

function buildPrompt(input: AiRerankRequest): string {
  return [
    "You are a deterministic provider tier reranker for a shopping diagnosis product.",
    "Return JSON only. No markdown fences. No commentary outside JSON.",
    "Allowed actions: keep, promote_one_level, demote_one_level.",
    "Do not add providers. Do not mention providers not already listed.",
    "Do not override hidden, suppressed, or hard-blocked providers.",
    "Do not move any provider by more than one tier.",
    "Prefer diagnosis clarity over commercial coverage.",
    "If confidence is low or the top tier feels crowded, keep recommended short.",
    "Use short reasons suitable for diagnostics.",
    "Scenario and candidate data:",
    JSON.stringify(input),
    'Return exactly one JSON object with keys: adjustments, capRecommendedTo, confidenceNote.',
  ].join("\n");
}

function extractResponseText(payload: unknown): string | null {
  if (!isObjectRecord(payload)) return null;
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const parts: string[] = [];

  for (const candidate of candidates) {
    if (!isObjectRecord(candidate)) continue;
    const content = isObjectRecord(candidate.content) ? candidate.content : null;
    const contentParts = content && Array.isArray(content.parts) ? content.parts : [];
    for (const part of contentParts) {
      if (!isObjectRecord(part)) continue;
      if (typeof part.text === "string" && part.text.trim()) {
        parts.push(part.text.trim());
      }
    }
  }

  if (parts.length > 0) return parts.join("\n");
  return null;
}

function extractJson(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  return candidate.slice(firstBrace, lastBrace + 1);
}

export function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isValidAction(value: unknown): value is AiRerankAction {
  return value === "keep" || value === "promote_one_level" || value === "demote_one_level";
}

export function isValidAdjustment(value: unknown): value is AiRerankAdjustment {
  if (!isObjectRecord(value)) return false;
  return typeof value.provider === "string" && isValidAction(value.action) && typeof value.reason === "string";
}

export function isValidRerankResult(value: unknown): value is AiRerankResult {
  if (!isObjectRecord(value)) return false;
  if (!Array.isArray(value.adjustments) || !value.adjustments.every(isValidAdjustment)) return false;
  if (value.capRecommendedTo != null && value.capRecommendedTo !== 0 && value.capRecommendedTo !== 1 && value.capRecommendedTo !== 2) return false;
  if (value.confidenceNote != null && typeof value.confidenceNote !== "string") return false;
  return true;
}

export async function rerankProvidersWithAI(input: AiRerankRequest): Promise<AiRerankAttempt> {
  const model = getAiModel();
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return { invoked: false, model, fallbackReason: "missing_api_key", result: null };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getAiTimeoutMs());

  try {
    const response = await fetch(`${GEMINI_API_ROOT}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return { invoked: true, model, fallbackReason: `api_http_${response.status}`, result: null };
    }

    const payload: unknown = await response.json();
    const responseText = extractResponseText(payload);
    if (!responseText) {
      return { invoked: true, model, fallbackReason: "empty_response", result: null };
    }

    const jsonText = extractJson(responseText);
    if (!jsonText) {
      return { invoked: true, model, fallbackReason: "json_missing", result: null };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return { invoked: true, model, fallbackReason: "parse_failure", result: null };
    }

    if (!isValidRerankResult(parsed)) {
      return { invoked: true, model, fallbackReason: "invalid_shape", result: null };
    }

    return { invoked: true, model, result: parsed };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { invoked: true, model, fallbackReason: "timeout", result: null };
    }
    return {
      invoked: true,
      model,
      fallbackReason: error instanceof Error ? `fetch_error:${error.name}` : "fetch_error",
      result: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}
