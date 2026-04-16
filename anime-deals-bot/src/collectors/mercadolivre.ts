/**
 * Coletor do Mercado Livre.
 *
 * Estratégia:
 * 1. OAuth client_credentials (se ML_APP_ID + ML_APP_SECRET configurados)
 * 2. Scraping do site público com Playwright como fallback
 */

import axios from "axios";
import { RawProduct, isAnimeProduct, detectCategory } from "./types";
import { logger } from "../utils/logger";

const ML_API = "https://api.mercadolibre.com";

const SEARCH_QUERIES = [
  "manga naruto", "manga one piece", "manga dragon ball",
  "figure anime", "funko pop anime", "nendoroid anime",
  "banpresto figure", "figure jujutsu kaisen",
  "figure demon slayer", "figure my hero academia",
  "box colecionador manga",
];

// =====================================================================
// OAuth Token (client_credentials)
// =====================================================================

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const appId = process.env.ML_APP_ID;
  const appSecret = process.env.ML_APP_SECRET;
  if (!appId || !appSecret) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  try {
    const res = await axios.post(
      `${ML_API}/oauth/token`,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: appId,
        client_secret: appSecret,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 10000 }
    );
    const token = res.data.access_token as string;
    const expiresIn = (res.data.expires_in as number) * 1000;
    cachedToken = { token, expiresAt: Date.now() + expiresIn - 60_000 };
    logger.info("[ML] Token OAuth obtido com sucesso.");
    return token;
  } catch (err) {
    logger.error("[ML] Erro ao obter token OAuth:", err);
    return null;
  }
}

// =====================================================================
// Busca via API autenticada
// =====================================================================

async function searchViaAPI(query: string, token: string, limit = 20): Promise<RawProduct[]> {
  const res = await axios.get(`${ML_API}/sites/MLB/search`, {
    params: { q: query, limit, condition: "new", sort: "relevance" },
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    timeout: 10000,
  });

  const items = res.data.results ?? [];
  const products: RawProduct[] = [];

  for (const item of items) {
    if (!isAnimeProduct(item.title)) continue;

    const discount_pct = item.original_price
      ? Math.round(((item.original_price - item.price) / item.original_price) * 100)
      : 0;

    const affiliateId = process.env.MERCADOLIVRE_AFFILIATE_ID ?? "";
    const productUrl = affiliateId
      ? `${item.permalink}?matt_tool=${affiliateId}`
      : item.permalink;

    products.push({
      source: "mercadolivre",
      source_id: item.id,
      name: item.title,
      current_price: item.price,
      original_price: item.original_price ?? undefined,
      discount_pct,
      rating: item.seller_info?.seller_reputation?.transactions?.ratings?.positive ?? 0,
      reviews: item.seller_info?.seller_reputation?.transactions?.completed ?? 0,
      image_url: item.thumbnail?.replace("I.jpg", "O.jpg"),
      product_url: productUrl,
      category: detectCategory(item.title),
    });
  }

  return products;
}

// =====================================================================
// Scraping via Playwright (fallback sem credenciais)
// =====================================================================

function parseBRPrice(text: string): number {
  // Formato BR: R$1.234,56 — pega o primeiro preço encontrado
  const match = text.match(/R\$\s*([\d.]+),([\d]{2})/);
  if (!match) {
    const intOnly = text.match(/R\$\s*([\d.]+)/);
    if (!intOnly) return 0;
    return parseFloat(intOnly[1].replace(/\./g, ""));
  }
  return parseFloat(`${match[1].replace(/\./g, "")}.${match[2]}`);
}

async function searchViaScraping(browser: any, query: string, onBatch?: (products: RawProduct[]) => Promise<void>): Promise<RawProduct[]> {
  const products: RawProduct[] = [];

  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "pt-BR",
  });

  try {
    const page = await context.newPage();

    const url = `https://lista.mercadolivre.com.br/${encodeURIComponent(query)}_FORMAT_Impresso`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(2000);

    const items = await page.$$eval(".ui-search-layout__item", (els: any[]) =>
      els.slice(0, 10).map((el: any) => {
        const title = el.querySelector(".poly-component__title")?.textContent?.trim() ?? "";

        const currentFraction = el.querySelector(".poly-price__current .andes-money-amount__fraction")?.textContent?.trim() ?? "0";
        const currentCents = el.querySelector(".poly-price__current .andes-money-amount__cents")?.textContent?.trim() ?? "00";
        const currentPriceText = `R$${currentFraction},${currentCents}`;

        const origEl = el.querySelector("s.andes-money-amount--previous");
        let originalPriceText = "";
        if (origEl) {
          const origFraction = origEl.querySelector(".andes-money-amount__fraction")?.textContent?.trim() ?? "";
          const origCents = origEl.querySelector(".andes-money-amount__cents")?.textContent?.trim() ?? "";
          originalPriceText = origCents ? `R$${origFraction},${origCents}` : `R$${origFraction}`;
        }

        const discountRawText = el.querySelector("[class*='discount']")?.textContent?.trim() ?? "";
        const discountPctMatch = discountRawText.match(/(\d+)%/);
        const discountPctDirect = discountPctMatch ? parseInt(discountPctMatch[1], 10) : 0;

        const imgEl = el.querySelector("img.poly-component__picture") as any;
        const linkEl = el.querySelector("a.poly-component__title") as any;
        const href = linkEl?.href ?? "";

        const cleanHref = href.split("#")[0];
        let mlbId = "";
        let productUrl = "";

        const m1 = cleanHref.match(/\/p\/(MLB\d+)/);
        const m2 = cleanHref.match(/produto\.mercadolivre\.com\.br\/MLB-(\d+)-/);
        const m3 = href.match(/wid=(MLB\d+)/);

        if (m1) {
          mlbId = m1[1];
          productUrl = `https://www.mercadolivre.com.br/p/${mlbId}`;
        } else if (m2) {
          mlbId = `MLB${m2[1]}`;
          productUrl = cleanHref.split("?")[0];
        } else if (m3) {
          mlbId = m3[1];
          productUrl = `https://www.mercadolivre.com.br/p/${mlbId}`;
        }

        const ratingText = el.querySelector(".poly-reviews__rating, [class*='rating-number']")?.textContent?.trim() ?? "0";
        const reviewsText = el.querySelector(".poly-reviews__total, [class*='reviews__total']")?.textContent?.replace(/\D/g, "") ?? "0";

        return {
          title,
          currentPriceText,
          originalPriceText,
          discountPctDirect,
          image: imgEl?.src ?? "",
          mlbId,
          productUrl,
          rating: parseFloat(ratingText.replace(",", ".")) || 0,
          reviews: parseInt(reviewsText, 10) || 0,
        };
      })
    );

    const affiliateId = process.env.MERCADOLIVRE_AFFILIATE_ID ?? "";

    for (const item of items) {
      if (!item.mlbId || !item.currentPriceText || !isAnimeProduct(item.title)) continue;

      const currentPrice = parseBRPrice(item.currentPriceText);
      const originalPrice = item.originalPriceText ? parseBRPrice(item.originalPriceText) : undefined;
      if (!currentPrice) continue;

      const discount_pct = originalPrice && originalPrice > currentPrice
        ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
        : (item.discountPctDirect ?? 0);

      const separator = item.productUrl.includes("?") ? "&" : "?";
      const productUrl = affiliateId ? `${item.productUrl}${separator}matt_tool=${affiliateId}` : item.productUrl;

      const product: RawProduct = {
        source: "mercadolivre",
        source_id: item.mlbId,
        name: item.title,
        current_price: currentPrice,
        original_price: originalPrice,
        discount_pct,
        rating: item.rating,
        reviews: item.reviews,
        image_url: item.image,
        product_url: productUrl,
        category: detectCategory(item.title),
      };

      if (onBatch) {
        await onBatch([product]);
      } else {
        products.push(product);
      }
    }
  } catch (err) {
    logger.error(`[ML Scraping] Erro na busca "${query}":`, err);
  } finally {
    await context.close();
  }

  return products;
}

// =====================================================================
// Coletor principal
// =====================================================================

export async function collectFromMercadoLivre(onBatch?: (products: RawProduct[]) => Promise<void>): Promise<RawProduct[]> {
  const token = await getAccessToken();
  const allProducts: RawProduct[] = [];
  const seen = new Set<string>();

  if (token) {
    logger.info("[ML] Usando API autenticada (OAuth).");
    for (const query of SEARCH_QUERIES) {
      try {
        logger.info(`[ML] Buscando: "${query}"`);
        const products = await searchViaAPI(query, token);
        for (const p of products) {
          if (!seen.has(p.source_id)) { seen.add(p.source_id); allProducts.push(p); }
        }
        await sleep(600);
      } catch (err) {
        logger.error(`[ML] Erro na query "${query}":`, err);
      }
    }
  } else {
    logger.info("[ML] Sem credenciais OAuth. Usando scraping do site.");

    let chromium: any;
    try {
      const pw = await import("playwright");
      chromium = pw.chromium;
    } catch {
      logger.warn("[ML Scraping] Playwright não disponível.");
      return allProducts;
    }

    let browser: any;
    try {
      browser = await chromium.launch({ headless: true });
    } catch {
      logger.warn("[ML Scraping] Browser não disponível.");
      return allProducts;
    }

    const scrapeQueries = [
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
    ];
    for (const query of scrapeQueries) {
      try {
        logger.info(`[ML Scraping] Buscando: "${query}"`);
        const products = await searchViaScraping(browser, query, onBatch);
        for (const p of products) {
          if (!seen.has(p.source_id)) { seen.add(p.source_id); allProducts.push(p); }
        }
        await sleep(3000);
      } catch (err) {
        logger.error(`[ML Scraping] Erro:`, err);
      }
    }

    await browser.close();
  }

  logger.info(`[ML] Total coletado: ${allProducts.length} produtos`);
  return allProducts;
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
