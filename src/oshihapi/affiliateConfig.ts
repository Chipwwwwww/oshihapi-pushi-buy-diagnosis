export const MERCARI_AFID = "9533635890";

export function buildMercariSearchAffiliateUrl(keyword: string): string {
  const cleanKeyword = keyword.trim();
  return `https://jp.mercari.com/search?afid=${MERCARI_AFID}&keyword=${encodeURIComponent(cleanKeyword)}`;
}
