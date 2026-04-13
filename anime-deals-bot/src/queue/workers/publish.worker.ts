import { publishQueue, PublishJobData } from "../queues";
import { publishToChannel } from "../../telegram/publisher";
import { savePost, wasPostedRecently } from "../../database/queries";
import { logger } from "../../utils/logger";
import { ScoredProduct } from "../../scoring/deal-scorer";

async function processPublish(data: PublishJobData) {
  const { productId, channelId, copyText, affiliateUrl, product } = data;

  // Verificação final anti-duplicata antes de postar
  const antiSpamDays = Number(process.env.ANTI_SPAM_DAYS ?? 7);
  const alreadyPosted = await wasPostedRecently(productId, channelId, antiSpamDays);
  if (alreadyPosted) {
    logger.warn(`[PublishWorker] Duplicata bloqueada: "${product.name.slice(0, 40)}"`);
    return;
  }

  logger.info(`[PublishWorker] Publicando "${product.name.slice(0, 40)}" → ${channelId}`);

  const fakeProduct = {
    ...product,
    source: "amazon" as const,
    source_id: productId,
    product_url: affiliateUrl,
    current_price: 0,
    discount_pct: 0,
    rating: 0,
    reviews: 0,
    score: product.score,
    score_label: product.score_label as "normal" | "boa" | "insana",
    is_lowest_price: false,
    category: "outros",
  } satisfies ScoredProduct;

  const result = await publishToChannel(channelId, copyText, fakeProduct, affiliateUrl);

  if (result.success) {
    await savePost({
      product_id: productId,
      channel_id: channelId,
      message_id: result.messageId,
      copy_text: copyText,
      score_label: product.score_label,
    });
    logger.info(`[PublishWorker] ✅ Publicado! msg_id=${result.messageId}`);
  } else {
    throw new Error(result.error ?? "Erro desconhecido no Telegram");
  }
}

export function startPublishWorker() {
  publishQueue.onProcess(processPublish);
  logger.info("[PublishWorker] Worker de publicação iniciado.");
}
