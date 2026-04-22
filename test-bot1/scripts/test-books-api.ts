import "dotenv/config";
import { BOOK_AUTHOR_KEYWORDS } from "../src/collectors/types";

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

function reasonBlocked(item: any): string | null {
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
  const tokens = normalizeText(authorKeyword).split(/[\s.]+/).filter(t => t.length >= 3);
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

function contributorNames(item: any): string {
  const contributors: any[] = item?.itemInfo?.byLineInfo?.contributors ?? [];
  return contributors.map(c => `${c?.name ?? "?"}[${c?.role ?? c?.roleType ?? "?"}]`).join(", ") || "(nenhum)";
}

async function main() {
  if (!process.env.AMAZON_CLIENT_ID || !process.env.AMAZON_CLIENT_SECRET || !process.env.AMAZON_AFFILIATE_TAG) {
    console.error("AMAZON_CLIENT_ID/SECRET/AFFILIATE_TAG ausentes no .env");
    process.exit(1);
  }

  const apiClient = new ApiClient();
  apiClient.credentialId = process.env.AMAZON_CLIENT_ID;
  apiClient.credentialSecret = process.env.AMAZON_CLIENT_SECRET;
  apiClient.version = process.env.AMAZON_API_VERSION || "3.1";
  const api = new DefaultApi(apiClient);

  const tag = process.env.AMAZON_AFFILIATE_TAG!;
  let totalReturned = 0;
  let totalBlockedApi = 0;
  let totalBlockedAuthor = 0;
  let totalBlockedFilter = 0;
  let totalPassed = 0;
  const passedSamples: { author: string; name: string; contributors: string; price: number; discount: number; hardcover: boolean }[] = [];
  const blockedSamples: { author: string; asin: string; name: string; reason: string }[] = [];
  const authorMismatchSamples: { author: string; name: string; contributors: string }[] = [];

  for (const author of BOOK_AUTHOR_KEYWORDS) {
    const req = new SearchItemsRequestContent();
    req.partnerTag = tag;
    req.keywords = author;
    req.searchIndex = "Books";
    req.itemCount = 10;
    req.resources = [
      "images.primary.medium",
      "itemInfo.title",
      "itemInfo.byLineInfo",
      "itemInfo.classifications",
      "offersV2.listings.price",
      "offersV2.listings.availability",
    ];

    let items: any[] = [];
    try {
      const res = await api.searchItems("www.amazon.com.br", { searchItemsRequestContent: req });
      items = res?.searchResult?.items ?? [];
    } catch (err: any) {
      console.log(`[${author}] ERRO: ${err?.message ?? err}`);
      await sleep(1100);
      continue;
    }

    totalReturned += items.length;
    let returnedCount = items.length;
    let blockedApiCount = 0;
    let blockedAuthorCount = 0;
    let blockedFilterCount = 0;
    let passedCount = 0;

    for (const item of items) {
      const listing = item?.offersV2?.listings?.[0];
      const price = listing?.price?.money?.amount;
      const availability = listing?.availability?.type;
      if (!item?.asin || !price || price <= 0) {
        blockedApiCount++;
        continue;
      }
      if (availability && availability !== "IN_STOCK") {
        blockedApiCount++;
        continue;
      }

      const reason = reasonBlocked(item);
      if (reason) {
        blockedApiCount++;
        if (blockedSamples.length < 20) {
          blockedSamples.push({
            author,
            asin: item.asin,
            name: (item?.itemInfo?.title?.displayValue ?? "").slice(0, 60),
            reason,
          });
        }
        continue;
      }

      if (!matchesAuthor(item, author)) {
        blockedAuthorCount++;
        if (authorMismatchSamples.length < 20) {
          authorMismatchSamples.push({
            author,
            name: (item?.itemInfo?.title?.displayValue ?? "").slice(0, 60),
            contributors: contributorNames(item),
          });
        }
        continue;
      }

      const name = item?.itemInfo?.title?.displayValue ?? "";
      const discount = listing?.price?.savings?.percentage ?? 0;

      // Filtra também pelo desconto mínimo (60% para livros)
      if (discount < 60) {
        blockedFilterCount++;
        continue;
      }

      passedCount++;
      if (passedSamples.length < 40) {
        passedSamples.push({
          author,
          name: name.slice(0, 70),
          contributors: contributorNames(item),
          price,
          discount,
          hardcover: isHardcover(item),
        });
      }
    }

    totalBlockedApi += blockedApiCount;
    totalBlockedAuthor += blockedAuthorCount;
    totalBlockedFilter += blockedFilterCount;
    totalPassed += passedCount;

    console.log(
      `[${author}] retornou=${returnedCount} api-block=${blockedApiCount} author-block=${blockedAuthorCount} filter-block=${blockedFilterCount} passou=${passedCount}`
    );

    await sleep(1100);
  }

  console.log("\n==================== RESUMO ====================");
  console.log(`Autores consultados: ${BOOK_AUTHOR_KEYWORDS.length}`);
  console.log(`Produtos retornados pela API: ${totalReturned}`);
  console.log(`Bloqueados pela API (binding/name): ${totalBlockedApi}`);
  console.log(`Bloqueados por autor não bater: ${totalBlockedAuthor}`);
  console.log(`Bloqueados por desconto < 60%: ${totalBlockedFilter}`);
  console.log(`Passaram todos os filtros: ${totalPassed}`);

  console.log("\n---- Amostra de PASSAM ----");
  for (const p of passedSamples) {
    const hc = p.hardcover ? " [CAPA DURA]" : "";
    console.log(`  • [${p.author}] ${p.name} — R$${p.price} (-${p.discount}%)${hc}`);
    console.log(`      autores reais: ${p.contributors}`);
  }

  console.log("\n---- Amostra de BLOQUEADOS pela API ----");
  for (const b of blockedSamples) {
    console.log(`  • [${b.author}] ${b.asin} (${b.reason}) — ${b.name}`);
  }

  console.log("\n---- Amostra de AUTOR NÃO BATE ----");
  for (const m of authorMismatchSamples) {
    console.log(`  • [${m.author}] ${m.name}`);
    console.log(`      autores reais: ${m.contributors}`);
  }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

main().catch((err) => {
  console.error("Falha fatal:", err);
  process.exit(1);
});
