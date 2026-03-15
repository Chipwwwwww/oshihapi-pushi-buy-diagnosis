import { NextRequest, NextResponse } from "next/server";

const RAKUTEN_ENDPOINT = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601";
const DEFAULT_HITS = 4;

type RakutenSearchItem = {
  name: string;
  price: number | null;
  affiliateUrl: string;
  image: string | null;
  shopName: string | null;
  reviewAverage: number | null;
  reviewCount: number | null;
  availability: number | null;
};

type RakutenSearchResponse = {
  ok: boolean;
  keyword: string;
  items: RakutenSearchItem[];
  reason?: string;
};

function getRequiredEnv() {
  const applicationId = process.env.RAKUTEN_APPLICATION_ID?.trim();
  const accessKey = process.env.RAKUTEN_ACCESS_KEY?.trim();
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID?.trim();

  if (!applicationId || !accessKey || !affiliateId) return null;
  return { applicationId, accessKey, affiliateId };
}

function pickImage(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  for (const candidate of value) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    if (
      typeof candidate === "object" &&
      candidate !== null &&
      "imageUrl" in candidate &&
      typeof (candidate as { imageUrl?: unknown }).imageUrl === "string"
    ) {
      const imageUrl = (candidate as { imageUrl: string }).imageUrl.trim();
      if (imageUrl) return imageUrl;
    }
  }
  return null;
}

function normalizeItem(value: unknown): RakutenSearchItem | null {
  if (typeof value !== "object" || value === null) return null;

  const entry = value as Record<string, unknown>;
  const rawAffiliateUrl =
    typeof entry.affiliateUrl === "string"
      ? entry.affiliateUrl.trim()
      : typeof entry.itemUrl === "string"
        ? entry.itemUrl.trim()
        : "";

  if (!rawAffiliateUrl) return null;

  return {
    name: typeof entry.itemName === "string" ? entry.itemName.trim() : "",
    price: typeof entry.itemPrice === "number" ? entry.itemPrice : null,
    affiliateUrl: rawAffiliateUrl,
    image: pickImage(entry.mediumImageUrls) ?? pickImage(entry.smallImageUrls),
    shopName: typeof entry.shopName === "string" ? entry.shopName.trim() : null,
    reviewAverage: typeof entry.reviewAverage === "number" ? entry.reviewAverage : null,
    reviewCount: typeof entry.reviewCount === "number" ? entry.reviewCount : null,
    availability: typeof entry.availability === "number" ? entry.availability : null,
  };
}

function normalizeItems(payload: unknown): RakutenSearchItem[] {
  if (typeof payload !== "object" || payload === null) return [];
  const root = payload as Record<string, unknown>;
  const rawItems = Array.isArray(root.Items) ? root.Items : [];

  const normalized = rawItems
    .map((item) => {
      if (typeof item === "object" && item !== null && "Item" in item) {
        return normalizeItem((item as { Item?: unknown }).Item);
      }
      return normalizeItem(item);
    })
    .filter((item): item is RakutenSearchItem => Boolean(item && item.affiliateUrl));

  return normalized;
}

function emptyResult(keyword: string, reason: string): NextResponse<RakutenSearchResponse> {
  return NextResponse.json({ ok: false, keyword, items: [], reason });
}

export async function GET(request: NextRequest): Promise<NextResponse<RakutenSearchResponse>> {
  const keyword = request.nextUrl.searchParams.get("keyword")?.trim() ?? "";
  if (!keyword) return emptyResult("", "missing_keyword");

  const env = getRequiredEnv();
  if (!env) return emptyResult(keyword, "rakuten_env_missing");

  const url = new URL(RAKUTEN_ENDPOINT);
  url.searchParams.set("applicationId", env.applicationId);
  url.searchParams.set("affiliateId", env.affiliateId);
  url.searchParams.set("keyword", keyword);
  url.searchParams.set("hits", String(DEFAULT_HITS));
  url.searchParams.set("format", "json");
  url.searchParams.set("formatVersion", "2");
  url.searchParams.set(
    "elements",
    "itemName,itemPrice,itemUrl,affiliateUrl,mediumImageUrls,smallImageUrls,shopName,reviewAverage,reviewCount,availability",
  );

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.accessKey}`,
      },
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return emptyResult(keyword, `rakuten_http_${response.status}`);
    }

    const payload: unknown = await response.json();
    const items = normalizeItems(payload);
    return NextResponse.json({ ok: true, keyword, items });
  } catch (error) {
    const reason = error instanceof Error ? `rakuten_fetch_error:${error.name}` : "rakuten_fetch_error";
    return emptyResult(keyword, reason);
  }
}
