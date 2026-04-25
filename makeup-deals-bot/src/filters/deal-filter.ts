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

// Desconto mínimo por source. Sallve entra com piso mais baixo porque
// a marca raramente aplica descontos maiores que 30%.
function minDiscountForProduct(p: RawProduct): number {
  if (p.source === "sallve") return 30;
  return 50;
}

export async function filterProducts(
  products: RawProduct[],
  channelId: string,
  config = defaultConfig
): Promise<Array<RawProduct & { isLowestPrice: boolean }>> {
  const results: Array<RawProduct & { isLowestPrice: boolean }> = [];

  for (const product of products) {
    const pid = productId(product.source, product.source_id);

    // Bloqueia amostras/testers/kits vazios
    const nameLower = product.name.toLowerCase();
    if (
      nameLower.includes("amostra") ||
      nameLower.includes("tester") ||
      nameLower.includes("nécessaire") ||
      nameLower.includes("necessaire") ||
      nameLower.includes("estojo vazio") ||
      nameLower.includes("porta-maquiagem")
    ) {
      logger.debug(`[Filter] Bloqueado (não-produto): "${product.name.slice(0, 60)}"`);
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

    // Piso absoluto por source (sem bypass de isLowestPrice)
    const minDiscount = minDiscountForProduct(product);
    if (product.discount_pct < minDiscount) {
      logger.debug(`[Filter] ${product.name.slice(0, 40)} — desconto insuficiente (${product.discount_pct}% < ${minDiscount}%)`);
      continue;
    }

    results.push({ ...product, isLowestPrice });
  }

  logger.info(`[Filter] ${results.length}/${products.length} produtos passaram nos filtros`);
  return results;
}
