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
  "Haikyu!!",
  "Haikyu!",
  "Naruto Gold",
  "Naruto",
  "Boruto",
  "One Piece",
  "Demon Slayer",
  "Chainsaw Man",
  "Spy x Family",
  "Beastars",
  "Atelier of Witch Hat",
  "Soul Eater",
  "Neon Genesis Evangelion",
  "Fairy Tail",
  "Bleach",
  "Noragami",
  "Tokyo Ghoul",
  "Tokyo Ghoul: re",
  "Ataque dos Titãs",
  "Dr. Stone",
  "Food Wars",
  "The Promised Neverland",
  "Fire Force",
  "Moriarty: o Patriota",
  "Seraph of the End",
  "Akira",
  "Battle Angel Alita",
  "Death Note",
  "Hunter X Hunter",
  "Yu Yu Hakusho",
  "20th Century Boys",
  "Mob Psycho 100",
  "Bungo Stray Dogs",
  "Caçando Dragões",
  "Golden Kamuy",
  "Platinum End",
  "Bakuman",
  "Fullmetal Alchemist",
  "Monster Kanzenban",
  "Crimes Perfeitos",
  "Slam Dunk",
  "Vagabond",
  "Nausicaä do Vale do Vento",
  "My Hero Academia",
  "Tokyo Revengers",
  "Edens Zero",
  "Shaman King",
  "The Beginning After the End",
  "Uma Vida Imortal",
  "Made in Abyss",
  "Frieren e a Jornada para o Além",
  "Blue Period",
  "Vinland Saga",
  "Black Clover",
  "Jujutsu Kaisen",
  "Black Butler",
  "Jojo's Bizarre Adventure",
  "Dragon Ball",
  "Blue Lock",
  "Solo Leveling",
  "Boa Noite Punpun",
  "Blue Exorcist",
  "Berserk",
  "The Seven Deadly Sins",
  "Gash Bell!!",
  "Sakamoto Days",
  "Hanako-kun e os Mistérios do Colégio Kamome",
  "Sense Life",
  "Pluto",
  "Hellsing",
  "Dandadan",
  "Overlord",
  "Fire Punch",
  "Hajime no Ippo",
  "Wind Breaker",
  "Look Back",
  "A Menina do Outro Lado",
  "Pokémon",
  "Sayonara Eri",
  "Tower Dungeon",
  "That Time I Got Reincarnated as a Slime",
  "Gachiakuta",
  "Dead Dead Demons Dededede Destruction",
  "One-Punch Man",
  "Record of Ragnarok",
  "Asadora!",
  "Ashita no Joe",
  "Boys Run the Riot",
  "Mangaká da Favela",
  "Disney Twisted-Wonderland",
  "Manga Theater",
  "Dororo",
  "Mushoku Tensei",
  "Cavaleiros do Zodíaco",
  "Katana Beast",
  "Alice in Borderland",
  "Nekogahara",
  "The Ghost in the Shell",
  "Uq Holder!",
  "Dragon Quest",
  "Yomi no Tsugai",
  "Blue Box",
  "O 11º Tripulante",
  "Akane Banashi",
  "Tenkaichi",
  "Astro Boy",
  "Parasyte",
  "My Home Hero",
  "Ao Ashi",
  "I Sold My Life for Ten Thousand Yen Per Year",
  "Não Chame de MISTÉRIO",
  "Final Fantasy Lost Stranger",
  "A Heroica Lenda de Arslan",
  "Kamen Rider Kuuga",
  "Show-ha Shoten!",
  "Silver Spoon",
  "Museum O Assassino Ri na Chuva",
  "BECK Volume",
  "Kagurabachi",
  "Billy Bat",
  "Rooster Fighter",
  "Ruri Dragon",
  "Baoh",
  "Planetes Volume",
  "Mao Vol.",
  "Blade Vol.",
  "Fênix Vol.",
  "Mushishi",
  "As Flores do Mal",
  "Terra das Gemas",
  "Re:Zero",
  "Hellbound: Profecia do Inferno",
  "Kaikisen: Retorno ao Mar",
  "A Magia de um Retornado tem de ser Especial",
  "Crônicas das Guerras de Lodoss",
  "Suiiki: Território das Águas",
  "Kimba: O Leão Branco",
  "A Música de Marie",
  "Zero no Tsukaima",
  "Kamen Rider",
  "The King of Fighters",
  "Corpse Party: Another Child",
  "Patrulha Estelar Yamato",
  "O Horizonte Volume",
  "GTO Volume",
  "Rei de Lata Volume",
  "Hetalia Axis Power",
  "Devil Ecstasy",
  "Divina Comédia Go Nagai",
  "A Magia Continua",
  "Sanctuary Vol.",
  "Versus Vol.",
  "Pesadelos Completos",
  "Fragmentos do Horror",
  "Shigahime",
  "DeathDisco",
  "A Feiticeira da Tempestade",
  "Engolidos pela Terra",
  "Contos de Horror da Mimi",
  "Almanaque das Estações",
  "Chushingura: O Tesouro dos 47 Ronins",
  "Kogarashi Monjirou: O Prenúncio do Inverno",
  "Mandala de Fogo",
  "O Vampiro que Ri",
  "A Princesa do Castelo Sem Fim",
  "Mil Olhos de uma Terra em Fúria",
  "Confins de um Sonho",
  "Tomie Vol.",
  "FIRE! Vol.",
  "Shigurui: Frenesi da Morte",
  "O Preço da Desonra: Kubidai Hikiukenin",
  "O Novo Preço da Desonra",
  "Vampiros Volume",
  "Fóssil dos Sonhos",
  "O Estranho Conto da Ilha Panorama",
  "Hotel Harbour-View: Tokyo Killers",
  "Dismorfos: Seleção de Contos Favoritos do Autor",
  "A Valise do Professor",
  "Mais Forte que a Espada",
  "PTSD Radio: Frequências do Terror",
  "O Diário do Meu Pai",
  "MW: Psicopatia Profana",
  "Borboleta Assassina",
  "O Beco",
  "Battle Royale Omnibus",
  "As Egocêntricas Maldições de Souichi",
  "O Encanamento que Geme",
  "A Lanterna de Nix Vol.",
  "A Lanterna de Nix Volume",
  "Spectreman",
  "Miyamoto Musashi Biografia em Mangá",
  "Sensor Mangá",
  "Hokusai Biografia em Mangá",
  "O Último Voo das Borboletas",
  "Rohan no Louvre",
  "Zona Fantasma",
  "Black Paradox",
  "Vênus Invisível",
  "Contos Esmagadores",
  "Recado a Adolf",
  "Guardiões do Louvre",
  "A Sala de Aula que Derreteu",
  "Um Bairro Distante",
  "Mortos de Amor",
  "Frankenstein e Outras Histórias de Horror",
  "Solanin",
  "Morada do Desertor",
  "Cidade das Lápides",
  "Satsuma Gishiden: Crônicas Dos Leais Guerreiros De Satsuma",
  "A Lenda de Musashi",
  "As Esculturas sem Cabeça",
  "Omori Volume",
  "O Ladrão de Mundos",
  "Os Dias Comuns de Yano-Kun",
  "Dig It Volume",
  "Dicas de Férias de um Nobre Gentil",
  "Gannibal: Vila de Canibais",
  "A Cidade da Calmaria e a Terra das Cerejeiras",
  "Uzumaki",
  "Buracos da Estranheza",
  "Gyo",
  "Angustia Junji Ito",
  "Olhares Junji Ito",
  "Calafrios: Seleção de Contos Favoritos do Autor",
  "Planeta Demoníaco Remina",
  "Declínio de um Homem",
  "Diario dos Gatos Yon & Mu",
  "Ayako",
  "O Homem que Passeia",
  "Zoo no Inverno",
  "O Gourmet Solitário",
  "Dano Cerebral Volume",
  "Metrópolis Osamu Tezuka",
  "A Grande Invasão Mongol",
  "Na Prisão Volume",
  "Nas Montanhas do Terror",
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
  const searches = AMAZON_KEYWORDS;

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
  const tag =
    process.env.AMAZON_AFFILIATE_TAG ??
    process.env.AMAZON_PARTNER_TAG ??
    "";

  logger.info("[Amazon] Usando scraping direto.");
  return collectViaScraping(tag);
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
