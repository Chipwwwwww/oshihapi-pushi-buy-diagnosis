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

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickByHash(candidates: string[], seed: string): string {
  if (candidates.length === 0) return "";
  const index = stableHash(seed) % candidates.length;
  return candidates[index];
}

function clampTokens(values: string[], max: number): string {
  if (max <= 0) return "";
  return values.slice(0, max).join("");
}

function fillTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(TOKEN_PATTERN, (_, token: string) => values[token] ?? "").trim();
}

function stripForbidden(value: string, forbiddenSubstrings: string[]): string {
  return forbiddenSubstrings.reduce(
    (acc, current) => acc.split(current).join(""),
    value,
  );
}

export function formatResultByMode(input: FormatResultByModeInput): FormattedByMode {
  const dictionary = MODE_DICTIONARY[input.mode];
  const primaryTag = MODE_PRIORITY_TAGS[input.verdict].find((tag) =>
    input.reasonTags.includes(tag),
  );
  const scenarioKey = SCENARIO_RESOLUTION.resolve(input.verdict, input.waitType, primaryTag);

  const sticker = pickByHash(dictionary.stickers[scenarioKey] ?? [], `${input.runId}:${scenarioKey}`);

  const emoji = clampTokens(
    dictionary.text.emoji.map((entry) => stripForbidden(entry, dictionary.text.forbiddenSubstrings)),
    dictionary.text.maxEmoji,
  );
  const kaomoji = clampTokens(
    dictionary.text.kaomoji.map((entry) => stripForbidden(entry, dictionary.text.forbiddenSubstrings)),
    dictionary.text.maxKaomoji,
  );

  const templateValues = {
    verdict: input.verdict,
    waitType: input.waitType ?? "none",
    reasons: input.reasons.join(" / "),
    actions: input.actions.join(" / "),
    sticker,
    emoji,
    kaomoji,
  };

  let shareTextX280 = fillTemplate(dictionary.text.templates.x_280, templateValues);
  let shareTextDmShort = fillTemplate(dictionary.text.templates.dm_short, templateValues);

  const hasForbidden = dictionary.text.forbiddenSubstrings.some(
    (token) =>
      token.length > 0
      && (shareTextX280.includes(token) || shareTextDmShort.includes(token) || sticker.includes(token)),
  );

  if (hasForbidden) {
    const fallbackSticker = pickByHash(
      MODE_DICTIONARY.standard.stickers[scenarioKey] ?? [],
      `${input.runId}:${scenarioKey}:fallback`,
    );
    shareTextX280 = stripForbidden(shareTextX280, dictionary.text.forbiddenSubstrings).replace(sticker, fallbackSticker);
    shareTextDmShort = stripForbidden(shareTextDmShort, dictionary.text.forbiddenSubstrings).replace(sticker, fallbackSticker);

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
