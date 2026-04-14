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

// Lista oficial de títulos permitidos — só produtos dessas séries passam
const ALLOWED_TITLES = [
  "haikyu", "naruto", "boruto", "one piece", "demon slayer", "chainsaw man",
  "spy x family", "beastars", "atelier of witch hat", "soul eater",
  "evangelion", "neon genesis", "fairy tail", "bleach", "noragami",
  "tokyo ghoul", "ataque dos titãs", "attack on titan", "shingeki",
  "dr. stone", "food wars", "promised neverland", "fire force",
  "moriarty", "seraph of the end", "akira", "battle angel alita",
  "death note", "hunter x hunter", "yu yu hakusho", "20th century boys",
  "mob psycho", "bungo stray dogs", "golden kamuy", "platinum end",
  "bakuman", "fullmetal alchemist", "monster kanzenban", "slam dunk",
  "vagabond", "nausicaä", "my hero academia", "boku no hero",
  "tokyo revengers", "edens zero", "shaman king", "made in abyss",
  "frieren", "blue period", "vinland saga", "black clover",
  "jujutsu kaisen", "black butler", "jojo", "dragon ball", "blue lock",
  "solo leveling", "boa noite punpun", "blue exorcist", "berserk",
  "seven deadly sins", "gash bell", "sakamoto days", "hanako-kun",
  "pluto", "hellsing", "dandadan", "overlord", "fire punch",
  "hajime no ippo", "wind breaker", "look back", "pokemon", "pokémon",
  "that time i got reincarnated", "slime", "gachiakuta",
  "one-punch man", "one punch man", "record of ragnarok", "asadora",
  "ashita no joe", "dororo", "mushoku tensei", "cavaleiros do zodíaco",
  "alice in borderland", "ghost in the shell", "parasyte", "ao ashi",
  "kagurabachi", "billy bat", "mushishi", "as flores do mal",
  "terra das gemas", "re:zero", "uzumaki", "tomie", "junji ito",
  "solanin", "vagabond", "akane banashi", "astro boy", "kimba",
  "metrópolis", "metropolis", "osamu tezuka", "tezuka",
  "dragon quest", "final fantasy", "kamen rider",
  "battle royale", "sanctuary", "gto", "hetalia",
  "caçando dragões", "caça dragões", "angústia",
  "blue box", "tower dungeon", "wind breaker",
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
  "kindle", "ebook", "e-book", "digital", "versão digital",
  "livro digital", "edição digital",
];

export function isAnimeProduct(name: string): boolean {
  const lower = name.toLowerCase();

  // Bloqueia imediatamente se tiver palavra da blocklist
  if (BLOCKLIST.some(kw => lower.includes(kw))) return false;

  // Precisa ser figure/manga/livro E pertencer a um título da lista
  const isCorrectType =
    FIGURE_KEYWORDS.some(kw => lower.includes(kw)) ||
    MANGA_KEYWORDS.some(kw => lower.includes(kw));

  if (!isCorrectType) return false;

  // Verifica se é de um título permitido
  return ALLOWED_TITLES.some(title => lower.includes(title));
}

export function detectCategory(name: string): string {
  const lower = name.toLowerCase();
  if (MANGA_KEYWORDS.some(kw => lower.includes(kw))) return "manga";
  if (FIGURE_KEYWORDS.some(kw => lower.includes(kw))) return "figure";
  return "outros";
}
