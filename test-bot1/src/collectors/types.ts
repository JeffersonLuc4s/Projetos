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

// Lista de títulos/franquias de anime/mangá usada em Amazon + ML
export const AMAZON_KEYWORDS = [
  "Haikyu!!", "Naruto Gold", "Naruto", "Boruto", "One Piece",
  "Demon Slayer", "Chainsaw Man", "Spy x Family", "Beastars",
  "Atelier of Witch Hat", "Soul Eater", "Neon Genesis Evangelion",
  "Fairy Tail", "Bleach", "Noragami", "Tokyo Ghoul", "Ataque dos Titãs",
  "Dr. Stone", "Food Wars", "The Promised Neverland", "Fire Force",
  "Moriarty: o Patriota", "Seraph of the End", "Akira", "Battle Angel Alita",
  "Death Note", "Hunter X Hunter", "Yu Yu Hakusho", "20th Century Boys",
  "Mob Psycho 100", "Bungo Stray Dogs", "Golden Kamuy", "Platinum End",
  "Bakuman", "Fullmetal Alchemist", "Slam Dunk", "Vagabond",
  "My Hero Academia", "Tokyo Revengers", "Edens Zero", "Shaman King",
  "Made in Abyss", "Frieren", "Blue Period", "Vinland Saga", "Black Clover",
  "Jujutsu Kaisen", "Black Butler", "Jojo's Bizarre Adventure", "Dragon Ball",
  "Blue Lock", "Solo Leveling", "Boa Noite Punpun", "Blue Exorcist",
  "Berserk", "The Seven Deadly Sins", "Sakamoto Days", "Pluto", "Hellsing",
  "Dandadan", "Overlord", "Fire Punch", "Hajime no Ippo", "Wind Breaker",
  "Look Back", "Pokémon", "One-Punch Man", "Record of Ragnarok", "Dororo",
  "Mushoku Tensei", "Cavaleiros do Zodíaco", "Alice in Borderland",
  "Parasyte", "Ao Ashi", "Kagurabachi", "Uzumaki", "Tomie", "Junji Ito",
  "Oshi no Ko", "Kaguya-sama", "Kaiju N.° 8", "Konosuba", "Sword Art Online",
  "Toradora", "No Game No Life", "Re:Zero", "Nana", "Orange", "Your Name",
  "Sailor Moon", "Inuyasha", "Skip & Loafer", "Cardcaptor Sakura",
  "Fruits Basket", "Madoka Magica",
];

// Lista de temas/franquias para buscar Funko Pops
export const FUNKO_KEYWORDS = [
  "Funko Pop One Piece", "Funko Pop Pokémon", "Funko Pop Naruto",
  "Funko Pop Demon Slayer", "Funko Pop Jujutsu Kaisen", "Funko Pop Dragon Ball",
  "Funko Pop Chainsaw Man", "Funko Pop Bleach", "Funko Pop My Hero Academia",
  "Funko Pop Frieren", "Funko Pop Ranma", "Funko Pop Inuyasha",
  "Funko Pop Boruto", "Funko Pop Spy x Family", "Funko Pop Solo Leveling",
  "Funko Pop Yu-Gi-Oh", "Funko Pop Kaiju", "Funko Pop Hunter x Hunter",
  "Funko Pop Marvel", "Funko Pop Star Wars", "Funko Pop Harry Potter",
  "Funko Pop Disney", "Funko Pop DC Comics", "Funko Pop Senhor dos Anéis",
  "Funko Pop Jurassic Park", "Funko Pop Meu Malvado Favorito", "Funko Pop Mágico de Oz",
  "Funko Pop Godzilla", "Funko Pop Como Treinar o Seu Dragão", "Funko Pop Smurfs",
  "Funko Pop Ninja Turtles", "Funko Pop Guerreiras do K-pop", "Funko Pop The Electric State",
  "Funko Pop Shrek", "Funko Pop Fantasmas Ainda se Divertem", "Funko Pop It a Coisa",
  "Funko Pop Família Addams", "Funko Pop Thunderbolts", "Funko Pop Diabo Veste Prada",
  "Funko Pop Avatar", "Funko Pop Rocky Balboa", "Funko Pop Pets",
  "Funko Pop Predador", "Funko Pop Ghostface", "Funko Pop Warner",
  "Funko Pop Poderoso Chefão", "Funko Pop Gremlins", "Funko Pop Dia dos Mortos",
  "Funko Pop Barbie", "Funko Pop World of Warcraft", "Funko Pop Universal Monster",
  "Funko Pop Ultraman", "Funko Pop Stranger Things", "Funko Pop Estranho Mundo de Jack",
  "Funko Pop Michael Jackson", "Funko Pop Halloween", "Funko Pop Gasparzinho",
  "Funko Pop Garfield", "Funko Pop Chucky", "Funko Pop Alien",
  "Funko Pop Noiva Cadáver", "Funko Pop Friends", "Funko Pop Casa do Dragão",
  "Funko Pop The Office", "Funko Pop Os Simpsons", "Funko Pop Succession",
  "Funko Pop League of Legends", "Funko Pop Fallout", "Funko Pop Clube das Winx",
  "Funko Pop Supernatural", "Funko Pop Mashle", "Funko Pop Dungeons Dragons",
  "Funko Pop Dan Da Dan", "Funko Pop Snoopy", "Funko Pop Sakamoto Days",
  "Funko Pop Ramona Flowers", "Funko Pop Metaphor Refantazio", "Funko Pop Kingdom Heart",
  "Funko Pop Brand Name", "Funko Pop Homem-Aranha", "Funko Pop Batman",
  "Funko Pop Deadpool", "Funko Pop Capitão América", "Funko Pop Thor",
  "Funko Pop Superman", "Funko Pop Homem de Ferro", "Funko Pop She-Hulk",
  "Funko Pop Adão Negro", "Funko Pop Doutor Estranho", "Funko Pop Pantera Negra",
  "Funko Pop Quarteto Fantástico", "Funko Pop Guardiões da Galáxia", "Funko Pop Flash",
  "Funko Pop Wandavision", "Funko Pop Aquaman", "Funko Pop Vingadores",
  "Funko Pop Freddy", "Funko Pop Hello Kitty", "Funko Pop Sonic",
  "Funko Pop NBA", "Funko Pop Lilo Stitch", "Funko Pop Encanto",
  "Funko Pop Attack on Titan", "Funko Pop Five Nights at Freddys", "Funko Pop Mortal Kombat",
  "Funko Pop The Last of Us", "Funko Pop Metal Gear", "Funko Pop Cuphead",
  "Funko Pop Diablo", "Funko Pop Baldur's Gate", "Funko Pop BTS",
  "Funko Pop Freddie Mercury", "Funko Pop Shakira", "Funko Pop Britney Spears",
  "Funko Pop Avril Lavigne", "Funko Pop Kiss", "Funko Pop P!nk",
  "Funko Pop Sabrina Carpenter", "Funko Pop Oasis", "Funko Pop AC/DC",
  "Funko Pop Iron Maiden", "Funko Pop Amy Winehouse", "Funko Pop BlackPink",
  "Funko Pop Guns n Roses", "Funko Pop Slipknot", "Funko Pop Bob Esponja",
  "Funko Pop Cartoon Network", "Funko Pop Cavaleiros do Zodíaco", "Funko Pop Monster High",
  "Funko Pop Futurama", "Funko Pop Padrinhos Mágicos", "Funko Pop She-ra",
  "Funko Pop Pantera Cor-de-Rosa", "Funko Pop Looney Tunes", "Funko Pop Frozen",
  "Funko Pop Princesas", "Funko Pop Jimmy Neutron", "Funko Pop Tom Jerry",
  "Funko Pop Ursinho Pooh", "Funko Pop Castlevania Noturno", "Funko Pop Tartarugas Ninja",
  "Funko Pop Moana", "Funko Pop Pato Donald", "Funko Pop Peter Pan",
  "Funko Pop Wish", "Funko Pop Enrolados", "Funko Pop Toy Story",
  "Funko Pop Meninas Superpoderosas", "Funko Pop Laboratório de Dexter", "Funko Pop Rei Leão",
  "Funko Pop Divertida Mente", "Funko Pop Up", "Funko Pop Zootopia",
  "Funko Pop Hora da Aventura", "Funko Pop Dumbo", "Funko Pop Dama e o Vagabundo",
  "Funko Pop Moranguinho", "Funko Pop Cinderela", "Funko Pop Branca de Neve",
  "Funko Pop Bela Adormecida", "Funko Pop Wall-e", "Funko Pop Coragem o Cão Covarde",
  "Funko Pop Pequena Sereia", "Funko Pop Bela e a Fera", "Funko Pop Monstros S.A.",
  "Funko Pop Rick Morty", "Funko Pop Grande Dragão Branco", "Funko Pop Juventude Transviada",
  "Funko Pop Saltburn", "Funko Pop Jogos Mortais", "Funko Pop The White Lotus",
  "Funko Pop Beavis Butt-Head", "Funko Pop Curtindo a Vida Adoidado", "Funko Pop John Wick",
  "Funko Pop Bridgerton", "Funko Pop Sexta-feira 13", "Funko Pop Exorcista",
  "Funko Pop Black Clover", "Funko Pop He-man", "Funko Pop Emily em Paris",
  "Funko Pop South Park", "Funko Pop Skibidi Toilet", "Funko Pop Ted Lasso",
  "Funko Pop Terrifier", "Funko Pop Xena", "Funko Pop Wicked",
  "Funko Pop Cantando na Chuva", "Funko Pop Cheech Chong", "Funko Pop Freira",
  "Funko Pop Queen", "Funko Pop Round 6", "Funko Pop E.T.",
  "Funko Pop Wonka", "Funko Pop Scooby Doo", "Funko Pop Massacre da Serra Elétrica",
  "Funko Pop Dr. House",
];

// Lista de autores de livros (fantasy, terror, clássicos, true crime, etc.)
export const BOOK_AUTHOR_KEYWORDS = [
  "A. G. Howard", "A.S. Webb", "Abby Jimenez", "Abigail Owen", "Adam Silvera",
  "Agatha Christie", "Aiden Thomas", "Akemi Dawn Dawn Bowman", "Alex Michaelides",
  "Alexandra Bracken", "Alexandra Christo", "Alexandre Dumas", "Alexene Farol Follmuth",
  "Alexis Henderson", "Ali Hazelwood", "Alice Oseman", "Allison Saft",
  "Aluisio de Azevedo", "Álvares de Azevedo", "Alwyn Hamilton", "Amber Hamilton",
  "Amélie Wen Zhao", "Amie Kaufman", "Ana Huang", "Andrew Pyper", "Andy Weir",
  "Ann C. Wolbert Burgess", "Ann Liang", "Ann Rule", "Anne Frank", "Anne Rice",
  "Antoine de Saint-Exupéry", "Arin Murphy-Hiscock", "Arnold Van de Laar",
  "Ashley Poston", "Autumn Woods", "Ava Reid", "Ayana Grey", "Bal Khabra",
  "Barbara Yelin", "Becca Fitzpatrick", "Becky Chambers", "Benjamin Alire Sáenz",
  "Beth O'Leary", "Blake Crouch", "Bram Stoker", "Brandon Sanderson", "Bret Easton Ellis",
  "Brigid Kemmerer", "Brittainy C. Cherry", "Brittainy Cherry", "Brynne Weaver",
  "C. J. Tudor", "C.S. Lewis", "C.S. Pacat", "Caitlin Doughty", "Caitlín R. Kiernan",
  "Callie Hart", "Carina Rissi", "Carissa Broadbent", "Carla Madeira", "Carol Chiovatto",
  "Casey McQuiston", "Cassandra Clare", "Catharina Maura", "Catherine Ryan Hyde",
  "Cathryn Kemp", "Cesar Bravo", "Charles Addams", "Charles Dickens", "Charlie Donlea",
  "Charlotte Gordon", "Chloe Gong", "Chloe Walsh", "Christelle Dabos",
  "Cinda Williams Chima", "Clarice Lispector", "Clive Barker", "Colin Meloy",
  "Colleen Hoover", "Constance Sayers", "Cornelia Funke", "Cressida Cowell",
  "Damion Searls", "Dani Francis", "Daniel Defoe", "Daniela Arbex", "Danielle L. Jensen",
  "Danya Kukafka", "Demi Winters", "Devney Perry", "Diana Gabaldon", "Diana Wynne Jones",
  "Donna Barba Higuera", "Dr. Vincent Di Maio", "E. J. Mellow", "E. Lockhart",
  "Edgar Allan Poe", "Eleanor H. Porter", "Elena Armas", "Elise Kova", "Elizabeth Helen",
  "Elizabeth Lim", "Elle Kennedy", "Elsie Silver", "Emily Brontë", "Emily Henry",
  "Emily Thiede", "Emily Varga", "Emma Lord", "Erika Johansen", "Erin A. Craig",
  "Erin Beaty", "Erin Morgenstern", "Ernest Cline", "Eurípides", "F. Scott Fitzgerald",
  "F.T. Lukens", "Faridah Àbíké-Íyímídé", "Fiódor Dostoiévski", "Fonda Lee",
  "Frances Hardinge", "Frances Hodgson Burnett", "Frank Herbert", "Franz Kafka",
  "Freida McFadden", "Freya Marske", "Gareth Hanrahan", "Gary Brucato", "Gary Kinder",
  "Gary Whitta", "Gaston Leroux", "Genevieve Cogman", "Genevieve Gornichec",
  "George Orwell", "George R. R. Martin", "Gerald Brittle", "Gillian Flynn",
  "Graciliano Ramos", "Gregg Olsen", "Hafsah Faizal", "Hannah Bonam-Young",
  "Hannah Grace", "Hannah Kaner", "Hannah Nicole Maehrer", "Hannah Whitten",
  "Hans Christian Andersen", "Hanya Yanagihara", "Harlan Coben", "Harold Schechter",
  "Harper Lee", "Holly Black", "Holly Jackson", "Howard Pyle", "I. V. Marie",
  "Ilana Casoy", "Imani Erriu", "Irmãos Grimm", "J.K. Rowling", "J. M. Barrie",
  "J. R. R. Tolkien", "J.R.R. Tolkien", "Jack Ketchum", "Jack London", "Jacob Grimm",
  "James Kahn", "Jane Austen", "Jay Anson", "Jay Kristoff", "Jaysea Lynn",
  "Jeff Guinn", "Jeanne Marie Leprince de Beaumont", "Jenna Evans Welch", "Jenna Levine",
  "Jennette McCurdy", "Jennifer L. Armentrout", "Jennifer Lynn Barnes",
  "Jennifer Niven", "Jennifer Wright", "Jenny Han", "Jo Nesbø", "Joël Dicker",
  "John Boyne", "John Fowles", "John Green", "John Gwynne", "John Michael Greer",
  "John Scalzi", "Jojo Moyes", "Jordan Stephanie Gray", "José de Alencar",
  "Josiah Bancroft", "Judy I. Lin", "Julia Johnson", "Julia Quinn", "Julie Berry",
  "Julie Soto", "Juliet Marillier", "K. L. Armstrong", "K. M. Moronova", "Kalie Cassidy",
  "Kalynn Bayron", "Kamilah Cole", "Karen M. McManus", "Karen Wynn Fonstad",
  "Karin Slaughter", "Kass Morgan", "Kate Clarke", "Kate Golden", "Katee Robert",
  "Kathryn Purdie", "Keith Donohue", "Ken Englade", "Kendare Blake", "Kennedy Raven",
  "Kerri Maniscalco", "Kiera Azar", "Kiera Cass", "Kiersten White", "Kristen Ciccarelli",
  "Kristy Boyce", "Kritika H. Rao", "L. Frank Baum", "L. K. Steven", "Laini Taylor",
  "Lana Ferguson", "Laura Purcell", "Laura Sebastian", "Lauren Asher", "Lauren Kate",
  "Lauren Roberts", "Leia Stone", "Leigh Bardugo", "Leslie Wolfe", "Leticia Wierzchowski",
  "Lewis Carroll", "Linda Bailey", "Lisa Gardner", "Lisa Kleypas", "Lisa Maxwell",
  "Liza Palmer", "Luciano Lamberti", "Lucy Foley", "Lydia Kang", "Lyla Sage",
  "Lynette Noni", "Lynn Painter", "Lyssa Kay Adams", "M. L. Rio", "M. L. Wang",
  "Machado de Assis", "Mackenzi Lee", "Madeleine L'Engle", "Maggie Stiefvater",
  "Margaret Atwood", "Margaret Owen", "Margaret Rogerson", "Mariana Zapata",
  "Marie Lu", "Marissa Meyer", "Mark Lawrence", "Mark Twain", "Markus Zusak",
  "Mary Lynn Bracht", "Mary Shelley", "Mary Turner Thomson", "Matt Haig",
  "Maureen Callahan", "Maureen Johnson", "Maureen Orth", "Maurene Goo", "Meg Cabot",
  "Melissa Albert", "Melissa Bashardoust", "Melissa Grey", "Mendal W. Johnson",
  "Michelle Hodkin", "Miguel de Cervantes", "Morgan Rhodes", "N. K. Jemisin",
  "Namina Forna", "Naomi Alderman", "Naomi Novik", "Natasha Kampusch", "Nate Pedersen",
  "Nathaniel Hawthorne", "Neal Shusterman", "Neil Gaiman", "Nicholas Pileggi",
  "Nikita Gill", "Nisha J. Tuli", "Nnedi Okorafor", "Octavia E. Butler",
  "Olivia Rose Darling", "Olivie Blake", "P. L. Travers", "Pascale Lacelle",
  "Patrick Rothfuss", "Patti McCracken", "Peer Meter", "Philip K. Dick", "R.F. Kuang",
  "R.M. Gray", "Rachel Gillig", "Rachel Hawkins", "Rachel Reid", "Rachel Schneider",
  "Rainbow Rowell", "Raphael Montes", "Raven Kennedy", "Ray Bradbury",
  "Rebecca Robinson", "Rebecca Ross", "Rebecca Yarros", "Richard Chizmar",
  "Richard Gordon Smith", "Richelle Mead", "Rick Riordan", "Riley Sager", "Rina Kent",
  "Roald Dahl", "Robert Bloch", "Robert Bryndza", "Robert Curran",
  "Robert Jackson Bennett", "Robert Jordan", "Robert K. Ressler", "Robert L. Stevenson",
  "Robert Louis Stevenson", "Ronald Hutton", "Rory Power", "Roshani Chokshi",
  "Rudyard Kipling", "S. A. Chakraborty", "S. F. Williamson", "Saara El-Arifi",
  "Sabaa Tahir", "Sable Sorensen", "Samantha Shannon", "Sara Holland",
  "Sarah A. Parker", "Sarah Adams", "Sarah J. Maas", "Sarah Penner", "Sarah Tolcser",
  "Sasha Peyton Smith", "SenLinYu", "Shannon Mayer", "Shelby Mahurin", "Socorro Acioli",
  "Soman Chainani", "Sophie Anderson", "Sophie Kim", "Stacia Stark", "Stephanie Archer",
  "Stephanie Garber", "Stephen King", "Stephenie Meyer", "Steven Matthew Constantine",
  "Sue Lynn Tan", "Susan Dennard", "Suzanne Collins", "Svetlana Aleksiévitch",
  "T. J. Klune", "Tabitha Suzuma", "Tahereh Mafi", "Taisia Kitaiskaia", "Talia Hibbert",
  "Tasha Suri", "Taylor Jenkins Reid", "Teri Terry", "Tessa Dare", "Thea Guanzon",
  "Tolstói", "Tom Shachtman", "Tomi Adeyemi", "Toni Cade Bambara", "Toni Maguire",
  "Tracy Banghart", "Tracy Deonn", "Tricia Levenseller", "Truman Capote", "Veronica Roth",
  "Victor Hugo", "Victoria Aveyard", "Victoria Schwab", "V. E. Schwab", "Virginia Woolf",
  "William Shakespeare", "Won-pyung Sohn", "Xiran Jay Zhao", "Yangsze Choo",
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

export function isFunkoProduct(name: string): boolean {
  const lower = name.toLowerCase();
  if (BLOCKLIST.some(kw => lower.includes(kw))) return false;
  return lower.includes("funko");
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

export function detectCategory(name: string): string | undefined {
  const lower = name.toLowerCase();
  if (MANGA_KEYWORDS.some(kw => lower.includes(kw))) return "manga";
  if (FIGURE_KEYWORDS.some(kw => lower.includes(kw))) return "figure";
  return undefined;
}
