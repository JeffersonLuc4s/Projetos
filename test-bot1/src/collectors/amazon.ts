import { RawProduct, isAnimeProduct, detectCategory, BOOK_AUTHOR_KEYWORDS } from "./types";
import { logger } from "../utils/logger";

const { ApiClient, DefaultApi, SearchItemsRequestContent } = require("@amzn/creatorsapi-nodejs-sdk");

const AMAZON_KEYWORDS = [
  "Haikyu!!",
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
  "Golden Kamuy",
  "Platinum End",
  "Bakuman",
  "Fullmetal Alchemist",
  "Slam Dunk",
  "Vagabond",
  "My Hero Academia",
  "Tokyo Revengers",
  "Edens Zero",
  "Shaman King",
  "Made in Abyss",
  "Frieren",
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
  "Sakamoto Days",
  "Pluto",
  "Hellsing",
  "Dandadan",
  "Overlord",
  "Fire Punch",
  "Hajime no Ippo",
  "Wind Breaker",
  "Look Back",
  "Pokémon",
  "One-Punch Man",
  "Record of Ragnarok",
  "Dororo",
  "Mushoku Tensei",
  "Cavaleiros do Zodíaco",
  "Alice in Borderland",
  "Parasyte",
  "Ao Ashi",
  "Kagurabachi",
  "Uzumaki",
  "Tomie",
  "Junji Ito",
  "Oshi no Ko",
  "Kaguya-sama",
  "Kaiju N.° 8",
  "Konosuba",
  "Sword Art Online",
  "Toradora",
  "No Game No Life",
  "Re:Zero",
  "Nana",
  "Orange",
  "Your Name",
  "Sailor Moon",
  "Inuyasha",
  "Skip & Loafer",
  "Cardcaptor Sakura",
  "Fruits Basket",
  "Madoka Magica",
];

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
  };
}

async function searchKeyword(api: any, partnerTag: string, keyword: string): Promise<any[]> {
  const req = new SearchItemsRequestContent();
  req.partnerTag = partnerTag;
  req.keywords = keyword;
  req.searchIndex = "Books";
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
    const msg = err?.message ?? String(err);
    logger.warn(`[Amazon API] "${keyword}" → erro ${status ?? ""}: ${msg.slice(0, 120)}`);
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
    { keywords: AMAZON_KEYWORDS, filter: isAnimeProduct as ((name: string) => boolean) | null, defaultCategory: undefined as string | undefined, validateAuthor: false },
    { keywords: BOOK_AUTHOR_KEYWORDS, filter: null, defaultCategory: "livro" as string | undefined, validateAuthor: true },
  ];

  for (const { keywords, filter, defaultCategory, validateAuthor } of searchConfigs) {
    for (const query of keywords) {
      const items = await searchKeyword(api, tag, query);

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
