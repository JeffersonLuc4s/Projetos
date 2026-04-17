import { RawProduct, isAnimeProduct, isBookProduct, detectCategory, BOOK_AUTHOR_KEYWORDS } from "./types";
import { logger } from "../utils/logger";

const AMAZON_KEYWORDS = [
  "Haikyu!!",
  "Haikyu!",
  "Naruto Gold",
  "Naruto",
  "Boruto",
  "One Piece",
  "Demon Slayer",
  "Chainsaw Man",
  "Spy x Family",
  "Beastars",
  "Atelier of Witch Hat",
  "Soul Eater",
  "Neon Genesis Evangelion",
  "Fairy Tail",
  "Bleach",
  "Noragami",
  "Tokyo Ghoul",
  "Tokyo Ghoul: re",
  "Ataque dos Titãs",
  "Dr. Stone",
  "Food Wars",
  "The Promised Neverland",
  "Fire Force",
  "Moriarty: o Patriota",
  "Seraph of the End",
  "Akira",
  "Battle Angel Alita",
  "Death Note",
  "Hunter X Hunter",
  "Yu Yu Hakusho",
  "20th Century Boys",
  "Mob Psycho 100",
  "Bungo Stray Dogs",
  "Caçando Dragões",
  "Golden Kamuy",
  "Platinum End",
  "Bakuman",
  "Fullmetal Alchemist",
  "Monster Kanzenban",
  "Crimes Perfeitos",
  "Slam Dunk",
  "Vagabond",
  "Nausicaä do Vale do Vento",
  "My Hero Academia",
  "Tokyo Revengers",
  "Edens Zero",
  "Shaman King",
  "The Beginning After the End",
  "Uma Vida Imortal",
  "Made in Abyss",
  "Frieren e a Jornada para o Além",
  "Blue Period",
  "Vinland Saga",
  "Black Clover",
  "Jujutsu Kaisen",
  "Black Butler",
  "Jojo's Bizarre Adventure",
  "Dragon Ball",
  "Blue Lock",
  "Solo Leveling",
  "Boa Noite Punpun",
  "Blue Exorcist",
  "Berserk",
  "The Seven Deadly Sins",
  "Gash Bell!!",
  "Sakamoto Days",
  "Hanako-kun e os Mistérios do Colégio Kamome",
  "Sense Life",
  "Pluto",
  "Hellsing",
  "Dandadan",
  "Overlord",
  "Fire Punch",
  "Hajime no Ippo",
  "Wind Breaker",
  "Look Back",
  "A Menina do Outro Lado",
  "Pokémon",
  "Sayonara Eri",
  "Tower Dungeon",
  "That Time I Got Reincarnated as a Slime",
  "Gachiakuta",
  "Dead Dead Demons Dededede Destruction",
  "One-Punch Man",
  "Record of Ragnarok",
  "Asadora!",
  "Ashita no Joe",
  "Boys Run the Riot",
  "Mangaká da Favela",
  "Disney Twisted-Wonderland",
  "Manga Theater",
  "Dororo",
  "Mushoku Tensei",
  "Cavaleiros do Zodíaco",
  "Katana Beast",
  "Alice in Borderland",
  "Nekogahara",
  "The Ghost in the Shell",
  "Uq Holder!",
  "Dragon Quest",
  "Yomi no Tsugai",
  "Blue Box",
  "O 11º Tripulante",
  "Akane Banashi",
  "Tenkaichi",
  "Astro Boy",
  "Parasyte",
  "My Home Hero",
  "Ao Ashi",
  "I Sold My Life for Ten Thousand Yen Per Year",
  "Não Chame de MISTÉRIO",
  "Final Fantasy Lost Stranger",
  "A Heroica Lenda de Arslan",
  "Kamen Rider Kuuga",
  "Show-ha Shoten!",
  "Silver Spoon",
  "Museum O Assassino Ri na Chuva",
  "BECK Volume",
  "Kagurabachi",
  "Billy Bat",
  "Rooster Fighter",
  "Ruri Dragon",
  "Baoh",
  "Planetes Volume",
  "Mao Vol.",
  "Blade Vol.",
  "Fênix Vol.",
  "Mushishi",
  "As Flores do Mal",
  "Terra das Gemas",
  "Re:Zero",
  "Hellbound: Profecia do Inferno",
  "Kaikisen: Retorno ao Mar",
  "A Magia de um Retornado tem de ser Especial",
  "Crônicas das Guerras de Lodoss",
  "Suiiki: Território das Águas",
  "Kimba: O Leão Branco",
  "A Música de Marie",
  "Zero no Tsukaima",
  "Kamen Rider",
  "The King of Fighters",
  "Corpse Party: Another Child",
  "Patrulha Estelar Yamato",
  "O Horizonte Volume",
  "GTO Volume",
  "Rei de Lata Volume",
  "Hetalia Axis Power",
  "Devil Ecstasy",
  "Divina Comédia Go Nagai",
  "A Magia Continua",
  "Sanctuary Vol.",
  "Versus Vol.",
  "Pesadelos Completos",
  "Fragmentos do Horror",
  "Shigahime",
  "DeathDisco",
  "A Feiticeira da Tempestade",
  "Engolidos pela Terra",
  "Contos de Horror da Mimi",
  "Almanaque das Estações",
  "Chushingura: O Tesouro dos 47 Ronins",
  "Kogarashi Monjirou: O Prenúncio do Inverno",
  "Mandala de Fogo",
  "O Vampiro que Ri",
  "A Princesa do Castelo Sem Fim",
  "Mil Olhos de uma Terra em Fúria",
  "Confins de um Sonho",
  "Tomie Vol.",
  "FIRE! Vol.",
  "Shigurui: Frenesi da Morte",
  "O Preço da Desonra: Kubidai Hikiukenin",
  "O Novo Preço da Desonra",
  "Vampiros Volume",
  "Fóssil dos Sonhos",
  "O Estranho Conto da Ilha Panorama",
  "Hotel Harbour-View: Tokyo Killers",
  "Dismorfos: Seleção de Contos Favoritos do Autor",
  "A Valise do Professor",
  "Mais Forte que a Espada",
  "PTSD Radio: Frequências do Terror",
  "O Diário do Meu Pai",
  "MW: Psicopatia Profana",
  "Borboleta Assassina",
  "O Beco",
  "Battle Royale Omnibus",
  "As Egocêntricas Maldições de Souichi",
  "O Encanamento que Geme",
  "A Lanterna de Nix Vol.",
  "A Lanterna de Nix Volume",
  "Spectreman",
  "Miyamoto Musashi Biografia em Mangá",
  "Sensor Mangá",
  "Hokusai Biografia em Mangá",
  "O Último Voo das Borboletas",
  "Rohan no Louvre",
  "Zona Fantasma",
  "Black Paradox",
  "Vênus Invisível",
  "Contos Esmagadores",
  "Recado a Adolf",
  "Guardiões do Louvre",
  "A Sala de Aula que Derreteu",
  "Um Bairro Distante",
  "Mortos de Amor",
  "Frankenstein e Outras Histórias de Horror",
  "Solanin",
  "Morada do Desertor",
  "Cidade das Lápides",
  "Satsuma Gishiden: Crônicas Dos Leais Guerreiros De Satsuma",
  "A Lenda de Musashi",
  "As Esculturas sem Cabeça",
  "Omori Volume",
  "O Ladrão de Mundos",
  "Os Dias Comuns de Yano-Kun",
  "Dig It Volume",
  "Dicas de Férias de um Nobre Gentil",
  "Gannibal: Vila de Canibais",
  "A Cidade da Calmaria e a Terra das Cerejeiras",
  "Uzumaki",
  "Buracos da Estranheza",
  "Gyo",
  "Angustia Junji Ito",
  "Olhares Junji Ito",
  "Calafrios: Seleção de Contos Favoritos do Autor",
  "Planeta Demoníaco Remina",
  "Declínio de um Homem",
  "Diario dos Gatos Yon & Mu",
  "Ayako",
  "O Homem que Passeia",
  "Zoo no Inverno",
  "O Gourmet Solitário",
  "Dano Cerebral Volume",
  "Metrópolis Osamu Tezuka",
  "A Grande Invasão Mongol",
  "Na Prisão Volume",
  "Nas Montanhas do Terror",
  "Yona A Princesa do Alvorecer",
  "xxxHolic",
  "Fall in Love, You False Angels",
  "Sob a Luz da Lua",
  "Sailor Moon",
  "Inuyasha",
  "Skip & Loafer",
  "O Cão que Guarda as Estrelas",
  "Sangatsu no Lion",
  "Your Name",
  "Cardcaptor Sakura Clear Card Arc",
  "Rosa de Versalhes",
  "Fruits Basket",
  "Garota à Beira-Mar",
  "The Fable Big",
  "Flying Witch",
  "Chi's Sweet Home",
  "Card Captor Sakura",
  "Nana",
  "Anohana",
  "Quero Comer Seu Pâncreas",
  "Orange",
  "Suzume",
  "Minha História de Amor com Yamada-kun Nível 999",
  "Foi olhando para você…",
  "Honey Lemon Soda",
  "Meu Casamento Feliz",
  "O Homem de Gelo e sua Fria Colega de Trabalho",
  "Kamisama Hajimemashita",
  "Sono Bisque Doll",
  "Tamon's b-side",
  "Entre o Profissional e o Pessoal",
  "Kaisha To Shiseikatsu",
  "Como Conheci a Minha Alma Gêmea",
  "Aoharaido",
  "Strobe Edge",
  "Furi Fura",
  "Hirayasumi",
  "Vou me Apaixonar por Você Mesmo Assim",
  "O Verão em que Hikaru Morreu",
  "Kusuriya no Hitorigoto",
  "Diários de uma Apotecária",
  "Oshi no Ko",
  "Não Mexa Comigo, Nagotoro",
  "Ao no Flag",
  "Komi Não Consegue se Comunicar",
  "Gokushufudou",
  "Os Filhos da Família Shiunji",
  "Namorada de Aluguel",
  "As Quíntuplas",
  "We Never Learn",
  "Kaguya-sama Love is War",
  "Kaiju N.° 8",
  "Konosuba",
  "Wild Strawberry",
  "A Casa Estranha",
  "Re Cervin",
  "Marry Grave",
  "Quem é Sakamoto?",
  "Man of Rust",
  "Tougen Anki",
  "Bakuon Rettou",
  "Wistoria: Wand & Sword",
  "Shangri-la Frontier",
  "Lili-men",
  "Salaryman Z",
  "Gokurakugai",
  "Lycoris Recoil",
  "A Noiva do Clã Kyogane",
  "Missão: Família Yozakura",
  "Mieruko-chan",
  "Goblin Slayer",
  "Sword Art Online",
  "A Voz do Silêncio",
  "My Little Monster",
  "Toradora!",
  "No Game No Life",
  "Um Sinal de Afeto",
  "Perfect World",
  "Amor Imaturo",
  "5 Centímetros por Segundo",
  "Nodame Cantabile",
  "Girl Crush",
  "The Fragrant Flower Blooms With Dignity",
  "As Crianças da Minha Vida",
  "Ela e o seu Gato",
  "Sem Sorte Para Amar",
  "A Pessoa Amada",
  "O Íntimo de Mari",
  "O Jardim das Palavras",
  "O Florescer do Amor",
  "Fireworks: Luzes no Céu",
  "Vampeerz",
  "GAP: A Teoria Rosa",
  "O Fim das Minhas Noites de Solidão",
  "Como Conquistar um Alfa",
  "Pink Heart Jam",
  "Doukyusei",
  "Sirius: Estrelas Gêmeas",
  "Yarichin Bitch Club",
  "Meus Dias na Vila das Gaivotas",
  "Os Dias de Folga do Vilão",
  "Bênção do Oficial Celestial",
  "O Sistema de Autopreservação do Vilão Desprezível",
  "Meu Final Feliz",
  "Fuja Comigo, Garota!",
  "Madoka Magica",
  "O Monstro Solitário e a Garota Cega",
  "Hello, Melancholic!",
  "What Does the Fox Say?",
  "Me Apaixonei pela Vilã",
  "A Nossa Refeição",
  "Bloom Into You",
  "A Noite Além da Janela Triangular",
  "The Dangerous Convenience Store",
  "Citrus Volume",
  "Minha Experiência Lésbica com a Solidão",
  "Diário da Minha Experiência Comigo Mesma",
  "Minha Existência de Guerreira Errante",
  "Minha Fuga Alcoólica da Realidade",
  "Quero te Amar Até o Fim",
  "10 Coisas Para Fazer Antes dos 40",
  "Sempre é Verão com Você",
  "Se Quiser, é só Pedir",
  "Shimanami Tasogare",
  "Porque o Amor Existe!",
  "O Sétimo Ano do Amor Puro",
  "Professor Yukimura & Kei",
  "A Canção de Yoru & Asa",
  "Pássaros que Cantam Não Podem Voar",
  "Ten Count",
  "Você me Deixa sem Fôlego",
  "Ouço os Raios de Luz",
  "Seven Days Volume",
  "Eu Não Preciso de um Coração",
  "Dakaichi: o Homem Mais Desejado do Ano",
  "10 Dance",
  "Sanctify",
  "Cherry Magic",
  "Given",
  "Será Que Esse Amor é Irresistível?",
  "Amor na Ponta da Língua",
  "One Room Angel",
  "New York, New York",
  "A Estratégia do Imperador",
  "Nosso Segredo Volume",
  "Sleeping Dead Volume",
  "No.6",
  "Mo Dao Zu Shi",
  "Navillera Volume",
  "Tocando a sua Noite",
  "Boy Meets Maria",
  "Meu Vizinho Metaleiro",
  "Sasaki e Miyano",
  "Skip and Loafer",
  "Frieren",
];

async function collectViaScraping(tag: string, onBatch?: (products: RawProduct[]) => Promise<void>): Promise<RawProduct[]> {
  let chromium: any;
  try {
    const pw = await import("playwright");
    chromium = pw.chromium;
  } catch {
    logger.warn("[Amazon Scraping] Playwright não disponível. Pulando.");
    return [];
  }

  const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
  ];

  const products: RawProduct[] = [];

  let browser: any;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    logger.warn("[Amazon Scraping] Browser não instalado. Rode: npx playwright install chromium");
    return [];
  }

  const searchConfigs = [
    { keywords: AMAZON_KEYWORDS, filter: isAnimeProduct, defaultCategory: undefined as string | undefined },
    { keywords: BOOK_AUTHOR_KEYWORDS, filter: isBookProduct, defaultCategory: "livro" as string | undefined },
  ];

  for (const { keywords, filter, defaultCategory } of searchConfigs) {
  for (const query of keywords) {
    const context = await browser.newContext({
      userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
      locale: "pt-BR",
      viewport: { width: 1280, height: 800 },
    });

    try {
      const page = await context.newPage();
      const url = `https://www.amazon.com.br/s?k=${encodeURIComponent(query)}&i=stripbooks&s=price-asc-rank`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(2000 + Math.random() * 2000);

      const items = await page.$$eval('[data-component-type="s-search-result"]', (els: any[]) =>
        els.slice(0, 10).map((el: any) => {
          const name = el.querySelector("h2 span")?.textContent?.trim() ?? "";

          // Bloqueia Kindle/ebook pelo texto do card
          const fullText = el.textContent?.toLowerCase() ?? "";
          const subtitleText = (
            el.querySelector(".a-size-medium.a-color-secondary") ??
            el.querySelector(".a-size-base.a-color-secondary") ??
            el.querySelector(".a-size-mini.a-color-secondary") ??
            el.querySelector("[class*='subtitle']")
          )?.textContent?.toLowerCase() ?? "";

          if (
            fullText.includes("kindle") ||
            subtitleText.includes("kindle") ||
            name.toLowerCase().includes("kindle") ||
            name.toLowerCase().includes("english edition") ||
            name.toLowerCase().includes("audiolivro") ||
            name.toLowerCase().includes("versão integral") ||
            subtitleText.includes("audiolivro") ||
            subtitleText.includes("versão integral")
          ) return null;

          const isHardcover = subtitleText.includes("capa dura");
          const priceWhole = el.querySelector(".a-price-whole")?.textContent?.replace(/[.,]/g, "").trim() ?? "0";
          const priceFrac = el.querySelector(".a-price-fraction")?.textContent?.trim() ?? "00";
          const currentPrice = parseFloat(`${priceWhole}.${priceFrac}`);

          const originalPriceText = el.querySelector(".a-text-price .a-offscreen")?.textContent
            ?.replace("R$", "").replace(/[.,]/g, "").trim() ?? "0";
          const originalPrice = parseFloat(originalPriceText) / 100 || undefined;

          const ratingText = el.querySelector(".a-icon-alt")?.textContent?.split(" ")?.[0] ?? "0";
          const rating = parseFloat(ratingText.replace(",", ".")) || 0;

          const reviewsText = el.querySelector('[aria-label*="stars"] ~ span, .a-size-small .a-color-secondary')?.textContent?.replace(/\D/g, "") ?? "0";
          const reviews = parseInt(reviewsText, 10) || 0;

          const asin = el.getAttribute("data-asin") ?? "";
          const image = (el.querySelector(".s-image") as any)?.src ?? "";
          const productUrl = `https://www.amazon.com.br/dp/${asin}`;

          const couponText = el.querySelector(".s-coupon-unclipped, [id*='coupon'], .a-color-success")?.textContent?.trim() ?? "";
          let couponValue: number | undefined;
          let couponType: "fixed" | "percent" | undefined;
          if (couponText) {
            const fixedMatch = couponText.match(/R\$\s*([\d]+(?:[,.]\d{1,2})?)/i);
            const pctMatch = couponText.match(/(\d+)\s*%/i);
            if (fixedMatch) {
              couponValue = parseFloat(fixedMatch[1].replace(",", "."));
              couponType = "fixed";
            } else if (pctMatch) {
              couponValue = parseInt(pctMatch[1], 10);
              couponType = "percent";
            }
          }

          return { name, currentPrice, originalPrice, rating, reviews, asin, image, productUrl, couponValue, couponType, isHardcover };
        })
      );

      for (const item of items) {
        if (!item || !item.asin || !filter(item.name)) continue;
        const discountPct = item.originalPrice
          ? Math.round(((item.originalPrice - item.currentPrice) / item.originalPrice) * 100)
          : 0;

        let finalPrice: number | undefined;
        if (item.couponValue && item.couponType) {
          finalPrice = item.couponType === "fixed"
            ? Math.round((item.currentPrice - item.couponValue) * 100) / 100
            : Math.round((item.currentPrice * (1 - item.couponValue / 100)) * 100) / 100;
        }

        const product: RawProduct = {
          source: "amazon",
          source_id: item.asin,
          name: item.name,
          current_price: item.currentPrice,
          original_price: item.originalPrice,
          discount_pct: discountPct,
          rating: item.rating,
          reviews: item.reviews,
          image_url: item.image,
          product_url: `${item.productUrl}?tag=${tag}`,
          category: defaultCategory ?? detectCategory(item.name),
          coupon_value: item.couponValue,
          coupon_type: item.couponType,
          final_price: finalPrice,
          is_hardcover: item.isHardcover,
        };

        if (onBatch) {
          await onBatch([product]);
        } else {
          products.push(product);
        }
      }
    } catch (err) {
      logger.error(`[Amazon Scraping] Erro na busca "${query}":`, err);
    } finally {
      await context.close();
    }

    await sleep(3000 + Math.random() * 3000);
  }
  } // fim searchConfigs loop

  await browser.close();
  return products;
}

export async function collectFromAmazon(onBatch?: (products: RawProduct[]) => Promise<void>): Promise<RawProduct[]> {
  const tag =
    process.env.AMAZON_AFFILIATE_TAG ??
    process.env.AMAZON_PARTNER_TAG ??
    "";

  logger.info("[Amazon] Usando scraping direto.");
  return collectViaScraping(tag, onBatch);
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
