import dotenv from "dotenv";
dotenv.config();

import { collectFromMercadoLivre } from "./collectors/mercadolivre";
import { collectFromAmazon } from "./collectors/amazon";
import { scoreAndRank } from "./scoring/deal-scorer";
import { generateCopy } from "./copy/copy-generator";
import { publishToChannel } from "./telegram/publisher";
import { migrate } from "./database/schema";

async function main() {
  await migrate();

  const channelId = process.env.TELEGRAM_CHANNEL_IDS!.split(",")[0].trim();
  console.log(`Canal: ${channelId}`);

  // Coleta rápida de ML (mais rápido que Amazon)
  console.log("\nColetando produtos do Mercado Livre...");
  let products = await collectFromMercadoLivre();

  if (products.length === 0) {
    console.log("ML zerou, tentando Amazon...");
    products = await collectFromAmazon();
  }

  console.log(`${products.length} produtos coletados.`);

  if (products.length === 0) {
    console.error("Nenhum produto encontrado.");
    return;
  }

  // Pontua e pega o melhor que ainda não foi enviado hoje
  const scored = scoreAndRank(products);
  const { wasPostedRecently } = await import("./database/queries");
  let best = scored[0];
  for (const p of scored) {
    const posted = await wasPostedRecently(p.source_id, channelId, 1);
    if (!posted) { best = p; break; }
  }
  console.log(`(pulando já enviados hoje...)`)

  console.log(`\nMelhor produto: ${best.name.slice(0, 60)}`);
  console.log(`Score: ${best.score} (${best.score_label}) | Desconto: ${best.discount_pct}% | R$${best.current_price}`);
  console.log(`URL: ${best.product_url}`);

  // Gera copy e envia
  console.log("\nGerando copy...");
  const copy = await generateCopy(best);
  console.log("\n--- COPY ---");
  console.log(copy.replace("[LINK]", best.product_url));
  console.log("---\n");

  console.log("Enviando para o Telegram...");
  const result = await publishToChannel(channelId, copy, best, best.product_url);

  if (result.success) {
    console.log(`✅ Oferta enviada! msg_id=${result.messageId}`);
  } else {
    console.error(`❌ Falha: ${result.error}`);
  }
}

main().catch(console.error);
