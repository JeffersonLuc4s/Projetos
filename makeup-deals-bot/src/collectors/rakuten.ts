/**
 * Cliente Rakuten Advertising.
 *
 * Usa o formato de deeplink direto (click.linksynergy.com) e a Product Search API
 * (XML endpoint) para buscar produtos dos advertisers aprovados.
 *
 * Docs: https://developers.rakutenadvertising.com/
 */

import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { logger } from "../utils/logger";

const DEEPLINK_BASE = "https://click.linksynergy.com/deeplink";
const PRODUCT_SEARCH_URL = "https://productsearch.linksynergy.com/productsearch";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseAttributeValue: false,
  parseTagValue: false,
});

export function buildRakutenDeepLink(originalUrl: string, advertiserId: string): string {
  const sid = process.env.RAKUTEN_SID;
  if (!sid || !advertiserId) {
    logger.warn("[Rakuten] SID ou advertiser ausente, usando URL original.");
    return originalUrl;
  }
  const params = new URLSearchParams({
    id: sid,
    mid: advertiserId,
    murl: originalUrl,
  });
  return `${DEEPLINK_BASE}?${params.toString()}`;
}

export function getAdvertiserId(source: "belezanaweb" | "ocean"): string {
  if (source === "belezanaweb") return process.env.RAKUTEN_ADVERTISER_BELEZA ?? "";
  if (source === "ocean") return process.env.RAKUTEN_ADVERTISER_OCEAN ?? "";
  return "";
}

export interface RakutenProduct {
  mid: string;
  productname: string;
  linkurl: string;
  imageurl?: string;
  price: number;         // preço de lista
  saleprice: number;     // preço promo (0 se não tem promo)
  sku?: string;
  description?: string;
  category?: string;
}

export interface ProductSearchOptions {
  keyword?: string;
  mid: string;
  max?: number;
  pagenumber?: number;
}

function parsePrice(node: any): number {
  if (node == null) return 0;
  const text = typeof node === "string" || typeof node === "number"
    ? String(node)
    : (node["#text"] ?? "");
  const n = parseFloat(String(text).replace(",", "."));
  return isNaN(n) ? 0 : n;
}

export async function searchRakutenProducts(opts: ProductSearchOptions): Promise<RakutenProduct[]> {
  const token = process.env.RAKUTEN_WS_TOKEN;
  if (!token) {
    logger.warn("[Rakuten] RAKUTEN_WS_TOKEN ausente.");
    return [];
  }

  try {
    const res = await axios.get(PRODUCT_SEARCH_URL, {
      params: {
        token,
        keyword: opts.keyword ?? "",
        mid: opts.mid,
        max: opts.max ?? 50,
        pagenumber: opts.pagenumber ?? 1,
      },
      timeout: 20000,
      responseType: "text",
    });

    const parsed = xmlParser.parse(res.data);
    const rawItems = parsed?.result?.item;
    if (!rawItems) return [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];

    return items.map((it: any): RakutenProduct => ({
      mid: String(it.mid ?? ""),
      productname: String(it.productname ?? "").trim(),
      linkurl: String(it.linkurl ?? ""),
      imageurl: it.imageurl ? String(it.imageurl) : undefined,
      price: parsePrice(it.price),
      saleprice: parsePrice(it.saleprice),
      sku: it.sku ? String(it.sku) : undefined,
      description: it.description?.short ? String(it.description.short) : undefined,
      category: it.category?.primary ? String(it.category.primary) : undefined,
    }));
  } catch (err: any) {
    const status = err?.response?.status;
    const body = err?.response?.data;
    logger.error(`[Rakuten] Product Search falhou (HTTP ${status}):`, body ? String(body).slice(0, 200) : err?.message);
    return [];
  }
}
