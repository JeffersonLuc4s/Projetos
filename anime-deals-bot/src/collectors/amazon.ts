import { RawProduct, isAnimeProduct, isFunkoProduct, detectCategory, BOOK_AUTHOR_KEYWORDS, FUNKO_KEYWORDS, AMAZON_KEYWORDS } from "./types";
import { logger } from "../utils/logger";

const { ApiClient, DefaultApi, SearchItemsRequestContent } = require("@amzn/creatorsapi-nodejs-sdk");

const BLOCKED_BINDINGS = new Set([
  "kindle",
  "ebook kindle",
  "kindle edition",
  "audible audiobook",
  "audiolivro",
  "audio cd",
  "mp3 cd",
]);

const BLOCKED_NAME_TOKENS = [
  "kindle", "ebook", "e-book", "english edition",
  "livro digital", "edição digital", "versão digital",
  "audiolivro", "audio livro", "audiolibro",
  "versão integral", "versão completa",
];

function isBlockedByApi(item: any): string | null {
  const binding = item?.itemInfo?.classifications?.binding?.displayValue?.toLowerCase?.() ?? "";
  if (binding && BLOCKED_BINDINGS.has(binding)) return `binding=${binding}`;

  const productGroup = item?.itemInfo?.classifications?.productGroup?.displayValue?.toLowerCase?.() ?? "";
  if (productGroup.includes("kindle") || productGroup.includes("audible")) return `productGroup=${productGroup}`;

  const name = (item?.itemInfo?.title?.displayValue ?? "").toLowerCase();
  const hit = BLOCKED_NAME_TOKENS.find(t => name.includes(t));
  if (hit) return `name~="${hit}"`;

  return null;
}

function isHardcover(item: any): boolean {
  const binding = item?.itemInfo?.classifications?.binding?.displayValue?.toLowerCase?.() ?? "";
  return binding === "capa dura" || binding === "hardcover";
}

function normalizeText(s: string): string {
  return s.toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[''`´"]/g, "")
    .trim();
}

function matchesAuthor(item: any, authorKeyword: string): boolean {
  const contributors: any[] = item?.itemInfo?.byLineInfo?.contributors ?? [];
  if (!contributors.length) return false;

  const normKeyword = normalizeText(authorKeyword);
  const tokens = normKeyword.split(/[\s.]+/).filter(t => t.length >= 3);
  if (!tokens.length) return true;

  for (const c of contributors) {
    const role = String(c?.role ?? c?.roleType ?? "").toLowerCase();
    if (role && !role.includes("author") && !role.includes("autor")) continue;
    const name = normalizeText(c?.name ?? "");
    if (!name) continue;
    if (tokens.every(t => name.includes(t))) return true;
  }
  return false;
}

function extractCoupon(listing: any, currentPrice: number): {
  coupon_value?: number;
  coupon_type?: "fixed" | "percent";
  final_price?: number;
} {
  const promotions: any[] = listing?.promotions ?? [];
  const coupon = promotions.find((p) => String(p?.type ?? "").toUpperCase() === "COUPON");
  if (!coupon) return {};

  const pct = coupon?.discount?.percentage;
  const fixed = coupon?.discount?.money?.amount;

  if (typeof pct === "number" && pct > 0) {
    const finalPrice = Math.round(currentPrice * (1 - pct / 100) * 100) / 100;
    return { coupon_value: pct, coupon_type: "percent", final_price: finalPrice };
  }
  if (typeof fixed === "number" && fixed > 0) {
    const finalPrice = Math.max(0, Math.round((currentPrice - fixed) * 100) / 100);
    return { coupon_value: fixed, coupon_type: "fixed", final_price: finalPrice };
  }
  return {};
}

function extractRawProduct(item: any, defaultCategory?: string): RawProduct | null {
  const asin = item?.asin;
  const listing = item?.offersV2?.listings?.[0];
  const price = listing?.price?.money?.amount;
  if (!asin || !price || price <= 0) return null;

  const availability = listing?.availability?.type;
  if (availability && availability !== "IN_STOCK") return null;

  const blockReason = isBlockedByApi(item);
  if (blockReason) {
    logger.debug(`[Amazon API] Bloqueado (${blockReason}): ${asin}`);
    return null;
  }

  const name = item?.itemInfo?.title?.displayValue ?? "";
  const image = item?.images?.primary?.large?.url ?? item?.images?.primary?.medium?.url ?? "";
  const productUrl = item?.detailPageURL ?? `https://www.amazon.com.br/dp/${asin}`;
  const originalPrice = listing?.price?.savingBasis?.money?.amount;
  const discountPct = listing?.price?.savings?.percentage ?? 0;
  const coupon = extractCoupon(listing, price);

  return {
    source: "amazon",
    source_id: asin,
    name,
    current_price: price,
    original_price: originalPrice,
    discount_pct: discountPct,
    rating: 0,
    reviews: 0,
    image_url: image,
    product_url: productUrl,
    category: defaultCategory ?? detectCategory(name),
    is_hardcover: isHardcover(item),
    ...coupon,
  };
}

async function searchKeyword(
  api: any,
  partnerTag: string,
  keyword: string,
  searchIndex: string = "Books"
): Promise<any[]> {
  const req = new SearchItemsRequestContent();
  req.partnerTag = partnerTag;
  req.keywords = keyword;
  req.searchIndex = searchIndex;
  req.itemCount = 10;
  req.resources = [
    "images.primary.large",
    "itemInfo.title",
    "itemInfo.byLineInfo",
    "itemInfo.classifications",
    "offersV2.listings.price",
    "offersV2.listings.availability",
  ];

  try {
    const res = await api.searchItems("www.amazon.com.br", { searchItemsRequestContent: req });
    return res?.searchResult?.items ?? [];
  } catch (err: any) {
    const status = err?.status ?? err?.response?.statusCode;
    const body = err?.response?.body ?? err?.body ?? err?.response?.data;
    const apiMsg =
      body?.errors?.[0]?.message ??
      body?.Errors?.[0]?.Message ??
      (typeof body === "string" ? body : JSON.stringify(body ?? {}).slice(0, 200));
    const msg = err?.message ?? String(err);
    logger.warn(`[Amazon API] "${keyword}" → erro ${status ?? ""}: ${apiMsg || msg.slice(0, 120)}`);
    return [];
  }
}

async function collectViaCreatorsAPI(
  tag: string,
  onBatch?: (products: RawProduct[]) => Promise<void>
): Promise<RawProduct[]> {
  const apiClient = new ApiClient();
  apiClient.credentialId = process.env.AMAZON_CLIENT_ID;
  apiClient.credentialSecret = process.env.AMAZON_CLIENT_SECRET;
  apiClient.version = process.env.AMAZON_API_VERSION || "3.1";

  const api = new DefaultApi(apiClient);
  const products: RawProduct[] = [];

  const searchConfigs = [
    { keywords: AMAZON_KEYWORDS, filter: isAnimeProduct as ((name: string) => boolean) | null, defaultCategory: undefined as string | undefined, validateAuthor: false, searchIndex: "Books" },
    { keywords: FUNKO_KEYWORDS, filter: isFunkoProduct as ((name: string) => boolean) | null, defaultCategory: "figure" as string | undefined, validateAuthor: false, searchIndex: "All" },
    { keywords: BOOK_AUTHOR_KEYWORDS, filter: null, defaultCategory: "livro" as string | undefined, validateAuthor: true, searchIndex: "Books" },
  ];

  for (const { keywords, filter, defaultCategory, validateAuthor, searchIndex } of searchConfigs) {
    for (const query of keywords) {
      const items = await searchKeyword(api, tag, query, searchIndex);

      const batch: RawProduct[] = [];
      for (const item of items) {
        if (validateAuthor && !matchesAuthor(item, query)) {
          logger.debug(`[Amazon API] Autor não bate ("${query}"): ${item?.asin}`);
          continue;
        }
        const product = extractRawProduct(item, defaultCategory);
        if (!product) continue;
        if (filter && !filter(product.name)) continue;
        batch.push(product);
      }

      if (batch.length) {
        logger.info(`[Amazon API] "${query}": ${batch.length} produtos válidos`);
        if (onBatch) {
          await onBatch(batch);
        } else {
          products.push(...batch);
        }
      }

      await sleep(1100);
    }
  }

  return products;
}

export async function collectFromAmazon(onBatch?: (products: RawProduct[]) => Promise<void>): Promise<RawProduct[]> {
  const tag = process.env.AMAZON_AFFILIATE_TAG ?? process.env.AMAZON_PARTNER_TAG ?? "";

  if (!process.env.AMAZON_CLIENT_ID || !process.env.AMAZON_CLIENT_SECRET) {
    logger.warn("[Amazon] AMAZON_CLIENT_ID/SECRET ausentes. Pulando coleta Amazon.");
    return [];
  }
  if (!tag) {
    logger.warn("[Amazon] AMAZON_AFFILIATE_TAG ausente. Pulando coleta Amazon.");
    return [];
  }

  logger.info("[Amazon] Usando Creators API (oficial).");
  return collectViaCreatorsAPI(tag, onBatch);
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
