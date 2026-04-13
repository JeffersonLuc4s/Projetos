import { collectFromMercadoLivre } from "./collectors/mercadolivre";

async function main() {
  const products = await collectFromMercadoLivre();
  console.log(`\nTotal: ${products.length} produtos\n`);
  products.slice(0, 8).forEach(p =>
    console.log(`- ${p.name.slice(0, 50)} | R$${p.current_price} | ${p.discount_pct}% OFF | ${p.source_id}`)
  );
}

main().catch(console.error);
