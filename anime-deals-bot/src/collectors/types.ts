export interface RawProduct {
  source: "amazon" | "mercadolivre";
  source_id: string;
  name: string;
  current_price: number;
  original_price?: number;
  discount_pct: number;
  rating: number;
  reviews: number;
  image_url?: string;
  product_url: string;
  category?: string;
  coupon_value?: number;       // ex: 20 (R$20 OFF) ou 10 (10% OFF)
  coupon_type?: "fixed" | "percent";
  final_price?: number;        // preço após cupom aplicado
}

// Palavras que identificam FIGURES e colecionáveis físicos de anime
const FIGURE_KEYWORDS = [
  "figure", "action figure", "figura de ação", "figura colecionável",
  "funko pop", "funko", "nendoroid", "figma", "banpresto", "goodsmile",
  "good smile", "kotobukiya", "megahouse", "kaiyodo", "pop up parade",
  "estátua", "statue", "busto", "diorama", "model kit", "gunpla",
  "boneco colecionável", "boneco anime", "bonecos anime",
];

// Palavras que identificam MANGÁS e livros
const MANGA_KEYWORDS = [
  "mangá", "manga", "vol.", "volume", "box set manga", "light novel",
  "novel", "quadrinho", "hq anime",
];

// Títulos de anime conhecidos (usados junto com figure/manga para confirmar)
const ANIME_TITLES = [
  "naruto", "one piece", "dragon ball", "attack on titan", "shingeki",
  "demon slayer", "kimetsu no yaiba", "jujutsu kaisen", "my hero academia",
  "boku no hero", "sword art online", "fullmetal alchemist", "death note",
  "hunter x hunter", "bleach", "fairy tail", "tokyo ghoul", "re:zero",
  "overlord", "black clover", "chainsaw man", "spy x family", "vinland saga",
  "berserk", "vagabond", "one punch man", "mob psycho", "evangelion",
  "frieren", "blue lock", "oshi no ko", "dandadan", "boruto", "sakamoto days",
  "solo leveling", "dungeon meshi", "shangri-la frontier",
];

// Palavras que EXCLUEM o produto (independente do resto)
const BLOCKLIST = [
  "camiseta", "camisa", "blusa", "camisola", "moletom", "casaco", "jaqueta",
  "calça", "short", "bermuda", "meia", "cueca", "pijama", "roupa",
  "vestuário", "moda", "roupas", "fantasia de tecido",
  "chaveiro", "pingente", "colar", "pulseira", "brinco", "anel", "acessório",
  "caneca", "copo", "garrafa", "squeeze",
  "almofada", "capa de almofada", "poster", "quadro", "tapeçaria",
  "mouse pad", "mousepad", "mochila", "bolsa", "carteira",
  "boneco de pelúcia", "pelúcia", "plush",
  "adesivo", "sticker", "pin", "botton",
  "máscara", "peruca",
];

export function isAnimeProduct(name: string): boolean {
  const lower = name.toLowerCase();

  // Bloqueia imediatamente se tiver palavra da blocklist
  if (BLOCKLIST.some(kw => lower.includes(kw))) return false;

  // Aceita se tiver keyword de figure/colecionável
  if (FIGURE_KEYWORDS.some(kw => lower.includes(kw))) return true;

  // Aceita se tiver keyword de manga/livro
  if (MANGA_KEYWORDS.some(kw => lower.includes(kw))) return true;

  return false;
}

export function detectCategory(name: string): string {
  const lower = name.toLowerCase();
  if (MANGA_KEYWORDS.some(kw => lower.includes(kw))) return "manga";
  if (FIGURE_KEYWORDS.some(kw => lower.includes(kw))) return "figure";
  return "outros";
}
