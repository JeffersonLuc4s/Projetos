/**
 * Coletor do Mercado Livre.
 *
 * Estratégia:
 * 1. OAuth client_credentials (se ML_APP_ID + ML_APP_SECRET configurados)
 * 2. Scraping do site público com Playwright como fallback
 */

import axios from "axios";
import { RawProduct, isAnimeProduct, isBookProduct, isFunkoProduct, detectCategory, BOOK_AUTHOR_KEYWORDS, FUNKO_KEYWORDS, AMAZON_KEYWORDS } from "./types";
import { logger } from "../utils/logger";

const ML_API = "https://api.mercadolibre.com";

const SEARCH_QUERIES = [
  "manga naruto", "manga one piece", "manga dragon ball",
  "figure anime", "funko pop anime", "nendoroid anime",
  "banpresto figure", "figure jujutsu kaisen",
  "figure demon slayer", "figure my hero academia",
  "box colecionador manga",
];

// =====================================================================
// OAuth Token (client_credentials)
// =====================================================================

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const appId = process.env.ML_APP_ID;
  const appSecret = process.env.ML_APP_SECRET;
  if (!appId || !appSecret) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  try {
    const res = await axios.post(
      `${ML_API}/oauth/token`,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: appId,
        client_secret: appSecret,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 10000 }
    );
    const token = res.data.access_token as string;
    const expiresIn = (res.data.expires_in as number) * 1000;
    cachedToken = { token, expiresAt: Date.now() + expiresIn - 60_000 };
    logger.info("[ML] Token OAuth obtido com sucesso.");
    return token;
  } catch (err) {
    logger.error("[ML] Erro ao obter token OAuth:", err);
    return null;
  }
}

// =====================================================================
// Busca via API autenticada
// =====================================================================

async function searchViaAPI(query: string, token: string, limit = 20): Promise<RawProduct[]> {
  const res = await axios.get(`${ML_API}/sites/MLB/search`, {
    params: { q: query, limit, condition: "new", sort: "relevance" },
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    timeout: 10000,
  });

  const items = res.data.results ?? [];
  const products: RawProduct[] = [];

  for (const item of items) {
    if (!isAnimeProduct(item.title)) continue;

    const discount_pct = item.original_price
      ? Math.round(((item.original_price - item.price) / item.original_price) * 100)
      : 0;

    const affiliateId = process.env.MERCADOLIVRE_AFFILIATE_ID ?? "";
    const productUrl = affiliateId
      ? `${item.permalink}?matt_tool=${affiliateId}`
      : item.permalink;

    products.push({
      source: "mercadolivre",
      source_id: item.id,
      name: item.title,
      current_price: item.price,
      original_price: item.original_price ?? undefined,
      discount_pct,
      rating: item.seller_info?.seller_reputation?.transactions?.ratings?.positive ?? 0,
      reviews: item.seller_info?.seller_reputation?.transactions?.completed ?? 0,
      image_url: item.thumbnail?.replace("I.jpg", "O.jpg"),
      product_url: productUrl,
      category: detectCategory(item.title),
    });
  }

  return products;
}

// =====================================================================
// Scraping via Playwright (fallback sem credenciais)
// =====================================================================

function parseBRPrice(text: string): number {
  // Formato BR: R$1.234,56 — pega o primeiro preço encontrado
  const match = text.match(/R\$\s*([\d.]+),([\d]{2})/);
  if (!match) {
    const intOnly = text.match(/R\$\s*([\d.]+)/);
    if (!intOnly) return 0;
    return parseFloat(intOnly[1].replace(/\./g, ""));
  }
  return parseFloat(`${match[1].replace(/\./g, "")}.${match[2]}`);
}

async function searchViaScraping(browser: any, query: string, onBatch?: (products: RawProduct[]) => Promise<void>, filterFn?: (name: string) => boolean, forcedCategory?: string): Promise<RawProduct[]> {
  const activeFilter = filterFn ?? isAnimeProduct;
  const products: RawProduct[] = [];

  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "pt-BR",
  });

  try {
    const page = await context.newPage();

    const url = forcedCategory === "livro"
      ? `https://lista.mercadolivre.com.br/livros-revistas-comics/${encodeURIComponent(query)}_FORMAT_Impresso`
      : `https://lista.mercadolivre.com.br/${encodeURIComponent(query)}_FORMAT_Impresso`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(2000);

    const items = await page.$$eval(".ui-search-layout__item", (els: any[]) =>
      els.slice(0, 10).map((el: any) => {
        const title = el.querySelector(".poly-component__title")?.textContent?.trim() ?? "";

        const currentFraction = el.querySelector(".poly-price__current .andes-money-amount__fraction")?.textContent?.trim() ?? "0";
        const currentCents = el.querySelector(".poly-price__current .andes-money-amount__cents")?.textContent?.trim() ?? "00";
        const currentPriceText = `R$${currentFraction},${currentCents}`;

        const origEl = el.querySelector("s.andes-money-amount--previous");
        let originalPriceText = "";
        if (origEl) {
          const origFraction = origEl.querySelector(".andes-money-amount__fraction")?.textContent?.trim() ?? "";
          const origCents = origEl.querySelector(".andes-money-amount__cents")?.textContent?.trim() ?? "";
          originalPriceText = origCents ? `R$${origFraction},${origCents}` : `R$${origFraction}`;
        }

        const discountRawText = el.querySelector("[class*='discount']")?.textContent?.trim() ?? "";
        const discountPctMatch = discountRawText.match(/(\d+)%/);
        const discountPctDirect = discountPctMatch ? parseInt(discountPctMatch[1], 10) : 0;

        const imgEl = el.querySelector("img.poly-component__picture") as any;
        const linkEl = el.querySelector("a.poly-component__title") as any;
        const href = linkEl?.href ?? "";

        const cleanHref = href.split("#")[0];
        let mlbId = "";
        let productUrl = "";

        const m1 = cleanHref.match(/\/p\/(MLB\d+)/);
        const m2 = cleanHref.match(/produto\.mercadolivre\.com\.br\/MLB-(\d+)-/);
        const m3 = href.match(/wid=(MLB\d+)/);

        if (m1) {
          mlbId = m1[1];
          productUrl = `https://www.mercadolivre.com.br/p/${mlbId}`;
        } else if (m2) {
          mlbId = `MLB${m2[1]}`;
          productUrl = cleanHref.split("?")[0];
        } else if (m3) {
          mlbId = m3[1];
          productUrl = `https://www.mercadolivre.com.br/p/${mlbId}`;
        }

        const ratingText = el.querySelector(".poly-reviews__rating, [class*='rating-number']")?.textContent?.trim() ?? "0";
        const reviewsText = el.querySelector(".poly-reviews__total, [class*='reviews__total']")?.textContent?.replace(/\D/g, "") ?? "0";

        return {
          title,
          currentPriceText,
          originalPriceText,
          discountPctDirect,
          image: imgEl?.src ?? "",
          mlbId,
          productUrl,
          rating: parseFloat(ratingText.replace(",", ".")) || 0,
          reviews: parseInt(reviewsText, 10) || 0,
        };
      })
    );

    const affiliateId = process.env.MERCADOLIVRE_AFFILIATE_ID ?? "";

    for (const item of items) {
      if (!item.mlbId || !item.currentPriceText || !activeFilter(item.title)) continue;

      const currentPrice = parseBRPrice(item.currentPriceText);
      const originalPrice = item.originalPriceText ? parseBRPrice(item.originalPriceText) : undefined;
      if (!currentPrice) continue;

      const discount_pct = originalPrice && originalPrice > currentPrice
        ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
        : (item.discountPctDirect ?? 0);

      const separator = item.productUrl.includes("?") ? "&" : "?";
      const productUrl = affiliateId ? `${item.productUrl}${separator}matt_tool=${affiliateId}` : item.productUrl;

      const product: RawProduct = {
        source: "mercadolivre",
        source_id: item.mlbId,
        name: item.title,
        current_price: currentPrice,
        original_price: originalPrice,
        discount_pct,
        rating: item.rating,
        reviews: item.reviews,
        image_url: item.image,
        product_url: productUrl,
        category: forcedCategory ?? detectCategory(item.title),
      };

      if (onBatch) {
        await onBatch([product]);
      } else {
        products.push(product);
      }
    }
  } catch (err) {
    logger.error(`[ML Scraping] Erro na busca "${query}":`, err);
  } finally {
    await context.close();
  }

  return products;
}

// =====================================================================
// Coletor principal
// =====================================================================

export async function collectFromMercadoLivre(onBatch?: (products: RawProduct[]) => Promise<void>): Promise<RawProduct[]> {
  const token = await getAccessToken();
  const allProducts: RawProduct[] = [];
  const seen = new Set<string>();

  if (token) {
    logger.info("[ML] Usando API autenticada (OAuth).");
    for (const query of SEARCH_QUERIES) {
      try {
        logger.info(`[ML] Buscando: "${query}"`);
        const products = await searchViaAPI(query, token);
        for (const p of products) {
          if (!seen.has(p.source_id)) { seen.add(p.source_id); allProducts.push(p); }
        }
        await sleep(600);
      } catch (err) {
        logger.error(`[ML] Erro na query "${query}":`, err);
      }
    }
  } else {
    logger.info("[ML] Sem credenciais OAuth. Usando scraping do site.");

    let chromium: any;
    try {
      const pw = await import("playwright");
      chromium = pw.chromium;
    } catch {
      logger.warn("[ML Scraping] Playwright não disponível.");
      return allProducts;
    }

    let browser: any;
    try {
      browser = await chromium.launch({ headless: true });
    } catch {
      logger.warn("[ML Scraping] Browser não disponível.");
      return allProducts;
    }

    // Anime/mangá (mesma lista usada na Amazon)
    for (const query of AMAZON_KEYWORDS) {
      try {
        logger.info(`[ML Scraping] Buscando anime/mangá: "${query}"`);
        const products = await searchViaScraping(browser, query, onBatch, isAnimeProduct);
        for (const p of products) {
          if (!seen.has(p.source_id)) { seen.add(p.source_id); allProducts.push(p); }
        }
        await sleep(3000);
      } catch (err) {
        logger.error(`[ML Scraping] Erro:`, err);
      }
    }

    // Funkos
    for (const query of FUNKO_KEYWORDS) {
      try {
        logger.info(`[ML Scraping] Buscando funko: "${query}"`);
        const products = await searchViaScraping(browser, query, onBatch, isFunkoProduct, "figure");
        for (const p of products) {
          if (!seen.has(p.source_id)) { seen.add(p.source_id); allProducts.push(p); }
        }
        await sleep(3000);
      } catch (err) {
        logger.error(`[ML Scraping] Erro:`, err);
      }
    }

    // Loop de autores de livros
    for (const query of BOOK_AUTHOR_KEYWORDS) {
      try {
        logger.info(`[ML Scraping] Buscando livro: "${query}"`);
        const products = await searchViaScraping(browser, query, onBatch, isBookProduct, "livro");
        for (const p of products) {
          if (!seen.has(p.source_id)) { seen.add(p.source_id); allProducts.push(p); }
        }
        await sleep(3000);
      } catch (err) {
        logger.error(`[ML Scraping] Erro:`, err);
      }
    }

    await browser.close();
  }

  logger.info(`[ML] Total coletado: ${allProducts.length} produtos`);
  return allProducts;
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
