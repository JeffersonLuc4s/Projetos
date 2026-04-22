/**
 * Coleta produtos da Beleza na Web via Rakuten Product Search API.
 */

import { RawProduct, isMakeupProduct, detectCategory } from "./types";
import {
  searchRakutenProducts,
  getAdvertiserId,
  RakutenProduct,
} from "./rakuten";
import { logger } from "../utils/logger";

const SEARCH_KEYWORDS = [
  "batom", "base", "paleta", "blush", "máscara de cílios",
  "delineador", "corretivo", "pó compacto", "primer",
  "sérum", "hidratante", "protetor solar", "vitamina c", "retinol",
  "shampoo", "condicionador", "máscara capilar",
  "perfume", "eau de parfum",
];

function toRawProduct(item: RakutenProduct): RawProduct | null {
  const name = item.productname;
  if (!name || !isMakeupProduct(name)) return null;

  // saleprice=0 significa "sem promo" na API Rakuten
  const hasSale = item.saleprice > 0 && item.saleprice < item.price;
  const current_price = hasSale ? item.saleprice : item.price;
  if (current_price <= 0) return null;

  const original_price = hasSale ? item.price : undefined;
  const discount_pct = hasSale
    ? Math.round(((item.price - item.saleprice) / item.price) * 100)
    : 0;

  return {
    source: "belezanaweb",
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

export async function collectFromBelezaNaWeb(
  onBatch?: (products: RawProduct[]) => Promise<void>
): Promise<RawProduct[]> {
  const mid = getAdvertiserId("belezanaweb");
  if (!mid) {
    logger.warn("[BelezaNaWeb] MID não configurado.");
    return [];
  }

  const all: RawProduct[] = [];

  for (const keyword of SEARCH_KEYWORDS) {
    const items = await searchRakutenProducts({ keyword, mid, max: 100 });
    const mapped = items.map(toRawProduct).filter((p): p is RawProduct => p !== null);
    const onSale = mapped.filter(p => p.discount_pct > 0);

    logger.info(`[BelezaNaWeb] "${keyword}": ${items.length} resultados, ${onSale.length} em promo`);
    all.push(...onSale);

    if (onBatch && onSale.length > 0) await onBatch(onSale);
  }

  logger.info(`[BelezaNaWeb] Total: ${all.length} produtos em promo.`);
  return all;
}
