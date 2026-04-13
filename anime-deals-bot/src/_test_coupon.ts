import dotenv from "dotenv";
dotenv.config();

import { collectFromAmazon } from "./collectors/amazon";
import { scoreAndRank } from "./scoring/deal-scorer";
import { generateCopy } from "./copy/copy-generator";
import { publishToChannel } from "./telegram/publisher";
import { migrate } from "./database/schema";

async function main() {
  await migrate();
  const channelId = process.env.TELEGRAM_CHANNEL_IDS!.split(",")[0].trim();

  console.log("Coletando Amazon (scraping)...");
  const products = await collectFromAmazon();
  console.log(`${products.length} produtos coletados.`);

  // Tenta achar um com cupom primeiro
  const withCoupon = products.filter(p => p.coupon_value);
  console.log(`Produtos com cupom detectado: ${withCoupon.length}`);

  // Se não tiver cupom, pega o de maior desconto mesmo
  const scored = scoreAndRank(withCoupon.length > 0 ? withCoupon : products);
  const best = scored[0];

  console.log(`\nProduto escolhido: ${best.name.slice(0, 60)}`);
  console.log(`Preço: R$${best.current_price} | Desconto: ${best.discount_pct}%`);
  if (best.coupon_value) {
    console.log(`Cupom: ${best.coupon_type === "fixed" ? `R$${best.coupon_value}` : `${best.coupon_value}%`} OFF`);
    console.log(`Preço final: R$${best.final_price}`);
  }

  console.log("\nGerando copy...");
  const copy = await generateCopy(best);
  console.log("\n--- COPY ---");
  console.log(copy.replace("[LINK]", best.product_url));
  console.log("---\n");

  console.log("Enviando...");
  const result = await publishToChannel(channelId, copy, best, best.product_url);
  if (result.success) {
    console.log(`✅ Enviado! msg_id=${result.messageId}`);
  } else {
    console.error(`❌ Falha: ${result.error}`);
  }
}

main().catch(console.error);
