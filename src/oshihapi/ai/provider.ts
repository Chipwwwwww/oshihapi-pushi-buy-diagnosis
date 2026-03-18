const DEFAULT_AI_MODEL = "gemini-2.5-flash";
const DEFAULT_AI_TIMEOUT_MS = 1800;

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function isAiRerankEnabled(): boolean {
  return readEnv("AI_RERANK_ENABLED") === "true";
}

export function getAiTimeoutMs(): number {
  const raw = readEnv("AI_RERANK_TIMEOUT_MS");
  const parsed = raw ? Number(raw) : Number.NaN;
  if (!Number.isFinite(parsed)) return DEFAULT_AI_TIMEOUT_MS;
  return Math.max(300, Math.round(parsed));
}

export function getAiModel(): string {
  return readEnv("AI_RERANK_MODEL") ?? DEFAULT_AI_MODEL;
}

export function getGeminiApiKey(): string | null {
  return readEnv("GOOGLE_GENERATIVE_AI_API_KEY");
}
