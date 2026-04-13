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

  await page.goto(`https://lista.mercadolivre.com.br/${encodeURIComponent("manga desconto")}`, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(3000);

  const items = await page.$$eval(".ui-search-layout__item", (els) =>
    els.slice(0, 10).map((el) => {
      const title = el.querySelector(".poly-component__title")?.textContent?.trim() ?? "";
      const linkEl = el.querySelector("a.poly-component__title") as HTMLAnchorElement;
      const href = linkEl?.href ?? "";
      return { title: title.slice(0, 50), href };
    })
  );

  items.forEach((item, i) => {
    console.log(`\n--- Item ${i+1}: ${item.title}`);
    console.log(`href: ${item.href}`);
    
    // Mostra todos os matches possíveis
    const m1 = item.href.match(/\/p\/(MLB\d+)/);
    const m2 = item.href.match(/searchVariation=(MLB\d+)/);
    const m3 = item.href.match(/searchVariation=(\d+)/);
    const m4 = item.href.match(/wid=(MLB\d+)/);
    console.log(`  /p/(MLB): ${m1?.[1] ?? "nenhum"}`);
    console.log(`  searchVariation MLB: ${m2?.[1] ?? "nenhum"}`);
    console.log(`  searchVariation digits: ${m3?.[1] ?? "nenhum"}`);
    console.log(`  wid: ${m4?.[1] ?? "nenhum"}`);
  });

  await browser.close();
}
main().catch(console.error);
