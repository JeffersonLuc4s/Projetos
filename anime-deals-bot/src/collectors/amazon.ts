/**
 * Coletor da Amazon.
 *
 * Estratégia dupla:
 * 1. Amazon Product Advertising API v5 (PAAPI) se credenciais configuradas
 * 2. Scraping leve com Playwright como fallback
 *
 * PAAPI requer aprovação prévia em:
 * https://affiliate-program.amazon.com.br/
 */

import axios from "axios";
import crypto from "crypto";
import { RawProduct, isAnimeProduct, detectCategory } from "./types";
import { logger } from "../utils/logger";

// =====================================================================
// AMAZON PAAPI v5
// =====================================================================

function signedHeaders(
  accessKey: string,
  secretKey: string,
  partnerTag: string,
  payload: object,
  region: string
) {
  const endpoint = `webservices.amazon.com.br`;
  const path = `/paapi5/searchitems`;
  const host = endpoint;
  const datetime = new Date().toISOString().replace(/[:-]/g, "").replace(/\.\d{3}/, "");
  const date = datetime.slice(0, 8);

  const bodyStr = JSON.stringify(payload);
  const bodyHash = crypto.createHash("sha256").update(bodyStr).digest("hex");

  const canonicalHeaders = `content-encoding:amz-1.0\ncontent-type:application/json; charset=utf-8\nhost:${host}\nx-amz-date:${datetime}\nx-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems\n`;
  const signedHeaderList = "content-encoding;content-type;host;x-amz-date;x-amz-target";

  const canonicalRequest = `POST\n${path}\n\n${canonicalHeaders}\n${signedHeaderList}\n${bodyHash}`;
  const credentialScope = `${date}/${region}/ProductAdvertisingAPI/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${datetime}\n${credentialScope}\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;

  const hmacKey = (key: string | Buffer, data: string) =>
    crypto.createHmac("sha256", key).update(data).digest();

  const signingKey = hmacKey(
    hmacKey(hmacKey(hmacKey(`AWS4${secretKey}`, date), region), "ProductAdvertisingAPI"),
    "aws4_request"
  );
  const signature = hmacKey(signingKey, stringToSign).toString("hex");

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaderList}, Signature=${signature}`;

  return {
    "Content-Encoding": "amz-1.0",
    "Content-Type": "application/json; charset=utf-8",
    Host: host,
    "X-Amz-Date": datetime,
    "X-Amz-Target": "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
    Authorization: authHeader,
  };
}

const AMAZON_KEYWORDS = [
  "mangá naruto",
  "figure anime",
  "funko pop anime",
  "one piece figure",
  "dragon ball z figure",
  "demon slayer manga",
  "jujutsu kaisen figure",
  "nendoroid anime",
  "banpresto anime",
  "box colecionador manga",
];

async function collectViaAPI(accessKey: string, secretKey: string, partnerTag: string, region: string): Promise<RawProduct[]> {
  const products: RawProduct[] = [];

  for (const keyword of AMAZON_KEYWORDS) {
    const payload = {
      PartnerTag: partnerTag,
      PartnerType: "Associates",
      Marketplace: "www.amazon.com.br",
      Keywords: keyword,
      SearchIndex: "All",
      Resources: [
        "Images.Primary.Large",
        "ItemInfo.Title",
        "Offers.Listings.Price",
        "Offers.Listings.SavingBasis",
        "Offers.Listings.DeliveryInfo.IsPrimeEligible",
        "CustomerReviews.Count",
        "CustomerReviews.StarRating",
        "ItemInfo.ByLineInfo",
      ],
      ItemCount: 10,
    };

    const headers = signedHeaders(accessKey, secretKey, partnerTag, payload, region);

    try {
      const res = await axios.post(
        `https://webservices.amazon.com.br/paapi5/searchitems`,
        payload,
        { headers, timeout: 10000 }
      );

      const items = res.data?.SearchResult?.Items ?? [];
      for (const item of items) {
        const name = item.ItemInfo?.Title?.DisplayValue ?? "";
        if (!isAnimeProduct(name)) continue;

        const listing = item.Offers?.Listings?.[0];
        const currentPrice = listing?.Price?.Amount ?? 0;
        const originalPrice = listing?.SavingBasis?.Amount ?? undefined;
        const discountPct = originalPrice
          ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
          : 0;

        const rating = item.CustomerReviews?.StarRating?.Value ?? 0;
        const reviews = item.CustomerReviews?.Count ?? 0;
        const image = item.Images?.Primary?.Large?.URL ?? undefined;
        const url = item.DetailPageURL ?? "";

        // Adiciona tag de afiliado (PAAPI já insere automaticamente via PartnerTag)
        products.push({
          source: "amazon",
          source_id: item.ASIN,
          name,
          current_price: currentPrice,
          original_price: originalPrice,
          discount_pct: discountPct,
          rating,
          reviews,
          image_url: image,
          product_url: url,
          category: detectCategory(name),
        });
      }
    } catch (err) {
      logger.error(`[Amazon PAAPI] Erro na query "${keyword}":`, err);
    }

    await sleep(1100); // PAAPI: 1 req/s
  }

  return products;
}

// =====================================================================
// SCRAPING LEVE (fallback via Playwright)
// =====================================================================

async function collectViaScraping(tag: string): Promise<RawProduct[]> {
  // Importação lazy para não travar se Playwright não estiver instalado
  let chromium: any;
  try {
    const pw = await import("playwright");
    chromium = pw.chromium;
  } catch {
    logger.warn("[Amazon Scraping] Playwright não disponível. Pulando.");
    return [];
  }

  const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
  ];

  const products: RawProduct[] = [];
  const searches = ["manga anime oferta", "figure anime promoção", "funko pop anime desconto"];

  let browser: any;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    logger.warn("[Amazon Scraping] Browser não instalado. Rode: npx playwright install chromium");
    return [];
  }

  for (const query of searches) {
    const context = await browser.newContext({
      userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
      locale: "pt-BR",
      viewport: { width: 1280, height: 800 },
    });

    try {
      const page = await context.newPage();
      const url = `https://www.amazon.com.br/s?k=${encodeURIComponent(query)}&s=price-asc-rank`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(2000 + Math.random() * 2000);

      const items = await page.$$eval('[data-component-type="s-search-result"]', (els) =>
        els.slice(0, 10).map((el) => {
          const name = el.querySelector("h2 span")?.textContent?.trim() ?? "";
          const priceWhole = el.querySelector(".a-price-whole")?.textContent?.replace(/[.,]/g, "").trim() ?? "0";
          const priceFrac = el.querySelector(".a-price-fraction")?.textContent?.trim() ?? "00";
          const currentPrice = parseFloat(`${priceWhole}.${priceFrac}`);

          const originalPriceText = el.querySelector(".a-text-price .a-offscreen")?.textContent
            ?.replace("R$", "").replace(/[.,]/g, "").trim() ?? "0";
          const originalPrice = parseFloat(originalPriceText) / 100 || undefined;

          const ratingText = el.querySelector(".a-icon-alt")?.textContent?.split(" ")?.[0] ?? "0";
          const rating = parseFloat(ratingText.replace(",", ".")) || 0;

          const reviewsText = el.querySelector('[aria-label*="stars"] ~ span, .a-size-small .a-color-secondary')?.textContent?.replace(/\D/g, "") ?? "0";
          const reviews = parseInt(reviewsText, 10) || 0;

          const asin = el.getAttribute("data-asin") ?? "";
          const image = (el.querySelector(".s-image") as HTMLImageElement)?.src ?? "";
          const productUrl = `https://www.amazon.com.br/dp/${asin}`;

          // Detecção de cupom (ex: "Economize R$20" ou "cupom de 10%")
          const couponText = el.querySelector(".s-coupon-unclipped, [id*='coupon'], .a-color-success")?.textContent?.trim() ?? "";
          let couponValue: number | undefined;
          let couponType: "fixed" | "percent" | undefined;
          if (couponText) {
            const fixedMatch = couponText.match(/R\$\s*([\d]+(?:[,.]\d{1,2})?)/i);
            const pctMatch = couponText.match(/(\d+)\s*%/i);
            if (fixedMatch) {
              couponValue = parseFloat(fixedMatch[1].replace(",", "."));
              couponType = "fixed";
            } else if (pctMatch) {
              couponValue = parseInt(pctMatch[1], 10);
              couponType = "percent";
            }
          }

          return { name, currentPrice, originalPrice, rating, reviews, asin, image, productUrl, couponValue, couponType };
        })
      );

      for (const item of items) {
        if (!item.asin || !isAnimeProduct(item.name)) continue;
        const discountPct = item.originalPrice
          ? Math.round(((item.originalPrice - item.currentPrice) / item.originalPrice) * 100)
          : 0;

        let finalPrice: number | undefined;
        if (item.couponValue && item.couponType) {
          finalPrice = item.couponType === "fixed"
            ? Math.round((item.currentPrice - item.couponValue) * 100) / 100
            : Math.round((item.currentPrice * (1 - item.couponValue / 100)) * 100) / 100;
        }

        products.push({
          source: "amazon",
          source_id: item.asin,
          name: item.name,
          current_price: item.currentPrice,
          original_price: item.originalPrice,
          discount_pct: discountPct,
          rating: item.rating,
          reviews: item.reviews,
          image_url: item.image,
          product_url: `${item.productUrl}?tag=${tag}`,
          category: detectCategory(item.name),
          coupon_value: item.couponValue,
          coupon_type: item.couponType,
          final_price: finalPrice,
        });
      }
    } catch (err) {
      logger.error(`[Amazon Scraping] Erro na busca "${query}":`, err);
    } finally {
      await context.close();
    }

    await sleep(3000 + Math.random() * 3000);
  }

  await browser.close();
  return products;
}

// =====================================================================
// AMAZON CREATORS API (OAuth 2.0)
// =====================================================================

let creatorTokenCache: { token: string; expiresAt: number } | null = null;

async function getCreatorsToken(): Promise<string | null> {
  const clientId = process.env.AMAZON_CLIENT_ID;
  const clientSecret = process.env.AMAZON_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (creatorTokenCache && Date.now() < creatorTokenCache.expiresAt) {
    return creatorTokenCache.token;
  }

  try {
    const res = await axios.post(
      "https://api.amazon.com/auth/o2/token",
      {
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "creatorsapi::default",
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      }
    );
    const token = res.data.access_token as string;
    const expiresIn = ((res.data.expires_in as number) || 3600) * 1000;
    creatorTokenCache = { token, expiresAt: Date.now() + expiresIn - 60_000 };
    logger.info(`[Amazon] Token Creators API obtido com sucesso.`);
    return token;
  } catch (err: any) {
    const errData = err?.response?.data;
    logger.warn(`[Amazon] Creators API token falhou: ${JSON.stringify(errData) ?? err?.message}. Usando scraping.`);
    return null;
  }
}

async function collectViaCreatorsAPI(token: string, tag: string): Promise<RawProduct[]> {
  const products: RawProduct[] = [];

  const keywords = [
    "mangá naruto", "figure anime", "funko pop anime",
    "dragon ball figure", "one piece figure", "demon slayer manga",
    "jujutsu kaisen figure", "my hero academia figure",
  ];

  for (const keyword of keywords) {
    try {
      const payload = {
        partnerTag: tag,
        partnerType: "Associates",
        keywords: keyword,
        searchIndex: "All",
        resources: [
          "images.primary.large",
          "itemInfo.title",
          "offersV2.listings.price",
          "offersV2.listings.dealDetails",
          "customerReviews.count",
          "customerReviews.starRating",
        ],
        itemCount: 10,
      };

      const res = await axios.post(
        "https://creatorsapi.amazon/catalog/v1/searchItems",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "x-marketplace": "www.amazon.com.br",
          },
          timeout: 10000,
        }
      );

      // Resposta no formato Creators API v3: itemsResult.items[]
      const items = res.data?.itemsResult?.items ?? [];
      for (const item of items) {
        const name = item.itemInfo?.title?.displayValue ?? "";
        if (!isAnimeProduct(name)) continue;

        const listing = item.offersV2?.listings?.[0];
        const currentPrice = listing?.price?.amount ?? 0;
        const originalPrice = listing?.dealDetails?.originalPrice?.amount ?? undefined;
        const discountPct = originalPrice && originalPrice > currentPrice
          ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
          : 0;

        products.push({
          source: "amazon",
          source_id: item.asin ?? "",
          name,
          current_price: currentPrice,
          original_price: originalPrice,
          discount_pct: discountPct,
          rating: item.customerReviews?.starRating?.value ?? 0,
          reviews: item.customerReviews?.count ?? 0,
          image_url: item.images?.primary?.large?.url ?? undefined,
          // detailPageURL já vem com a tag de afiliado embutida
          product_url: item.detailPageURL ?? `https://www.amazon.com.br/dp/${item.asin}?tag=${tag}`,
          category: detectCategory(name),
        });
      }
    } catch (err: any) {
      logger.error(`[Amazon Creators API] Erro "${keyword}": ${JSON.stringify(err?.response?.data) ?? err?.message}`);
    }
    await sleep(1000);
  }

  logger.info(`[Amazon Creators API] ${products.length} produtos coletados.`);
  return products;
}

// =====================================================================
// ENTRY POINT
// =====================================================================

export async function collectFromAmazon(): Promise<RawProduct[]> {
  const tag = process.env.AMAZON_AFFILIATE_TAG ?? process.env.AMAZON_PARTNER_TAG ?? "";

  // 1. Tenta Creators API (OAuth)
  const creatorToken = await getCreatorsToken();
  if (creatorToken) {
    logger.info("[Amazon] Usando Creators API (OAuth).");
    const products = await collectViaCreatorsAPI(creatorToken, tag);
    if (products.length > 0) return products;
    logger.warn("[Amazon] Creators API retornou 0 produtos, tentando scraping.");
  }

  // 2. Tenta PA API v5 (legado)
  const accessKey = process.env.AMAZON_ACCESS_KEY;
  const secretKey = process.env.AMAZON_SECRET_KEY;
  const partnerTag = process.env.AMAZON_PARTNER_TAG ?? tag;
  const region = process.env.AMAZON_REGION ?? "us-east-1";

  if (accessKey && secretKey && partnerTag) {
    logger.info("[Amazon] Usando PAAPI v5.");
    return collectViaAPI(accessKey, secretKey, partnerTag, region);
  }

  // 3. Scraping como fallback
  logger.info("[Amazon] Usando scraping como fallback.");
  return collectViaScraping(tag);
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
