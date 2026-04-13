/**
 * Gerencia links de afiliado e encurtamento de URLs.
 */

import axios from "axios";
import { logger } from "../utils/logger";

// =====================================================================
// AMAZON AFFILIATE
// =====================================================================

export function addAmazonTag(url: string, tag?: string): string {
  const affiliateTag = tag ?? process.env.AMAZON_AFFILIATE_TAG ?? "";
  if (!affiliateTag) return url;

  try {
    const parsed = new URL(url);
    parsed.searchParams.set("tag", affiliateTag);
    // Remove parâmetros de tracking desnecessários
    parsed.searchParams.delete("ref");
    parsed.searchParams.delete("pf_rd_r");
    parsed.searchParams.delete("pf_rd_p");
    return parsed.toString();
  } catch {
    return `${url}${url.includes("?") ? "&" : "?"}tag=${affiliateTag}`;
  }
}

// =====================================================================
// MERCADO LIVRE AFFILIATE
// =====================================================================

export function addMLAffiliateId(url: string, affiliateId?: string): string {
  const id = affiliateId ?? process.env.MERCADOLIVRE_AFFILIATE_ID ?? "";
  if (!id) return url;

  try {
    const parsed = new URL(url);
    parsed.searchParams.set("matt_tool", id);
    return parsed.toString();
  } catch {
    return `${url}${url.includes("?") ? "&" : "?"}matt_tool=${id}`;
  }
}

// =====================================================================
// LINK SHORTENER (bit.ly)
// =====================================================================

const shortUrlCache = new Map<string, string>();

export async function shortenUrl(url: string): Promise<string> {
  const token = process.env.BITLY_TOKEN;
  if (!token) return url;

  if (shortUrlCache.has(url)) return shortUrlCache.get(url)!;

  try {
    const res = await axios.post(
      "https://api-ssl.bitly.com/v4/shorten",
      { long_url: url },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 5000,
      }
    );

    const short = res.data.link as string;
    shortUrlCache.set(url, short);
    return short;
  } catch (err) {
    logger.warn("[LinkManager] Erro ao encurtar URL, usando original:", err);
    return url;
  }
}

// =====================================================================
// HELPER PRINCIPAL
// =====================================================================

export async function buildAffiliateLink(
  productUrl: string,
  source: "amazon" | "mercadolivre"
): Promise<{ affUrl: string; shortUrl: string }> {
  let affUrl: string;

  if (source === "amazon") {
    affUrl = addAmazonTag(productUrl);
  } else {
    affUrl = addMLAffiliateId(productUrl);
  }

  const shortUrl = await shortenUrl(affUrl);

  return { affUrl, shortUrl };
}
