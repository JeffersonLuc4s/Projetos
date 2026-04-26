import { collectQueue, addPublishJob, CollectJobData } from "../queues";
import { collectFromAmazon } from "../../collectors/amazon";
// import { collectFromMercadoLivre } from "../../collectors/mercadolivre"; // ML desativado
import { filterProducts } from "../../filters/deal-filter";
import { scoreAndRank } from "../../scoring/deal-scorer";
import { buildAffiliateLink } from "../../affiliate/link-manager";
import { upsertProduct, countPostsToday } from "../../database/queries";
import { generateCopy } from "../../copy/copy-generator";
import { getChannelIds } from "../../telegram/publisher";
import { RawProduct } from "../../collectors/types";
import { logger } from "../../utils/logger";

async function processCollect(data: CollectJobData) {
  logger.info(`[CollectWorker] Iniciando coleta: source=${data.source}`);

  const channels = getChannelIds();
  if (channels.length === 0) {
    logger.warn("[CollectWorker] Nenhum canal configurado. Abortando.");
    return;
  }

  const maxPostsPerDay = Number(process.env.MAX_POSTS_PER_DAY ?? 10);
  let publishedCount = 0;

  // Espaçamento entre posts: delay aleatório de 2 a 4 minutos
  const MIN_GAP_MS = 2 * 60 * 1000;
  const MAX_GAP_MS = 4 * 60 * 1000;
  let nextPostAt = Date.now();

  // Chamado a cada lote de produtos encontrados
  async function onBatch(batch: RawProduct[]) {
    for (const channelId of channels) {
      const todayCount = await countPostsToday(channelId);
      if (todayCount >= maxPostsPerDay) continue;

      const filtered = await filterProducts(batch, channelId);
      const ranked = scoreAndRank(filtered);

      for (const product of ranked) {
        const todayNow = await countPostsToday(channelId);
        if (todayNow >= maxPostsPerDay) break;

        const { affUrl, shortUrl } = await buildAffiliateLink(product.product_url, product.source);
        const productId = await upsertProduct({ ...product, category: product.category!, aff_url: affUrl, short_url: shortUrl });
        const copyText = await generateCopy(product);

        const delayMs = Math.max(0, nextPostAt - Date.now());
        nextPostAt = Math.max(nextPostAt, Date.now()) + MIN_GAP_MS + Math.floor(Math.random() * (MAX_GAP_MS - MIN_GAP_MS));

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
        }, delayMs);

        publishedCount++;
        const minutes = Math.round(delayMs / 60000);
        logger.info(`[CollectWorker] Agendado p/ +${minutes}min: "${product.name.slice(0, 40)}"`);
      }
    }
  }

  const { source } = data;

  if (source === "amazon" || source === "all") {
    await collectFromAmazon(onBatch);
  }

  // Mercado Livre desativado — usar somente Amazon API
  // if (source === "mercadolivre" || source === "all") {
  //   await collectFromMercadoLivre(onBatch);
  // }

  logger.info(`[CollectWorker] Concluído. ${publishedCount} posts publicados.`);
}

export function startCollectWorker() {
  collectQueue.onProcess(processCollect);
  logger.info("[CollectWorker] Worker de coleta iniciado.");
}
