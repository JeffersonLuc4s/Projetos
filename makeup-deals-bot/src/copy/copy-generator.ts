/**
 * Gerador de copy persuasiva usando Claude AI.
 *
 * Gera textos no estilo beleza/maquiagem com urgência, escassez e prova social.
 * Fallback para templates caso a API não esteja disponível.
 */

import Anthropic from "@anthropic-ai/sdk";
import { ScoredProduct } from "../scoring/deal-scorer";
import { logger } from "../utils/logger";

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

function formatPrice(price: number): string {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// =====================================================================
// GERAÇÃO VIA IA
// =====================================================================

export async function generateCopyAI(product: ScoredProduct): Promise<string> {
  if (!client) {
    logger.warn("[Copy] Anthropic não configurada. Usando template.");
    return generateCopyTemplate(product);
  }

  const hasCoupon = !!(product as any).coupon_value;
  const finalPrice = (product as any).final_price as number | undefined;
  const couponValue = (product as any).coupon_value as number | undefined;
  const couponType = (product as any).coupon_type as "fixed" | "percent" | undefined;

  const systemPrompt = `Você é um assistente especialista em detecção de promoções e criação de copy persuasiva para afiliados.
Sua função é gerar copy de alta conversão para produtos de maquiagem, skincare, cabelo e perfumaria no Telegram.
NUNCA invente preços, cupons ou informações não fornecidas.
Retorne APENAS o texto do post, sem explicações.`;

  const couponInfo = hasCoupon
    ? `Cupom detectado: ${couponType === "fixed" ? `R$${couponValue} OFF` : `${couponValue}% OFF`}\nPreço final com cupom: ${formatPrice(finalPrice!)}`
    : "Sem cupom.";

  const userPrompt = `Gere uma copy para este produto:

Produto: ${product.name}
Preço original: ${product.original_price ? formatPrice(product.original_price) : "não informado"}
Preço atual: ${formatPrice(product.current_price)}
${product.discount_pct > 0 ? `Desconto: ${product.discount_pct}%` : ""}
${couponInfo}
${product.rating > 0 ? `Avaliação: ${product.rating}/5 (${product.reviews.toLocaleString("pt-BR")} avaliações)` : ""}
${product.is_lowest_price ? "Menor preço dos últimos 90 dias: SIM" : ""}

${hasCoupon ? `Formato obrigatório:
📦 {nome}
💰 De {preco_original} por {preco_atual}
🎟️ Cupom: {valor_cupom}
💸 Com cupom: {preco_final}
👉 [LINK]` : `Formato obrigatório:
📦 {nome}
💰 De {preco_original} por {preco_atual}
🏷️ {desconto}% OFF
👉 [LINK]`}

Regras: máximo 8 linhas, sem inventar nada, termine sempre com "👉 [LINK]"`;

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    return text.trim();
  } catch (err) {
    logger.error("[Copy] Erro na API da Anthropic:", err);
    return generateCopyTemplate(product);
  }
}

// =====================================================================
// TEMPLATES FALLBACK
// =====================================================================

const URGENCY_PHRASES = [
  "⚠️ Pode esgotar a qualquer momento!",
  "⚡ Oferta por tempo limitado!",
  "🏃 Corre que tá voando!",
  "🔔 Quantidades limitadas!",
  "⏰ Garante o seu antes que acabe!",
];

const SOCIAL_PROOF_PHRASES = [
  "Muito bem avaliado pelas clientes!",
  "Queridinho do público! ✅",
  "Um dos mais elogiados da categoria!",
  "As clientes amaram! Veja as avaliações.",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getProductEmoji(category: string): string {
  const map: Record<string, string> = {
    maquiagem: "💄",
    skincare: "✨",
    cabelo: "💇",
    perfume: "🌸",
    outros: "💅",
  };
  return map[category] ?? "💅";
}

export function generateCopyTemplate(product: ScoredProduct): string {
  const emoji = getProductEmoji(product.category ?? "outros");
  const name = product.name.length > 50 ? product.name.slice(0, 50) + "..." : product.name;
  const couponValue = (product as any).coupon_value as number | undefined;
  const couponType = (product as any).coupon_type as "fixed" | "percent" | undefined;
  const finalPrice = (product as any).final_price as number | undefined;

  let lines = [`${emoji} ${name}`, ``];

  if (product.original_price && product.discount_pct > 0) {
    lines.push(`💰 De ${formatPrice(product.original_price)} por ${formatPrice(product.current_price)}`);
    lines.push(`🏷️ ${product.discount_pct}% OFF`);
  } else {
    lines.push(`💰 Por ${formatPrice(product.current_price)}`);
  }

  if (couponValue && couponType && finalPrice) {
    const couponLabel = couponType === "fixed" ? `R$${couponValue} OFF` : `${couponValue}% OFF`;
    lines.push(`🎟️ Cupom: ${couponLabel}`);
    lines.push(`💸 Com cupom: ${formatPrice(finalPrice)}`);
  }

  if (product.is_lowest_price) {
    lines.push(`📉 Menor preço dos últimos 90 dias!`);
  }

  lines.push(``);
  lines.push(`👉 [LINK]`);

  return lines.join("\n");
}

// =====================================================================
// A/B TESTING
// =====================================================================

export async function generateCopyAB(product: ScoredProduct): Promise<{ A: string; B: string }> {
  const [copyA, copyB] = await Promise.all([
    generateCopyAI(product),
    generateCopyTemplate(product),
  ]);
  return { A: copyA, B: copyB };
}

export async function generateCopy(product: ScoredProduct): Promise<string> {
  return generateCopyAI(product);
}
