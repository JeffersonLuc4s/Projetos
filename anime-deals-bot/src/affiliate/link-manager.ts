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

const AMAZON_SHORT_DOMAINS = /^https?:\/\/(amzn\.to|a\.co)\//i;

const SHORTEN_TIMEOUT_MS = 10000;
const SHORTEN_MIN_GAP_MS = 600;
const SHORTEN_MAX_ATTEMPTS = 2;
const SHORTEN_RETRY_DELAY_MS = 1500;

let lastShortenAt = 0;

async function throttleShorten(): Promise<void> {
  const elapsed = Date.now() - lastShortenAt;
  if (elapsed < SHORTEN_MIN_GAP_MS) {
    await new Promise((r) => setTimeout(r, SHORTEN_MIN_GAP_MS - elapsed));
  }
  lastShortenAt = Date.now();
}

export async function shortenUrl(url: string): Promise<string> {
  if (AMAZON_SHORT_DOMAINS.test(url)) return url;
  if (shortUrlCache.has(url)) return shortUrlCache.get(url)!;

  for (let attempt = 1; attempt <= SHORTEN_MAX_ATTEMPTS; attempt++) {
    await throttleShorten();
    try {
      const res = await axios.get("https://is.gd/create.php", {
        params: { format: "json", url },
        timeout: SHORTEN_TIMEOUT_MS,
      });
      const short = res.data.shorturl as string;
      if (short) {
        shortUrlCache.set(url, short);
        return short;
      }
    } catch (err: any) {
      const reason = err?.code ?? err?.message ?? String(err);
      if (attempt < SHORTEN_MAX_ATTEMPTS) {
        logger.debug(`[LinkManager] is.gd falhou (${reason}), tentativa ${attempt}/${SHORTEN_MAX_ATTEMPTS}`);
        await new Promise((r) => setTimeout(r, SHORTEN_RETRY_DELAY_MS));
        continue;
      }
      logger.warn(`[LinkManager] is.gd falhou após ${SHORTEN_MAX_ATTEMPTS} tentativas (${reason}), usando URL original`);
    }
  }
  return url;
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
