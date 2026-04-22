export interface RawProduct {
  source: "belezanaweb" | "ocean";
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
  coupon_value?: number;
  coupon_type?: "fixed" | "percent";
  final_price?: number;
  brand?: string;
}

// Categorias de maquiagem / beleza
const MAKEUP_KEYWORDS = [
  "batom", "gloss", "lip tint", "lipstick",
  "base", "corretivo", "bb cream", "cc cream", "primer",
  "pó compacto", "pó facial", "blush", "bronzer", "contorno", "iluminador",
  "paleta", "sombra", "eyeshadow", "delineador", "eyeliner",
  "máscara de cílios", "rímel", "mascara",
  "lápis de olho", "lápis de sobrancelha", "sobrancelha",
  "fixador de maquiagem", "spray fixador", "setting spray",
];

const SKINCARE_KEYWORDS = [
  "sérum", "serum", "hidratante", "creme facial", "tônico", "esfoliante",
  "protetor solar", "fps", "anti-idade", "antirrugas", "vitamina c",
  "ácido hialurônico", "retinol", "niacinamida", "água micelar", "demaquilante",
  "sabonete facial", "máscara facial", "mascara facial",
];

const HAIR_KEYWORDS = [
  "shampoo", "condicionador", "máscara capilar", "mascara capilar",
  "leave-in", "leave in", "finalizador", "óleo capilar", "oleo capilar",
  "creme para pentear", "ampola capilar",
];

const PERFUME_KEYWORDS = [
  "perfume", "colônia", "colonia", "eau de parfum", "edp", "eau de toilette", "edt",
  "fragrância", "fragrancia", "body splash",
];

// Marcas comuns de beleza — ajudam a identificar produtos legítimos
const BRAND_KEYWORDS = [
  "maybelline", "mac", "ruby rose", "nars", "urban decay", "dior", "chanel",
  "boticário", "boticario", "eudora", "quem disse, berenice", "natura",
  "avon", "vult", "dailus", "bruna tavares", "bt", "océane", "oceane",
  "too faced", "benefit", "charlotte tilbury", "fenty", "anastasia beverly hills",
  "huda beauty", "rare beauty", "nyx", "revlon", "l'oréal", "loreal",
  "the ordinary", "cerave", "la roche-posay", "vichy", "eucerin", "neutrogena",
  "olaplex", "wella", "kérastase", "kerastase", "redken", "lowell",
  "clinique", "estée lauder", "lancôme", "lancome", "shiseido", "sk-ii",
];

// Palavras que EXCLUEM o produto
const BLOCKLIST = [
  "amostra", "tester", "teste",
  "sacola", "nécessaire", "necessaire", "bolsinha de maquiagem",
  "estojo vazio", "porta-maquiagem",
];

export function isMakeupProduct(name: string): boolean {
  const lower = name.toLowerCase();

  if (BLOCKLIST.some(kw => lower.includes(kw))) return false;

  return (
    MAKEUP_KEYWORDS.some(kw => lower.includes(kw)) ||
    SKINCARE_KEYWORDS.some(kw => lower.includes(kw)) ||
    HAIR_KEYWORDS.some(kw => lower.includes(kw)) ||
    PERFUME_KEYWORDS.some(kw => lower.includes(kw)) ||
    BRAND_KEYWORDS.some(kw => lower.includes(kw))
  );
}

export function detectCategory(name: string): string {
  const lower = name.toLowerCase();
  if (MAKEUP_KEYWORDS.some(kw => lower.includes(kw))) return "maquiagem";
  if (SKINCARE_KEYWORDS.some(kw => lower.includes(kw))) return "skincare";
  if (HAIR_KEYWORDS.some(kw => lower.includes(kw))) return "cabelo";
  if (PERFUME_KEYWORDS.some(kw => lower.includes(kw))) return "perfume";
  return "outros";
}
