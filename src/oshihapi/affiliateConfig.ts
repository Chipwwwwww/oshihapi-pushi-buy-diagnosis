export const MERCARI_AFID = "9533635890";

export function buildMercariSearchAffiliateUrl(keyword: string): string {
  const cleanKeyword = keyword.trim();
  const params = new URLSearchParams({
    afid: MERCARI_AFID,
    keyword: cleanKeyword,
  });
  return `https://jp.mercari.com/search?${params.toString()}`;
}
