/**
 * Gerencia links de afiliado via Rakuten Advertising + encurtador is.gd.
 */

import axios from "axios";
import { buildRakutenDeepLink, getAdvertiserId } from "../collectors/rakuten";
import { logger } from "../utils/logger";

const shortUrlCache = new Map<string, string>();

export async function shortenUrl(url: string): Promise<string> {
  if (shortUrlCache.has(url)) return shortUrlCache.get(url)!;

  try {
    const res = await axios.get("https://is.gd/create.php", {
      params: { format: "json", url },
      timeout: 5000,
    });
    const short = res.data.shorturl as string;
    shortUrlCache.set(url, short);
    return short;
  } catch (err) {
    logger.warn("[LinkManager] Erro ao encurtar URL, usando original:", err);
    return url;
  }
}

export async function buildAffiliateLink(
  productUrl: string,
  source: "belezanaweb" | "ocean"
): Promise<{ affUrl: string; shortUrl: string }> {
  // Se já for um link de afiliado do Rakuten (vindo da Product Search API),
  // só encurta. Caso contrário, envelopa num deeplink.
  const isAlreadyAffiliate = /linksynergy\.com\/link/i.test(productUrl);
  let affUrl = productUrl;

  if (!isAlreadyAffiliate) {
    const advertiserId = getAdvertiserId(source);
    if (advertiserId) affUrl = buildRakutenDeepLink(productUrl, advertiserId);
  }

  const shortUrl = await shortenUrl(affUrl);
  return { affUrl, shortUrl };
}
