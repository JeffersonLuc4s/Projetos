/**
 * Algoritmo de pontuação de ofertas.
 *
 * Score de 0 a 100 baseado em:
 * - % de desconto (peso 40)
 * - Rating e popularidade (peso 30)
 * - Menor preço histórico (peso 20)
 * - Popularidade relativa do produto (peso 10)
 */

import { RawProduct } from "../collectors/types";

export type ScoreLabel = "normal" | "boa" | "insana";

export interface ScoredProduct extends RawProduct {
  score: number;
  score_label: ScoreLabel;
  is_lowest_price: boolean;
}

// Produtos "virais" — marcas de alta procura no nicho de beleza
const VIRAL_PRODUCTS = [
  "rare beauty", "fenty", "huda beauty", "charlotte tilbury",
  "the ordinary", "cerave", "la roche-posay", "olaplex",
  "mac", "maybelline", "nars", "urban decay", "too faced",
  "bruna tavares", "bt skin", "boticário", "natura",
];

function isViralProduct(name: string): boolean {
  const lower = name.toLowerCase();
  return VIRAL_PRODUCTS.some(kw => lower.includes(kw));
}

function normalizeDiscount(pct: number): number {
  // 20% → 0 pts, 50%+ → 40 pts
  if (pct < 20) return 0;
  if (pct >= 50) return 40;
  return ((pct - 20) / 30) * 40;
}

function normalizeRating(rating: number, reviews: number): number {
  // Rating: 0–4.0 → 0 pts, 5.0 → 20 pts
  // Reviews: quanto mais reviews, melhor (até 20 pts)
  const ratingScore = Math.max(0, ((rating - 3.5) / 1.5)) * 20;
  const reviewsScore = Math.min(20, (Math.log10(Math.max(1, reviews)) / 4) * 20);
  return ratingScore + reviewsScore;
}

function lowestPriceBonus(isLowestPrice: boolean): number {
  return isLowestPrice ? 20 : 0;
}

function viralBonus(name: string): number {
  return isViralProduct(name) ? 10 : 0;
}

export function scoreProduct(product: RawProduct, isLowestPrice = false): ScoredProduct {
  const discountScore = normalizeDiscount(product.discount_pct);
  const popularityScore = normalizeRating(product.rating, product.reviews);
  const lowestScore = lowestPriceBonus(isLowestPrice);
  const viral = viralBonus(product.name);

  const score = Math.min(100, Math.round(discountScore + popularityScore + lowestScore + viral));

  let label: ScoreLabel;
  if (score >= 70 || (product.discount_pct >= 40 && product.rating >= 4.5)) {
    label = "insana";
  } else if (score >= 45 || product.discount_pct >= 30) {
    label = "boa";
  } else {
    label = "normal";
  }

  return {
    ...product,
    score,
    score_label: label,
    is_lowest_price: isLowestPrice,
  };
}

export function scoreAndRank(
  products: Array<RawProduct & { isLowestPrice: boolean }>
): ScoredProduct[] {
  return products
    .map(p => scoreProduct(p, p.isLowestPrice))
    .sort((a, b) => b.score - a.score);
}
