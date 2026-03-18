const TOKEN_NORMALIZATIONS: Array<[RegExp, string]> = [
  [/\bbluray\b/gi, "blu-ray"],
  [/\bblu\s*ray\b/gi, "blu-ray"],
  [/\bbd\b/gi, "blu-ray"],
  [/缶バ/g, "缶バッジ"],
  [/\bim@s\b/gi, "アイマス"],
  [/\bimas\b/gi, "アイマス"],
];

export function normalizeSearchClues(raw: string) {
  let normalized = raw
    .replace(/[\u3000\t\n\r]+/g, " ")
    .replace(/[／/・,，、;；|｜]+/g, " ")
    .replace(/[“”"'「」『』【】()（）\[\]{}]/g, " ")
    .replace(/[‐‑‒–—―ー]+/g, "-")
    .trim();

  normalized = normalized.replace(/[A-Z]/g, (char) => char.toLowerCase());
  for (const [pattern, replacement] of TOKEN_NORMALIZATIONS) {
    normalized = normalized.replace(pattern, replacement);
  }

  normalized = normalized
    .replace(/\s+-\s+/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return {
    raw,
    normalized,
    tokens: normalized ? normalized.split(" ").filter(Boolean) : [],
  };
}
