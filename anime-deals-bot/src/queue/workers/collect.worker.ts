import { collectQueue, addPublishJob, CollectJobData } from "../queues";
import { collectFromAmazon } from "../../collectors/amazon";
import { collectFromMercadoLivre } from "../../collectors/mercadolivre";
import { filterProducts } from "../../filters/deal-filter";
import { scoreAndRank } from "../../scoring/deal-scorer";
import { buildAffiliateLink } from "../../affiliate/link-manager";
import { upsertProduct, countPostsToday } from "../../database/queries";
import { generateCopy } from "../../copy/copy-generator";
import { getChannelIds } from "../../telegram/publisher";
import { logger } from "../../utils/logger";

async function processCollect(data: CollectJobData) {
  logger.info(`[CollectWorker] Iniciando coleta: source=${data.source}`);

  const rawProducts = [];
  const { source } = data;

  if (source === "amazon" || source === "all") {
    const items = await collectFromAmazon();
    rawProducts.push(...items);
    logger.info(`[CollectWorker] Amazon: ${items.length} produtos`);
  }

  if (source === "mercadolivre" || source === "all") {
    const items = await collectFromMercadoLivre();
    rawProducts.push(...items);
    logger.info(`[CollectWorker] ML: ${items.length} produtos`);
  }

  const channels = getChannelIds();
  if (channels.length === 0) {
    logger.warn("[CollectWorker] Nenhum canal configurado. Abortando.");
    return;
  }

  const maxPostsPerDay = Number(process.env.MAX_POSTS_PER_DAY ?? 10);
  let publishedCount = 0;

  for (const channelId of channels) {
    const todayCount = await countPostsToday(channelId);
    const remaining = maxPostsPerDay - todayCount;

    if (remaining <= 0) {
      logger.info(`[CollectWorker] Canal ${channelId} atingiu limite hoje.`);
      continue;
    }

    const filtered = await filterProducts(rawProducts, channelId);
    const ranked = scoreAndRank(filtered);
    const topProducts = ranked.slice(0, remaining);

    logger.info(`[CollectWorker] ${topProducts.length} produtos para publicar no canal ${channelId}`);

    let delay = 0;
    for (const product of topProducts) {
      const { affUrl, shortUrl } = await buildAffiliateLink(product.product_url, product.source);

      const productId = await upsertProduct({
        ...product,
        aff_url: affUrl,
        short_url: shortUrl,
      });

      const copyText = await generateCopy(product);

      await addPublishJob({
        productId,
        channelId,
        copyText,
        affiliateUrl: shortUrl || affUrl,
        product: {
          name: product.name,
          image_url: product.image_url,
          score_label: product.score_label,
          score: product.score,
        },
      }, delay);

      delay += 60_000; // 1 minuto entre posts
      publishedCount++;
    }
  }

  logger.info(`[CollectWorker] Concluído. ${publishedCount} posts enfileirados.`);
}

export function startCollectWorker() {
  collectQueue.onProcess(processCollect);
  logger.info("[CollectWorker] Worker de coleta iniciado.");
}
