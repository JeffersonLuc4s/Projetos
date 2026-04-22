import { RawProduct } from "../collectors/types";
import { wasPostedRecently, getMinPrice90Days, productId } from "../database/queries";
import { logger } from "../utils/logger";

export interface FilterConfig {
  antiSpamDays: number;
  maxPostsPerDay: number;
}

export const defaultConfig: FilterConfig = {
  antiSpamDays: Number(process.env.ANTI_SPAM_DAYS ?? 7),
  maxPostsPerDay: Number(process.env.MAX_POSTS_PER_DAY ?? 10),
};

const ALLOWED_CATEGORIES = new Set(["manga", "figure", "livro"]);

// Desconto mínimo por categoria
function minDiscountForCategory(category: string): number {
  if (category === "manga") return 50;
  if (category === "figure") return 40;
  if (category === "livro") return 60;
  return 9999;
}

export async function filterProducts(
  products: RawProduct[],
  channelId: string,
  config = defaultConfig
): Promise<Array<RawProduct & { isLowestPrice: boolean }>> {
  const results: Array<RawProduct & { isLowestPrice: boolean }> = [];

  for (const product of products) {
    const pid = productId(product.source, product.source_id);

    // Só manga, figure ou livro
    if (!product.category || !ALLOWED_CATEGORIES.has(product.category)) {
      logger.debug(`[Filter] ${product.name.slice(0, 40)} — categoria inválida (${product.category ?? "none"})`);
      continue;
    }

    // Anti-spam
    const alreadyPosted = await wasPostedRecently(pid, channelId, config.antiSpamDays);
    if (alreadyPosted) {
      logger.debug(`[Filter] ${product.name.slice(0, 40)} — ignorado (spam)`);
      continue;
    }

    // Desconto mínimo por categoria (regra dura, sem bypass)
    const minDiscount = minDiscountForCategory(product.category);
    if (product.discount_pct < minDiscount) {
      logger.debug(`[Filter] ${product.name.slice(0, 40)} — desconto insuficiente (${product.discount_pct}% < ${minDiscount}%)`);
      continue;
    }

    // Menor preço histórico (só informativo, usado pelo copy/scoring)
    const minPrice = await getMinPrice90Days(pid);
    const isLowestPrice = minPrice !== null && product.current_price < minPrice;

    results.push({ ...product, isLowestPrice });
  }

  logger.info(`[Filter] ${results.length}/${products.length} produtos passaram nos filtros`);
  return results;
}
