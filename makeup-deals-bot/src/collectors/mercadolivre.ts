/**
 * Coletor do Mercado Livre para maquiagem/beleza.
 *
 * Estratégia:
 * 1. OAuth client_credentials (se ML_APP_ID + ML_APP_SECRET configurados) — API
 * 2. Scraping do site público com Playwright como fallback
 *
 * Links de afiliado: appenda ?matt_tool=<MERCADOLIVRE_AFFILIATE_ID>
 */

import axios from "axios";
import { RawProduct, isMakeupProduct, detectCategory } from "./types";
import { BRANDS } from "./brands";
import { logger } from "../utils/logger";

const ML_API = "https://api.mercadolibre.com";

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

function appendAffiliate(url: string): string {
  const id = process.env.MERCADOLIVRE_AFFILIATE_ID;
  if (!id) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}matt_tool=${id}`;
}

async function searchViaAPI(query: string, token: string, limit = 30): Promise<RawProduct[]> {
  const res = await axios.get(`${ML_API}/sites/MLB/search`, {
    params: {
      q: query,
      limit,
      condition: "new",
      sort: "relevance",
      category: "MLB1246", // Beleza & Cuidado Pessoal
    },
    headers: { Authorization: `Bearer ${token}` },
    timeout: 10000,
  });

  const items = res.data.results ?? [];
  const products: RawProduct[] = [];

  for (const item of items) {
    if (!isMakeupProduct(item.title)) continue;

    const original = item.original_price ?? 0;
    const current = item.price ?? 0;
    const discount_pct = original && original > current
      ? Math.round(((original - current) / original) * 100)
      : 0;

    if (current <= 0) continue;

    products.push({
      source: "mercadolivre",
      source_id: item.id,
      name: item.title,
      current_price: current,
      original_price: original > 0 ? original : undefined,
      discount_pct,
      rating: 0,
      reviews: 0,
      image_url: item.thumbnail?.replace("I.jpg", "O.jpg"),
      product_url: appendAffiliate(item.permalink),
      category: detectCategory(item.title),
    });
  }

  return products;
}

function parseBRPrice(text: string): number {
  const match = text.match(/R\$\s*([\d.]+),([\d]{2})/);
  if (!match) {
    const intOnly = text.match(/R\$\s*([\d.]+)/);
    if (!intOnly) return 0;
    return parseFloat(intOnly[1].replace(/\./g, ""));
  }
  return parseFloat(`${match[1].replace(/\./g, "")}.${match[2]}`);
}

async function searchViaScraping(
  browser: any,
  query: string,
  onBatch?: (products: RawProduct[]) => Promise<void>,
): Promise<RawProduct[]> {
  const products: RawProduct[] = [];

  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "pt-BR",
  });

  try {
    const page = await context.newPage();
    const url = `https://lista.mercadolivre.com.br/beleza-cuidado-pessoal/${encodeURIComponent(query)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(2000);

    const items = await page.$$eval(".ui-search-layout__item", (els: any[]) =>
      els.slice(0, 15).map((el: any) => {
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

        return {
          title,
          currentPriceText,
          originalPriceText,
          discountPctDirect,
          image: imgEl?.src ?? "",
          mlbId,
          productUrl,
        };
      })
    );

    const batch: RawProduct[] = [];
    for (const item of items) {
      if (!item.mlbId || !item.currentPriceText) continue;
      if (!isMakeupProduct(item.title)) continue;

      const currentPrice = parseBRPrice(item.currentPriceText);
      const originalPrice = item.originalPriceText ? parseBRPrice(item.originalPriceText) : undefined;
      if (!currentPrice) continue;

      const discount_pct = originalPrice && originalPrice > currentPrice
        ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
        : (item.discountPctDirect ?? 0);

      const product: RawProduct = {
        source: "mercadolivre",
        source_id: item.mlbId,
        name: item.title,
        current_price: currentPrice,
        original_price: originalPrice,
        discount_pct,
        rating: 0,
        reviews: 0,
        image_url: item.image,
        product_url: appendAffiliate(item.productUrl),
        category: detectCategory(item.title),
      };

      products.push(product);
      batch.push(product);
    }

    if (onBatch && batch.length > 0) await onBatch(batch);
  } catch (err) {
    logger.error(`[ML Scraping] Erro na busca "${query}":`, err);
  } finally {
    await context.close();
  }

  return products;
}

export async function collectFromMercadoLivre(
  onBatch?: (products: RawProduct[]) => Promise<void>
): Promise<RawProduct[]> {
  if (!process.env.MERCADOLIVRE_AFFILIATE_ID) {
    logger.info("[ML] Desabilitado (MERCADOLIVRE_AFFILIATE_ID não configurado).");
    return [];
  }

  const token = await getAccessToken();
  const all: RawProduct[] = [];
  const seen = new Set<string>();

  if (token) {
    logger.info("[ML] Usando API autenticada (OAuth).");
    for (const brand of BRANDS) {
      try {
        const products = await searchViaAPI(brand, token);
        const onSale = products.filter(p => p.discount_pct > 0);
        for (const p of onSale) {
          if (!seen.has(p.source_id)) { seen.add(p.source_id); all.push(p); }
        }
        logger.info(`[ML] "${brand}": ${products.length} resultados, ${onSale.length} em promo`);
        if (onBatch && onSale.length > 0) await onBatch(onSale);
        await sleep(600);
      } catch (err) {
        logger.error(`[ML] Erro na marca "${brand}":`, err);
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
      return all;
    }

    let browser: any;
    try {
      browser = await chromium.launch({ headless: true });
    } catch {
      logger.warn("[ML Scraping] Browser não disponível.");
      return all;
    }

    try {
      for (const brand of BRANDS) {
        try {
          const products = await searchViaScraping(browser, brand, async (batch) => {
            const onSale = batch.filter(p => p.discount_pct > 0 && !seen.has(p.source_id));
            for (const p of onSale) seen.add(p.source_id);
            if (onBatch && onSale.length > 0) await onBatch(onSale);
          });
          const onSale = products.filter(p => p.discount_pct > 0);
          logger.info(`[ML Scraping] "${brand}": ${products.length} resultados, ${onSale.length} em promo`);
          for (const p of onSale) {
            if (!all.find(x => x.source_id === p.source_id)) all.push(p);
          }
          await sleep(3000);
        } catch (err) {
          logger.error(`[ML Scraping] Erro na marca "${brand}":`, err);
        }
      }
    } finally {
      await browser.close();
    }
  }

  logger.info(`[ML] Total: ${all.length} produtos em promo.`);
  return all;
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}