/**
 * Scraper da página de cupons da Amazon BR.
 *
 * 1. Abre https://www.amazon.com.br/coupons
 * 2. Extrai cupons relevantes pras categorias do bot (livros/mangá/figure)
 * 3. Mostra os candidatos e posta o melhor no Telegram
 */

import "dotenv/config";
import { chromium, type Browser, type Page } from "playwright";
import axios from "axios";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  livro: ["livro", "livros", "literatura", "romance", "ficção", "autor"],
  manga: ["manga", "mangá", "mangás", "quadrinho", "quadrinhos", "hq"],
  figure: ["funko", "figure", "colecionável", "brinquedo", "bonecos", "pop"],
};

interface CouponCandidate {
  title: string;
  description: string;
  url: string;
  image: string;
  discountText: string;
  category: string;
}

function categorize(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some((k) => lower.includes(k))) return cat;
  }
  return null;
}

function addTag(url: string, tag: string): string {
  try {
    const u = new URL(url, "https://www.amazon.com.br");
    u.searchParams.set("tag", tag);
    return u.toString();
  } catch {
    return url + (url.includes("?") ? "&" : "?") + `tag=${tag}`;
  }
}

async function scrapeCoupons(page: Page): Promise<CouponCandidate[]> {
  console.log("Navegando pra /deals...");
  await page.goto("https://www.amazon.com.br/deals", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(4000);

  const title = await page.title();
  const url = page.url();
  console.log(`Title: ${title}`);
  console.log(`URL final: ${url}`);

  if (title.toLowerCase().includes("entrar") || title.toLowerCase().includes("sign in")) {
    throw new Error("Página de cupons requer login");
  }

  // Snapshot pra diagnóstico
  const fs = await import("fs");
  const html = await page.content();
  fs.writeFileSync("./amazon-deals.html", html);
  console.log(`HTML salvo em ./amazon-deals.html (${html.length} chars)`);

  await page.screenshot({ path: "./amazon-deals.png", fullPage: false });
  console.log("Screenshot salvo em ./amazon-deals.png");

  // Scroll pra carregar lazy content
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(1500);
  }

  // Encontra o carrossel de "Cupons em campo"
  const candidates: any[] = await page.evaluate(() => {
    const cards: any[] = [];
    const headers = Array.from(document.querySelectorAll("h2, h3"));

    for (const h of headers) {
      const txt = (h.textContent || "").trim().toLowerCase();
      if (!txt.includes("cupom") && !txt.includes("cupon")) continue;

      // Sobe até achar o container do carrossel
      let container: Element | null = h.closest(".dcl-container, .dcl-carousel, section") ?? h.parentElement;
      while (container && !container.querySelector(".dcl-carousel-element, .dcl-carousel-element-hero-link, a[href]")) {
        container = container.parentElement;
      }
      if (!container) continue;

      container.querySelectorAll("a[href]").forEach((a: any) => {
        const href = a.getAttribute("href") || "";
        if (!href) return;

        const card = a.closest(".dcl-carousel-element, li, div") ?? a;
        const text = (card.textContent || "").trim().replace(/\s+/g, " ").slice(0, 300);
        const img = card.querySelector("img")?.getAttribute("src") ?? "";
        const discountMatch = text.match(/R\$\s*[\d.,]+|\d+\s*%/i);

        cards.push({
          href,
          text,
          img,
          discountText: discountMatch ? discountMatch[0] : "",
        });
      });
    }
    return cards;
  });

  console.log(`Cards em "Cupons em campo": ${candidates.length}`);

  const result: CouponCandidate[] = [];
  for (const c of candidates as any[]) {
    const cat = categorize(c.text);
    if (!cat) continue;
    const url = c.href.startsWith("http") ? c.href : `https://www.amazon.com.br${c.href}`;
    result.push({
      title: c.text.slice(0, 80),
      description: c.text.slice(0, 200),
      url,
      image: c.img,
      discountText: c.discountText || "",
      category: cat,
    });
  }

  return result;
}

async function sendToTelegram(c: CouponCandidate, tag: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channelIds = process.env.TELEGRAM_CHANNEL_IDS;
  if (!token || !channelIds) {
    console.log("TELEGRAM_BOT_TOKEN/CHANNEL_IDS ausentes, pulando envio.");
    return;
  }

  const channelId = channelIds.split(",")[0].trim();
  const affiliateUrl = addTag(c.url, tag);

  const emoji = c.category === "livro" ? "📖" : c.category === "manga" ? "📚" : "🗿";
  const caption = `🎟️ <b>CUPOM ATIVO</b>\n${emoji} ${c.category.toUpperCase()}\n\n${c.description.slice(0, 200)}\n\n👉 <a href="${affiliateUrl}">Ver cupom na Amazon</a>\n\n<i>Qualquer compra feita em até 24h após clicar no link gera comissão pra o canal.</i>`;

  console.log(`Enviando pro canal ${channelId}...`);

  try {
    if (c.image) {
      await axios.post(`https://api.telegram.org/bot${token}/sendPhoto`, {
        chat_id: channelId,
        photo: c.image,
        caption,
        parse_mode: "HTML",
      });
    } else {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: channelId,
        text: caption,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      });
    }
    console.log("✅ Enviado.");
  } catch (err: any) {
    console.error("Erro no Telegram:", err?.response?.data ?? err?.message);
  }
}

async function main() {
  const tag = process.env.AMAZON_AFFILIATE_TAG ?? "";
  if (!tag) {
    console.error("AMAZON_AFFILIATE_TAG ausente");
    process.exit(1);
  }

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "pt-BR",
    });
    const page = await context.newPage();

    const coupons = await scrapeCoupons(page);
    console.log(`\n==================== CANDIDATOS (${coupons.length}) ====================`);
    coupons.slice(0, 15).forEach((c, i) => {
      console.log(`\n[${i + 1}] [${c.category}] ${c.title}`);
      console.log(`    Desc: ${c.discountText || "—"}`);
      console.log(`    URL: ${c.url.slice(0, 100)}`);
    });

    if (coupons.length === 0) {
      console.log("\nNenhum cupom relevante encontrado. Possíveis causas:");
      console.log("- Página requer login");
      console.log("- Seletores CSS mudaram");
      console.log("- Amazon bloqueou (anti-bot)");
      return;
    }

    const best = coupons[0];
    console.log(`\nEnviando o primeiro candidato → [${best.category}] ${best.title}`);
    await sendToTelegram(best, tag);
  } finally {
    if (browser) await browser.close();
  }
}

main().catch((err) => {
  console.error("Falha fatal:", err);
  process.exit(1);
});