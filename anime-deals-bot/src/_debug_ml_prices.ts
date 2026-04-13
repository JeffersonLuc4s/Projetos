import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pw = await import("playwright");
  const browser = await pw.chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "pt-BR",
  });
  const page = await context.newPage();

  const url = `https://lista.mercadolivre.com.br/${encodeURIComponent("figure anime")}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(3000);

  // Procura por itens que tenham preço original (com desconto)
  const result = await page.$$eval(".ui-search-layout__item", (els) => {
    return els.slice(0, 20).map((el) => {
      const title = el.querySelector(".poly-component__title")?.textContent?.trim() ?? "";

      // Como o preço está estruturado (fraction + cents separados)
      const currentFraction = el.querySelector(".poly-price__current .andes-money-amount__fraction")?.textContent?.trim() ?? "";
      const currentCents = el.querySelector(".poly-price__current .andes-money-amount__cents")?.textContent?.trim() ?? "00";
      const currentAriaLabel = el.querySelector(".poly-price__current .andes-money-amount")?.getAttribute("aria-label") ?? "";

      // Todos os elementos de preço disponíveis
      const allPriceHtml = el.querySelector(".poly-component__price")?.innerHTML?.slice(0, 1500) ?? "";

      // Tenta achar o preço original com diferentes seletores
      const origS = el.querySelector("s")?.textContent?.trim() ?? "";
      const origPrev = el.querySelector(".andes-money-amount--previous")?.textContent?.trim() ?? "";
      const origStrike = el.querySelector("[class*='previous'] .andes-money-amount__fraction")?.textContent?.trim() ?? "";

      const discountText = el.querySelector("[class*='discount']")?.textContent?.trim() ?? "";

      return { title: title.slice(0, 50), currentFraction, currentCents, currentAriaLabel, origS, origPrev, origStrike, discountText, allPriceHtml };
    });
  });

  // Mostra só itens com desconto detectado
  const withDiscount = result.filter(i => i.discountText || i.origS || i.origPrev);
  console.log(`Itens COM desconto visível: ${withDiscount.length} de ${result.length}\n`);

  withDiscount.slice(0, 4).forEach((item, i) => {
    console.log(`--- Item ${i+1}: ${item.title}`);
    console.log(`  Preço atual: ${item.currentFraction},${item.currentCents} (aria: "${item.currentAriaLabel}")`);
    console.log(`  origS (tag <s>): "${item.origS}"`);
    console.log(`  origPrev (.andes-money-amount--previous): "${item.origPrev}"`);
    console.log(`  origStrike (fraction dentro de previous): "${item.origStrike}"`);
    console.log(`  desconto texto: "${item.discountText}"`);
    console.log(`  HTML preço:`);
    console.log(item.allPriceHtml);
    console.log();
  });

  // Também mostra 3 itens sem desconto pra comparar
  const withoutDiscount = result.filter(i => !i.discountText && !i.origS && !i.origPrev).slice(0, 2);
  console.log(`\n--- Itens SEM desconto (referência):`);
  withoutDiscount.forEach((item, i) => {
    console.log(`  ${item.title} | R$${item.currentFraction},${item.currentCents}`);
  });

  await browser.close();
}

main().catch(console.error);
