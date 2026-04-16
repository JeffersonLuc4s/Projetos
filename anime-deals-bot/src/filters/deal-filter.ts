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

// Desconto mínimo por categoria
function minDiscountForCategory(category?: string): number {
  if (category === "manga") return 50;
  if (category === "figure") return 50;
  if (category === "livro") return 60;
  return 50; // padrão para outros
}

export async function filterProducts(
  products: RawProduct[],
  channelId: string,
  config = defaultConfig
): Promise<Array<RawProduct & { isLowestPrice: boolean }>> {
  const results: Array<RawProduct & { isLowestPrice: boolean }> = [];

  for (const product of products) {
    const pid = productId(product.source, product.source_id);

    // Bloqueia digital/kindle independente de qualquer outro filtro
    const nameLower = product.name.toLowerCase();
    if (
      nameLower.includes("kindle") ||
      nameLower.includes("ebook") ||
      nameLower.includes("e-book") ||
      nameLower.includes("english edition") ||
      nameLower.includes("livro digital") ||
      nameLower.includes("edição digital") ||
      nameLower.includes("versão digital")
    ) {
      logger.debug(`[Filter] Bloqueado (digital): "${product.name.slice(0, 60)}"`);
      continue;
    }

    // Preço mínimo para Amazon — Kindle raramente passa de R$20, físico raramente fica abaixo de R$12
    if (product.source === "amazon" && product.current_price < 12) {
      logger.info(`[Filter] Bloqueado (preço suspeito R$${product.current_price}): "${product.name.slice(0, 50)}"`);
      continue;
    }

    // Anti-spam
    const alreadyPosted = await wasPostedRecently(pid, channelId, config.antiSpamDays);
    if (alreadyPosted) {
      logger.debug(`[Filter] ${product.name.slice(0, 40)} — ignorado (spam)`);
      continue;
    }

    // Menor preço histórico
    const minPrice = await getMinPrice90Days(pid);
    const isLowestPrice = minPrice !== null && product.current_price <= minPrice;

    // Desconto mínimo por categoria
    const minDiscount = minDiscountForCategory(product.category);
    if (product.discount_pct < minDiscount && !isLowestPrice) {
      logger.debug(`[Filter] ${product.name.slice(0, 40)} — desconto insuficiente (${product.discount_pct}% < ${minDiscount}%)`);
      continue;
    }

    results.push({ ...product, isLowestPrice });
  }

  logger.info(`[Filter] ${results.length}/${products.length} produtos passaram nos filtros`);
  return results;
}
