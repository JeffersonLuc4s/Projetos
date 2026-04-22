import { Bot, InputFile } from "grammy";
import axios from "axios";
import { ScoredProduct } from "../scoring/deal-scorer";
import { logger } from "../utils/logger";

let bot: Bot | null = null;

export function getBot(): Bot {
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("TELEGRAM_BOT_TOKEN não configurado!");
    bot = new Bot(token);
  }
  return bot;
}

export function getChannelIds(): string[] {
  const raw = process.env.TELEGRAM_CHANNEL_IDS ?? "";
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

export interface PublishResult {
  channelId: string;
  messageId?: number;
  success: boolean;
  error?: string;
}

export async function publishToChannel(
  channelId: string,
  copyText: string,
  product: ScoredProduct,
  affiliateUrl: string
): Promise<PublishResult> {
  const finalCopy = copyText.replace("[LINK]", affiliateUrl);

  try {
    const tgBot = getBot();

    if (product.image_url) {
      try {
        const imageBuffer = await fetchImage(product.image_url);
        const msg = await tgBot.api.sendPhoto(channelId, new InputFile(imageBuffer, "promo.jpg"), {
          caption: finalCopy,
          parse_mode: "HTML",
        });
        logger.info(`[Telegram] ✅ Enviado com foto → ${channelId} (msg ${msg.message_id})`);
        return { channelId, messageId: msg.message_id, success: true };
      } catch {
        // Foto falhou, tenta só texto
      }
    }

    const msg = await tgBot.api.sendMessage(channelId, finalCopy, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: false },
    });

    logger.info(`[Telegram] ✅ Enviado → ${channelId} (msg ${msg.message_id})`);
    return { channelId, messageId: msg.message_id, success: true };
  } catch (err: any) {
    logger.error(`[Telegram] ❌ Erro → ${channelId}:`, err?.message ?? err);
    return { channelId, success: false, error: err?.message };
  }
}

async function fetchImage(url: string): Promise<Buffer> {
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 10000 });
  return Buffer.from(res.data);
}

export async function publishToAllChannels(
  copyText: string,
  product: ScoredProduct,
  affiliateUrl: string
): Promise<PublishResult[]> {
  const channels = getChannelIds();
  const results: PublishResult[] = [];
  for (const channelId of channels) {
    results.push(await publishToChannel(channelId, copyText, product, affiliateUrl));
    await new Promise(r => setTimeout(r, 500));
  }
  return results;
}

export function setupBotCommands() {
  const tgBot = getBot();

  tgBot.command("stats", async (ctx) => {
    const { getDashboardStats } = await import("../metrics/tracker");
    const stats = await getDashboardStats();
    const text = [
      "<b>📊 Stats do Bot:</b>",
      `📬 Total posts: ${stats.totalPosts}`,
      `📅 Posts hoje: ${stats.postsToday}`,
      `🔥 Insanas: ${stats.scoreDistribution.insana}`,
      `💥 Boas: ${stats.scoreDistribution.boa}`,
      `🛒 Normais: ${stats.scoreDistribution.normal}`,
    ].join("\n");
    await ctx.reply(text, { parse_mode: "HTML" });
  });

  tgBot.command("ping", async (ctx) => {
    await ctx.reply("🤖 Bot online!");
  });

  tgBot.start();
  logger.info("[Telegram] Bot iniciado e escutando comandos.");
}
