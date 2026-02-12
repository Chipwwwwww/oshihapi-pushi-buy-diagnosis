import {
  MODE_DICTIONARY,
  MODE_PRIORITY_TAGS,
  ResultMode,
  SCENARIO_RESOLUTION,
  Verdict,
} from "@/src/oshihapi/modes/mode_dictionary";

type FormatResultByModeInput = {
  runId: string;
  verdict: Verdict;
  waitType?: string;
  reasons: string[];
  reasonTags: string[];
  actions: string[];
  mode: ResultMode;
};

type FormattedByMode = {
  sticker: string;
  shareTextX280: string;
  shareTextDmShort: string;
};

const TOKEN_PATTERN = /\{(verdict|waitType|reasons|actions|sticker|emoji|kaomoji)\}/g;
const X_TEXT_LIMIT = 280;

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickByHash(candidates: string[], hashSeed: number): string {
  if (candidates.length === 0) return "";
  const index = hashSeed % candidates.length;
  return candidates[index];
}

function pickTokensByHash(candidates: string[], max: number, hashSeed: number): string {
  if (max <= 0 || candidates.length === 0) return "";
  const uniqueCandidates = Array.from(new Set(candidates));
  const limit = Math.min(max, uniqueCandidates.length);
  const offset = hashSeed % uniqueCandidates.length;
  const picked: string[] = [];

  for (let i = 0; i < limit; i += 1) {
    picked.push(uniqueCandidates[(offset + i) % uniqueCandidates.length]);
  }

  return picked.join("");
}

function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(TOKEN_PATTERN, (_, token: string) => values[token] ?? "").trim();
}

function stripForbidden(value: string, forbiddenSubstrings: string[]): string {
  return forbiddenSubstrings.reduce((acc, current) => acc.split(current).join(""), value);
}

function capJoined(values: string[], separator: string, maxLength: number): string {
  const cleaned = values.map((entry) => entry.trim()).filter(Boolean);
  if (cleaned.length === 0) return "";

  let output = "";
  for (const entry of cleaned) {
    const candidate = output ? `${output}${separator}${entry}` : entry;
    if (candidate.length <= maxLength) {
      output = candidate;
      continue;
    }

    if (!output) {
      output = `${entry.slice(0, Math.max(0, maxLength - 1))}…`;
    } else {
      output = `${output}…`;
    }
    break;
  }
  return output;
}

function clampText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

export function formatResultByMode(input: FormatResultByModeInput): FormattedByMode {
  const dictionary = MODE_DICTIONARY[input.mode];
  const primaryTag = MODE_PRIORITY_TAGS[input.verdict].find((tag) => input.reasonTags.includes(tag));
  const normalizedWaitType = input.verdict === "THINK" ? (input.waitType ?? "none") : "";
  const scenarioKey = SCENARIO_RESOLUTION.resolve(input.verdict, normalizedWaitType, primaryTag);
  const runHash = stableHash(input.runId);
  const stickerHash = runHash;

  const sticker = pickByHash(dictionary.stickers[scenarioKey] ?? [], stickerHash);
  const emoji = pickTokensByHash(dictionary.text.emoji, dictionary.text.maxEmoji, runHash);
  const kaomoji = pickTokensByHash(dictionary.text.kaomoji, dictionary.text.maxKaomoji, runHash + 17);

  const templateValues = {
    verdict: input.verdict,
    waitType: normalizedWaitType,
    reasons: capJoined(input.reasons, " / ", 90),
    actions: capJoined(input.actions, " / ", 80),
    sticker,
    emoji,
    kaomoji,
  };

  let shareTextX280 = clampText(fillTemplate(dictionary.text.templates.x_280, templateValues), X_TEXT_LIMIT);
  let shareTextDmShort = fillTemplate(dictionary.text.templates.dm_short, templateValues);

  const hasForbidden = dictionary.text.forbiddenSubstrings.some(
    (token) =>
      token.length > 0 &&
      (shareTextX280.includes(token) || shareTextDmShort.includes(token) || sticker.includes(token)),
  );

  if (hasForbidden) {
    const fallbackSticker = pickByHash(MODE_DICTIONARY.standard.stickers[scenarioKey] ?? [], stickerHash);
    shareTextX280 = clampText(
      stripForbidden(shareTextX280, dictionary.text.forbiddenSubstrings).replace(sticker, fallbackSticker),
      X_TEXT_LIMIT,
    );
    shareTextDmShort = stripForbidden(shareTextDmShort, dictionary.text.forbiddenSubstrings).replace(
      sticker,
      fallbackSticker,
    );

    return {
      sticker: fallbackSticker,
      shareTextX280,
      shareTextDmShort,
    };
  }

  return {
    sticker,
    shareTextX280,
    shareTextDmShort,
  };
}
