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
  is_hardcover?: boolean;      // capa dura detectada via subtitle
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
  "yona", "princesa do alvorecer", "xxxholic",
  "fall in love you false angels", "sob a luz da lua",
  "sailor moon", "inuyasha", "skip & loafer", "skip and loafer",
  "o cão que guarda as estrelas", "sangatsu no lion",
  "your name", "cardcaptor sakura", "card captor sakura",
  "rosa de versalhes", "fruits basket", "garota à beira-mar",
  "the fable", "flying witch", "chi's sweet home",
  "nana", "anohana", "quero comer seu pâncreas", "orange",
  "suzume", "yamada-kun nível 999", "foi olhando para você",
  "honey lemon soda", "meu casamento feliz",
  "homem de gelo", "kamisama hajimemashita", "sono bisque doll",
  "tamon's b-side", "entre o profissional e o pessoal",
  "kaisha to shiseikatsu", "como conheci a minha alma gêmea",
  "aoharaido", "strobe edge", "furi fura", "hirayasumi",
  "vou me apaixonar por você mesmo assim",
  "o verão em que hikaru morreu", "kusuriya no hitorigoto",
  "diários de uma apotecária", "oshi no ko",
  "não mexa comigo, nagotoro", "ao no flag",
  "komi não consegue", "gokushufudou",
  "filhos da família shiunji", "namorada de aluguel",
  "as quíntuplas", "we never learn", "kaguya-sama",
  "kaiju", "konosuba", "wild strawberry", "a casa estranha",
  "re cervin", "marry grave", "quem é sakamoto",
  "man of rust", "tougen anki", "bakuon rettou",
  "wistoria", "shangri-la frontier", "lili-men", "salaryman z",
  "gokurakugai", "lycoris recoil", "noiva do clã kyogane",
  "missão: família yozakura", "mieruko-chan",
  "goblin slayer", "sword art online", "a voz do silêncio",
  "my little monster", "toradora", "no game no life",
  "um sinal de afeto", "perfect world", "amor imaturo",
  "5 centímetros por segundo", "nodame cantabile",
  "girl crush", "fragrant flower blooms", "as crianças da minha vida",
  "ela e o seu gato", "sem sorte para amar", "a pessoa amada",
  "o íntimo de mari", "o jardim das palavras", "o florescer do amor",
  "fireworks: luzes", "vampeerz", "gap: a teoria rosa",
  "o fim das minhas noites de solidão", "como conquistar um alfa",
  "pink heart jam", "doukyusei", "sirius: estrelas gêmeas",
  "yarichin bitch club", "meus dias na vila das gaivotas",
  "os dias de folga do vilão", "bênção do oficial celestial",
  "sistema de autopreservação do vilão", "meu final feliz",
  "fuja comigo, garota", "madoka magica",
  "o monstro solitário e a garota cega", "hello, melancholic",
  "what does the fox say", "me apaixonei pela vilã",
  "a nossa refeição", "bloom into you",
  "a noite além da janela triangular", "the dangerous convenience store",
  "citrus", "minha experiência lésbica", "diário da minha experiência",
  "minha existência de guerreira errante", "minha fuga alcoólica",
  "quero te amar até o fim", "10 coisas para fazer antes dos 40",
  "sempre é verão com você", "se quiser, é só pedir",
  "shimanami tasogare", "porque o amor existe",
  "o sétimo ano do amor puro", "professor yukimura",
  "a canção de yoru & asa", "pássaros que cantam não podem voar",
  "ten count", "você me deixa sem fôlego", "ouço os raios de luz",
  "seven days", "eu não preciso de um coração", "dakaichi",
  "10 dance", "sanctify", "cherry magic", "given",
  "será que esse amor é irresistível", "amor na ponta da língua",
  "one room angel", "new york, new york", "a estratégia do imperador",
  "nosso segredo", "sleeping dead", "no.6", "mo dao zu shi",
  "navillera", "tocando a sua noite", "boy meets maria",
  "meu vizinho metaleiro", "sasaki e miyano",
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
  "livro digital", "edição digital", "english edition",
  "audiolivro", "audio livro", "audiolibro", "versão integral", "versão completa",
];

// Lista de autores de livros (fantasy, terror, clássicos, true crime, etc.)
export const BOOK_AUTHOR_KEYWORDS = [
  "Sarah J. Maas",
  "Cassandra Clare",
  "Holly Black",
  "Victoria Aveyard",
  "Rebecca Ross",
  "V. E. Schwab",
  "Victoria Schwab",
  "Ayana Grey",
  "Gaston Leroux",
  "Eleanor H. Porter",
  "Brandon Sanderson",
  "Stephen King",
  "Laini Taylor",
  "Leigh Bardugo",
  "Jenna Levine",
  "Jennifer L. Armentrout",
  "Rachel Hawkins",
  "Jennifer Lynn Barnes",
  "Stephanie Garber",
  "Shelby Mahurin",
  "Pascale Lacelle",
  "Ali Hazelwood",
  "Hafsah Faizal",
  "Rachel Gillig",
  "Danielle L. Jensen",
  "Abigail Owen",
  "Erin A. Craig",
  "Thea Guanzon",
  "Hans Christian Andersen",
  "Jacob Grimm",
  "P. L. Travers",
  "Bram Stoker",
  "Jack London",
  "J. M. Barrie",
  "Mary Shelley",
  "Alexandre Dumas",
  "Nathaniel Hawthorne",
  "Mark Twain",
  "Aleksandr Afanasev",
  "Victor Hugo",
  "Emily Brontë",
  "Lewis Carroll",
  "Rudyard Kipling",
  "Howard Pyle",
  "Frances Hodgson Burnett",
  "Charles Dickens",
  "Daniel Defoe",
  "Robert Louis Stevenson",
  "George Orwell",
  "Virginia Woolf",
  "Jane Austen",
  "F. Scott Fitzgerald",
  "Mackenzi Lee",
  "Liza Palmer",
  "Beth O'Leary",
  "M. L. Rio",
  "Emily Henry",
  "Won-pyung Sohn",
  "Tricia Levenseller",
  "Naomi Alderman",
  "L. Frank Baum",
  "Joanne Harris",
  "Soman Chainani",
  "Toni Maguire",
  "Natasha Kampusch",
  "Maureen Orth",
  "J. R. R. Tolkien",
  "Truman Capote",
  "Daniela Arbex",
  "Svetlana Aleksiévitch",
  "Octavia E. Butler",
  "Rory Power",
  "Mary Lynn Bracht",
  "Ray Bradbury",
  "Constance Sayers",
  "Tabitha Suzuma",
  "Cornelia Funke",
  "Melissa Albert",
  "Matt Haig",
  "Gillian Flynn",
  "Jeff Guinn",
  "Julie Berry",
  "Danya Kukafka",
  "Martin Connolly",
  "Harold Schechter",
  "Jennifer Wright",
  "Valêncio Xavier",
  "Gary Kinder",
  "Ken Englade",
  "Arnold Van de Laar",
  "Barry E. Zimmerman",
  "Lydia Kang",
  "Nate Pedersen",
  "Thomas Morris",
  "Patti McCracken",
  "Cathryn Kemp",
  "Toni Cade Bambara",
  "Luciano Lamberti",
  "Ann C. Wolbert Burgess",
  "Steven Matthew Constantine",
  "Ann Rule",
  "Joe Navarro",
  "Michael H. Stone",
  "Gary Brucato",
  "Kate Clarke",
  "Mary Turner Thomson",
  "Gregg Olsen",
  "Maureen Callahan",
  "Becky Chambers",
  "Barbara Yelin",
  "Peer Meter",
  "Mendal W. Johnson",
  "Robert Curran",
];

const BOOK_POSITIVE_KEYWORDS = [
  "livro", "romance", "novel", "capa dura", "capa comum", "brochura",
  "edição", "volume", "vol.", "saga", "série", "coleção", "trilogia",
  "duologia", "fantasia", "ficção", "biografia", "autoajuda", "literatura",
  "ilustrado", "hardcover", "paperback",
];

export function isBookProduct(name: string): boolean {
  const lower = name.toLowerCase();
  if (BLOCKLIST.some(kw => lower.includes(kw))) return false;
  return BOOK_POSITIVE_KEYWORDS.some(kw => lower.includes(kw));
}

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
