/**
 * Coleta produtos da Sallve via Rakuten Product Search API.
 * MID padrão: 53958.
 *
 * Sallve é uma marca única, então não usa lista de keywords — pagina direto
 * pelo MID e devolve todo o catálogo.
 */

import { RawProduct, isMakeupProduct, detectCategory } from "./types";
import {
  searchRakutenProducts,
  getAdvertiserId,
  RakutenProduct,
} from "./rakuten";
import { logger } from "../utils/logger";

const MAX_PAGES = 20;     // teto de segurança (20 × 100 = 2000 produtos)
const PAGE_SIZE = 100;

function toRawProduct(item: RakutenProduct): RawProduct | null {
  const name = item.productname;
  if (!name || !isMakeupProduct(name)) return null;

  const hasSale = item.saleprice > 0 && item.saleprice < item.price;
  const current_price = hasSale ? item.saleprice : item.price;
  if (current_price <= 0) return null;

  const original_price = hasSale ? item.price : undefined;
  const discount_pct = hasSale
    ? Math.round(((item.price - item.saleprice) / item.price) * 100)
    : 0;

  return {
    source: "sallve",
    source_id: item.sku ?? item.linkurl,
    name,
    current_price,
    original_price,
    discount_pct,
    rating: 0,
    reviews: 0,
    image_url: item.imageurl,
    product_url: item.linkurl,
    category: detectCategory(name),
  };
}

export async function collectFromSallve(
  onBatch?: (products: RawProduct[]) => Promise<void>
): Promise<RawProduct[]> {
  const mid = getAdvertiserId("sallve");
  if (!mid) {
    logger.warn("[Sallve] MID não configurado.");
    return [];
  }

  const all: RawProduct[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const items = await searchRakutenProducts({
      keyword: "Sallve",
      mid,
      max: PAGE_SIZE,
      pagenumber: page,
    });

    if (items.length === 0) break;

    const mapped = items
      .map(toRawProduct)
      .filter((p): p is RawProduct => p !== null)
      .filter(p => !seen.has(p.source_id));

    for (const p of mapped) seen.add(p.source_id);

    const onSale = mapped.filter(p => p.discount_pct > 0);
    logger.info(`[Sallve] Página ${page}: ${items.length} resultados, ${onSale.length} em promo`);
    all.push(...onSale);

    if (onBatch && onSale.length > 0) await onBatch(onSale);
    if (items.length < PAGE_SIZE) break;
  }

  logger.info(`[Sallve] Total: ${all.length} produtos em promo.`);
  return all;
}