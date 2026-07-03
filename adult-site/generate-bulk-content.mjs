/* ============================================
   PLEASUREHUB - Bulk Content Generator
   Gera 100+ vídeos com metadados realistas
   Uso: node generate-bulk-content.mjs
   ============================================ */

import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// === CONFIGURATION ===
const TOTAL_VIDEOS = 120;  // Quantidade total de vídeos
const OUTPUT_FILE = join(__dirname, 'js', 'data.js');

// === CATEGORIES ===
const CATEGORIES = [
  { id: 'milf', name: 'MILF', emoji: '🔥', color: '#ff2d5c' },
  { id: 'latina', name: 'Latina', emoji: '💃', color: '#e84393' },
  { id: 'amador', name: 'Amador', emoji: '📱', color: '#6c5ce7' },
  { id: 'hentai', name: 'Hentai', emoji: '🎨', color: '#fd79a8' },
  { id: 'lesbian', name: 'Lésbicas', emoji: '💋', color: '#e17055' },
  { id: 'brasileiras', name: 'Brasileiras', emoji: '🇧🇷', color: '#00b894' },
  { id: 'anal', name: 'Anal', emoji: '🔞', color: '#d63031' },
  { id: 'teen', name: '18+ Novinhas', emoji: '🌸', color: '#e84393' },
  { id: 'gangbang', name: 'Gang Bang', emoji: '🔥', color: '#e17055' },
  { id: 'solo', name: 'Solo / Masturbação', emoji: '✊', color: '#6c5ce7' },
  { id: 'casal', name: 'Casal Amador', emoji: '💑', color: '#00b894' },
  { id: 'fetish', name: 'Fetiche', emoji: '⛓️', color: '#2d3436' },
  { id: 'orgy', name: 'Suruba / Orgía', emoji: '🎉', color: '#e17055' },
  { id: 'trans', name: 'Trans', emoji: '⚧️', color: '#a29bfe' },
  { id: 'interracial', name: 'Interracial', emoji: '🌍', color: '#00cec9' },
  { id: 'cosplay', name: 'Cosplay', emoji: '🎭', color: '#fd79a8' },
];

// === TITLE GENERATORS (5+ títulos por categoria) ===
const TITLES = {
  milf: [
    'Vizinha MILF gostosa me chamou para tomar café',
    'MILF sarada do trabalho finalmente cedeu - Parte 2',
    'Professora MILF depois da aula particular - COMPLETO',
    'MILF coroa dando aula de massagem tântrica',
    'Encontrei minha madrasta MILF no chuveiro - Vazou',
    'MILF brasileira mais gostosa do OnlyFans - Completo',
    'MILF cavala rebolando de lingerie preta - HD',
    'Mamãe MILF querida do bairro - Filmado escondido',
    'MILF fogosa depois do divórcio - 40 anos fogosa',
    'MILF gostosa da academia - treino pesado - 4K',
    'MILF no motel com amante - cena completa',
    'Madrasta MILF pega enteado no flagra',
    'MILF cavala rebolando sentando gostoso',
    'Vou te ensinar tudo diz a MILF gostosa',
    'MILF mais gostosa da cidade - COMPLETO 4K',
    'Loira MILF gostosa no sigilo - filmado',
    'MILF gostosa exibicionista na praia',
    'MILF coroa fogosa no OnlyFans - Vazou completo',
    'MILF brasileira gostosa demais - Assista',
    'Duas MILFs gostosas com um sortudo',
  ],
  latina: [
    'Latina gostosa dançando funk - OnlyFans vazado',
    'Espanhola fogosa no carro - viagem para praia',
    'Colombiana mais gostosa do TikTok - COMPLETO',
    'Mexicana rebolando devagar de vestido vermelho',
    'Latina cavala no motel - noite inteira gravada',
    'Venezuelana miss fazendo strip-tease explícito',
    'Argentina do OnlyFans - melhor conteúdo 2025',
    'Latina tatuada dando aula de dança sensual',
    'Cubana gostosa na praia de nudismo - completa',
    'Porto-riquenha fogosa - melhor cena amadora',
    'Latina gostosa do Tinder - encontro real',
    'Colombiana fogosa rebolando até o chão',
    'Espanhola gostosa dançando funk - completa',
    'Mexicana cavala no onlyfans - vazou completo',
    'Latina tatuada transando gostoso - amador',
    'Argentina gostosa no motel - noite selvagem',
    'Venezuelana gostosa - melhor onlyfans latino',
    'Cubana fogosa na praia - cenas quentes',
    'Panamenha gostosa rebolando muito',
    'Chilena gostosa do onlyfans - completo HD',
  ],
  amador: [
    'Casal amador gravando pela primeira vez',
    'Webcam amadora - novinha se exibindo',
    'Vazou: Melhores momentos do onlyfans brasileiro',
    'Amador no sigilo - gravação completa caseira',
    'Exibicionismo na sacada - prédio movimentado',
    'Casal gordinho transando gostoso - completo',
    'Amador na natureza - transando no mato',
    'Namorados gravando escondido - câmera escondida',
    'Melhor vídeo amador brasileiro 2025',
    'Vizinha gostosa pela janela - filmado de longe',
    'Casal amador gravando no quarto - completo',
    'Webcam amadora brasileira - show particular',
    'Vazou: Namorados gravando - completo 4K',
    'Amador no motel - gravação completa',
    'Casal amador na cozinha - apanhados',
    'Exibicionista no carro - filmado no sigilo',
    'Melhores momentos amador - compilação 2025',
    'Amador brasileiro - transa completa caseira',
    'Casal amador pelado em casa - completo',
    'Primeira vez gravando - casal amador',
  ],
  hentai: [
    'Hentai 3D MILF Cavala - Animação Completa HD',
    'Hentai - Garota de Programa Robô - Episódio 4',
    'Hentai Futanari - Melhor Compilação 2025',
    'Hentai Élite da Escola - Cenas Quentes',
    'Anime Hentai - Shinobi Gostosa vs Monstro',
    'Hentai Harem - Uma Noite com 5 Garotas',
    'Hentai Tentáculo - Completo Dublado Pt-Br',
    'Hentai Yuri - Romance Lésbico Animado',
    'Hentai - Irmã Mais Nova Tarada - Episódio 2',
    'Hentai Milf Vizinha - Animação 4K HDR',
    'Hentai 3D - Garotas Lutadoras - Completo',
    'Hentai Futanari - A Vingança - Episódio 1',
    'Hentai Escola - Garotas Taradas - 4K HDR',
    'Hentai Harem - Todas para Mim - Completo',
    'Hentai Tentáculo 2 - A invasão - Dublado',
    'Hentai Yuri - Paixão Proibida - Animado',
    'Hentai Shinobi - Missão Perigosa - Completo',
    'Hentai MILF - Vizinha Tarada - Parte 3',
    'Hentai 3D Cavala - Animação Premium 4K',
    'Hentai Futanari Collection - 2 Horas',
  ],
  lesbian: [
    'Duas loiras gostosas no banho - completo HD',
    'Lésbicas se conhecendo no Tinder - encontro real',
    'Massagem tântrica entre amigas - vídeo completo',
    'Morena e loira no motel - melhor cena lésbica',
    'Lésbicas brasileiras - filmando para o OnlyFans',
    'Academia - personal trainer e aluna - cenas quentes',
    'Melhores amigas - descobrindo juntas - completo',
    'Lésbicas tatuadas - sessão de fotos quentes',
    'Garotas de programa - encontro entre amigas',
    'Lésbicas românticas - noite inteira gravada',
    'Duas amigas gostosas - diversão em casa',
    'Lésbicas brasileiras tatuadas - completo 4K',
    'Massagem entre amigas - vídeo completo HD',
    'Loiras gostosas transando - cena lésbica',
    'Morenas gostosas se divertindo - completo',
    'Lésbicas no chuveiro - cenas quentes HD',
    'Amigas íntimas - noite especial - completo',
    'Lésbicas românticas - amor entre mulheres',
    'Duas amigas e um vibrador - completo',
    'Lésbicas se amando - filme completo HD',
  ],
  brasileiras: [
    'Brasileira gostosa rebolando no funk - caiu na net',
    'Loira do onlyfans vazou - completo atualizado',
    'Brasileira cavala no sigilo - gravação amadora',
    'Morenaça do Tinder - encontro real gravado',
    'Brasileira fogosa - melhor onlyfans brasileiro 2025',
    'Paulista gostosa na praia de nudismo',
    'Carioca rebolando muito - melhor do Brasil',
    'Mineira tatuada do OnlyFans - completo HD',
    'Gaúcha gostosa no campo - vídeo amador',
    'Brasileira no sexo grupal - 3 caras 1 mina',
    'Loira gostosa do onlyfans - completo vazou',
    'Brasileira rebolando funk carioca - HD',
    'Paulista cavala no sigilo - filmado completo',
    'Carioca gostosa transando - amador caseiro',
    'Mineira fogosa no onlyfans - completo HD',
    'Baiana gostosa rebolando muito - completo',
    'Gaúcha gostosa no campo - cenas quentes',
    'Brasileira gostosa do Tinder - encontro real',
    'Carioca na praia de nudismo - filmado',
    'Brasileira fogosa no motel - noite selvagem',
  ],
  anal: [
    'Brasileira dando o cu gostoso - completo HD',
    'Anal amador - primeira vez dando o cu',
    'Morena gostosa sentando no pau - anal 4K',
    'Anal gostoso com brasileira fogosa - completo',
    'Loira dando o cu no motel - cena completa',
    'Anal só na ponta - brasileira gostosa',
    'Dando o cu gostoso para o namorado',
    'Anal selvagem - cavala rebolando no pau',
    'Cu gostoso - melhor anal brasileiro 2025',
    'Anal amador completo - filmado caseiro',
    'Brasileira dando o cu pela primeira vez',
    'Anal gostoso - morena cavala no motel',
    'Dando o cu no sigilo - gravação amadora',
    'Cu gostoso rebolando sentando fundo',
    'Anal 4K - brasileira gostosa demais',
    'Loira dando o cu gostoso - completo HD',
    'Anal selvagem - transa completa caseira',
    'Cu gostoso brasileiro - melhor cena 2025',
    'Morena dando o cu - filmado amador',
    'Anal só na ponta - completa 4K HDR',
  ],
  teen: [
    'Novinha gostosa de 18 anos - primeira vez',
    'Novinha do onlyfans - completa 4K HD',
    'Jovem gostosa se divertindo - amador',
    'Novinha rebolando muito - caiu na net',
    'Primeira vez da novinha - gravado completo',
    'Novinha gostosa do Tinder - encontro real',
    'Jovem de 18 anos - onlyfans completo',
    'Novinha fogosa - melhor conteúdo 2025',
    'Novinhas gostosas se divertindo juntas',
    'Primeira transa gravada - novinha 18 anos',
    'Novinha gostosa do onlyfans - vazou completo',
    'Jovem morena gostosa - filmado completo',
    'Novinha rebolando - caiu na internet',
    'Primeiras experiências - novinha 18 anos',
    'Novinha loira gostosa - completo HD',
    'Jovem fogosa - no sigilo completo',
    'Novinha do onlyfans - parte completa',
    'Gêmeas novinhas gostosas - completo',
    'Novinha morena tatuada - 4K completo',
    'Melhores novinhas 2025 - compilação',
  ],
  gangbang: [
    'Gang Bang brasileiro - 3 caras 1 mina',
    'Suruba completa - 5 caras 1 mina gostosa',
    'Gang Bang amador - brasileira no grupo',
    'Sexo grupal completo - orgia caseira',
    'Gang Bang onlyfans - gostosa no grupo',
    '3 caras 1 mina - completo amador',
    'Gang Bang selvagem - 4 caras 1 mina',
    'Suruba no sigilo - grupo completo',
    'Gang Bang brasileiro 4K - completo',
    'Mulher gostosa no gang bang - parte 1',
    'Gang Bang amador completo - HD',
    '5 caras 1 mina - no motel completo',
    'Suruba caseira - grupo gostoso completo',
    'Gang Bang onlyfans - vazou completo',
    'Brasileira no sexo grupal - gang bang',
    'Gang Bang completo - filmado amador',
    '3 caras 1 mina gostosa - noite inteira',
    'Suruba com 4 casais - orgia completa',
    'Gang Bang 4K - melhor cena grupal',
    'Brasileira no gang bang - completo HD',
  ],
  solo: [
    'Masturbação gostosa - novinha se tocando',
    'Solo no quarto - webcam particular',
    'Brasileira gozando sozinha - completa',
    'Masturbação com brinquedos - completo HD',
    'Solo na webcam - novinha gostosa',
    'Se tocando gostoso - filmado completo',
    'Masturbação feminina - orgasmo completo',
    'Brinquedos sexuais - novinha se divertindo',
    'Solo gostoso - brasileira no quarto',
    'Gozando sozinha - melhor cena solo',
    'Solo na banheira - completo relaxante',
    'Masturbação com vibrador - 4K completo',
    'Se tocando na cama - filmado completo',
    'Webcam solo - novinha gostosa demais',
    'Brasileira se masturbando - completo HD',
    'Solo completo - brinquedos sexuais 4K',
    'Gozando para o namorado - completo',
    'Masturbação gostosa - vídeo completo',
    'Solo no chuveiro - cenas quentes HD',
    'Se divertindo sozinha - completo amador',
  ],
  casal: [
    'Casal transando gostoso - completo amador',
    'Namorados gravando - cama quente',
    'Casal no motel - noite de amor completa',
    'Transa de casal apaixonado - HD completo',
    'Casal brasileiro transando - filmado caseiro',
    'Namorados no sigilo - gravação completa',
    'Casal gostoso transando - cenas quentes',
    'Marido e mulher - noite selvagem HD',
    'Casal amador transando - filmado escondido',
    'Love story - casal transando completo',
    'Casal na cama - transa gostosa completa',
    'Namorados apaixonados - noite completa',
    'Casal no sigilo - filmado no quarto',
    'Transa de casal brasileiro - HD completo',
    'Casal amador gostoso - completo 4K',
    'Marido e mulher - noite de amor HD',
    'Casal quente - transa completa filmada',
    'Namorados transando gostoso - caseiro',
    'Casal no motel - cenas completas HD',
    'Amor e tesão - casal completo 4K',
  ],
  fetish: [
    'BDSM completo - algemas e couro',
    'Fetiche brasileiro - dominatrix gostosa',
    'Algemas e chicote - sessão BDSM',
    'Fetiche amador - casal BDSM completo',
    'Dominação feminina - brasileira manda',
    'Fetiche com algemas - amador completo',
    'BDSM gostoso - casal fetichista',
    'Submissão total - sessão completa HD',
    'Fetiche brasileiro - algemas e vendas',
    'Couro e salto - dominatrix completa',
    'BDSM amador - casal fetichista 4K',
    'Fetiche com cordas - shibari completo',
    'Dominação feminina - sessão completa',
    'Algemas e chicote - brasileira BDSM',
    'Fetiche no porão - casal completo',
    'BDSM premium - dominatrix brasileira',
    'Submissão voluntária - completo HD',
    'Fetiche calçados - salto e meia',
    'Shibari brasileiro - cordas completo',
    'BDSM 4K - melhor sessão fetichista',
  ],
  orgy: [
    'Suruba completa com 4 casais',
    'Orgía amadora brasileira - grupo completo',
    'Suruba no motel - 4 casais trocando',
    'Orgía selvagem - 10 pessoas se divertindo',
    'Suruba caseira - amigos com benefícios',
    'Orgia amador - completa filmada HD',
    'Suruba brasileira - 3 casais trocando',
    'Orgía com 8 pessoas - noite louca',
    'Suruba no sigilo - grupo completo',
    'Orgía selvagem - completa 4K HDR',
    'Suruba de casais - troca de parceiros',
    'Orgía amadora brasileira - filmado',
    'Suruba completa - 5 casais no motel',
    'Orgía com 12 pessoas - noite louca',
    'Suruba no campo - natureza completa',
    'Orgía completa - troca de casais HD',
    'Suruba amador - filmado completo 4K',
    'Orgía na piscina - completo verão',
    'Suruba brasileira - completo HD',
    'Noite de orgia - 4 casais completo',
  ],
  trans: [
    'Trans gostosa rebolando - completa HD',
    'Travesti brasileira mais gostosa do onlyfans',
    'Mulher trans no motel - completo 4K',
    'Trans cavala rebolando sentando gostoso',
    'Travesti gostosa - melhor conteúdo 2025',
    'Trans brasileira - completa filmado HD',
    'Travesti do onlyfans - completo vazou',
    'Trans gostosa - cenas quentes completas',
    'Mulher trans tatuada - completo amador',
    'Travesti fogosa no sigilo - completo',
    'Trans morena gostosa - completo HD',
    'Travesti brasileira - cenas completas',
    'Trans no motel - noite inteira 4K',
    'Travesti gostosa rebolando - completo',
    'Mulher trans cavala - onlyfans vazou',
    'Trans loira gostosa - completo HD',
    'Travesti do Tinder - encontro real',
    'Trans gostosa demais - completa 4K',
    'Travesti tatuada - filmado completo',
    'Melhores trans brasileiras - compilação',
  ],
  interracial: [
    'Brasileira gostosa com gringo - completo HD',
    'Interracial amador - morena com loiro',
    'Gringo gostoso com brasileira - 4K completo',
    'Interracial no motel - completa filmado',
    'Brasileira com estrangeiro - cenas quentes',
    'Interracial amador - casal misto HD',
    'Morena gostosa com loiro - completo',
    'Gringo come brasileira - completo 4K',
    'Interracial no sigilo - completo amador',
    'Casal interracial transando - completo',
    'Brasileira e gringo - noite completa HD',
    'Interracial na praia - casal completo',
    'Morena e loiro transando - filmado',
    'Gringo gostoso com morena - 4K completo',
    'Casal interracial amador - completo HD',
    'Brasileira com americano - completo',
    'Interracial completo - cenas quentes',
    'Morena gostosa com gringo no motel',
    'Casal misto transando - completo HD',
    'Melhor interracial brasileiro 2025',
  ],
  cosplay: [
    'Cosplay adulto - personagem anime completo',
    'Fantasia erótica - enfermeira gostosa',
    'Cosplay onlyfans - personagem de game HD',
    'Fantasia completa - policial gostosa',
    'Cosplay brasileira - personagem famoso',
    'Fantasia erótica - estudante completa',
    'Cosplay 4K - personagem anime completo',
    'Fantasia de empregada - cenas quentes',
    'Cosplay amador - casal fantasiado HD',
    'Melhor cosplay adulto 2025 - completo',
    'Cosplay onlyfans - personagem anime 4K',
    'Fantasia erótica - professora gostosa',
    'Cosplay brasileiro - personagem de herói',
    'Fantasia completa - diabinha gostosa',
    'Cosplay 4K - personagem de jogo completo',
    'Fantasia de enfermeira - cena completa',
    'Cosplay amador - casal de anime HD',
    'Fantasia erótica - coelhinha completa',
    'Cosplay onlyfans - melhor fantasia 4K',
    'Personagem de anime - cosplay completo',
  ],
};

// === DURATION POOL ===
const DURATIONS = [
  '12:34', '18:22', '25:10', '08:45', '32:15',
  '15:40', '22:08', '45:30', '10:55', '60:00',
  '07:22', '28:45', '35:20', '14:18', '42:07',
  '06:55', '19:33', '51:12', '09:47', '38:40',
  '05:30', '16:15', '27:50', '11:22', '33:45',
  '09:10', '20:00', '40:25', '13:33', '55:30',
  '04:45', '17:50', '30:10', '14:55', '48:20',
  '08:22', '21:05', '36:40', '10:10', '52:15',
  '06:30', '24:20', '39:10', '12:45', '58:00',
  '07:15', '18:45', '29:30', '15:00', '44:50',
];

// === VIEWS POOL ===
const VIEWS = [
  '158K', '234K', '67K', '892K', '1.2M', '445K',
  '78K', '523K', '987K', '345K', '156K', '678K',
  '2.1M', '89K', '312K', '567K', '123K', '789K',
  '234K', '456K', '432K', '876K', '543K', '1.5M',
  '210K', '654K', '321K', '789K', '147K', '963K',
  '1.8M', '369K', '741K', '852K', '159K', '753K',
  '456K', '321K', '654K', '987K', '741K', '852K',
  '159K', '753K', '951K', '357K', '168K', '349K',
  '215K', '673K', '892K', '437K', '561K', '784K',
  '324K', '698K', '145K', '823K', '476K', '539K',
  '111K', '222K', '333K', '444K', '555K', '666K',
  '777K', '888K', '999K', '111K', '222K', '333K',
];

// === QUALITIES ===
const QUALITIES = ['HD', 'Full HD', '4K', 'Full HD', 'HD', '4K'];

// === TAGS ===
const TAG_POOLS = [
  ['brasileira', 'gostosa', 'onlyfans', 'vazou'],
  ['amador', 'caseiro', 'brasil', 'sigilo'],
  ['milf', 'coroa', 'gostosa', 'madura'],
  ['novinha', '18', 'primeira vez', 'amador'],
  ['latina', 'gostosa', 'rebolando', 'funk'],
  ['hentai', 'animado', '3d', 'desenho'],
  ['lesbicas', 'gostosas', 'romântico', 'amador'],
  ['brasileira', 'cavala', 'onlyfans', 'vazada'],
  ['transando', 'casal', 'amador', 'caseiro'],
  ['suruba', 'orgia', 'grupo', 'completo'],
  ['anal', 'cuzinho', 'gostoso', 'completo'],
  ['trans', 'travesti', 'gostosa', 'brasileira'],
  ['fetish', 'bdsm', 'algemas', 'dominação'],
  ['cosplay', 'fantasia', 'anime', 'personagem'],
  ['interracial', 'gringo', 'brasileira', 'misturado'],
  ['solo', 'masturbação', 'webcam', 'sozinha'],
];

// === EMBED URL PATTERNS BY PLATFORM ===
const EMBED_PATTERNS = [
  (id) => `https://www.xvideos.com/embedframe/xv${id}`,
  (id) => `https://www.pornhub.com/embed/ph${id}`,
  (id) => `https://www.xnxx.com/embedframe/xn${id}`,
  (id) => `https://xhamster.com/embed/xh_video_${id}`,
  (id) => `https://www.redtube.com/embed/rt${id}`,
];

// === MAIN GENERATOR ===
function generateVideos(count = TOTAL_VIDEOS) {
  const videos = [];
  const catIds = CATEGORIES.map(c => c.id);
  let id = 1;

  // Distribute videos evenly across categories
  const videosPerCategory = Math.ceil(count / catIds.length);

  catIds.forEach((catId) => {
    const titles = TITLES[catId] || [];
    for (let i = 0; i < videosPerCategory && id <= count; i++) {
      const titleIdx = i % titles.length;
      const hue = (id * 137.508) % 360;
      const embedFn = EMBED_PATTERNS[id % EMBED_PATTERNS.length];
      const videoId = String(id).padStart(6, '0');

      videos.push({
        id: id,
        title: titles[titleIdx],
        category: catId,
        duration: DURATIONS[Math.floor(Math.random() * DURATIONS.length)],
        views: VIEWS[Math.floor(Math.random() * VIEWS.length)],
        quality: QUALITIES[Math.floor(Math.random() * QUALITIES.length)],
        tags: TAG_POOLS[Math.floor(Math.random() * TAG_POOLS.length)],
        likes: Math.floor(Math.random() * 20000) + 500,
        dislikes: Math.floor(Math.random() * 600) + 5,
        date: generateRandomDate(),
        gradient: `linear-gradient(135deg, hsl(${hue}, 70%, 30%), hsl(${(hue + 40) % 360}, 60%, 20%))`,
        embedUrl: embedFn(videoId),
      });
      id++;
    }
  });

  console.log(`✅ Gerados ${videos.length} vídeos em ${catIds.length} categorias`);
  return videos;
}

function generateRandomDate() {
  const month = Math.floor(Math.random() * 5) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  return `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// === GENERATE DATA.JS ===
function generateDataJS(videos) {
  const counts = {};
  videos.forEach(v => {
    counts[v.category] = (counts[v.category] || 0) + 1;
  });

  const categoriesData = CATEGORIES.map((cat, idx) =>
    `    { id: '${cat.id}', name: '${cat.name}', emoji: '${cat.emoji}', count: ${counts[cat.id] || 0}, color: '${cat.color}' }`
  ).join(',\n');

  // Convert JSON to JS object literal syntax
  let formatted = JSON.stringify(videos, null, 2);
  
  // Convert to JS object syntax
  formatted = formatted
    .replace(/"id": /g, 'id: ')
    .replace(/"title": /g, 'title: ')
    .replace(/"category": /g, 'category: ')
    .replace(/"duration": /g, 'duration: ')
    .replace(/"views": /g, 'views: ')
    .replace(/"quality": /g, 'quality: ')
    .replace(/"tags": /g, 'tags: ')
    .replace(/"likes": /g, 'likes: ')
    .replace(/"dislikes": /g, 'dislikes: ')
    .replace(/"date": /g, 'date: ')
    .replace(/"gradient": /g, 'gradient: ')
    .replace(/"embedUrl": /g, 'embedUrl: ')
    ;

  const template = `/* ============================================
   PLEASUREHUB - Content Data
   Gerado automaticamente em ${new Date().toISOString().split('T')[0]}
   Total: ${videos.length} vídeos em ${CATEGORIES.length} categorias
   ============================================ */

const SITE_DATA = {
  categories: [
${categoriesData}
  ],

  videos: ${formatted},

  getVideosByCategory(categoryId) {
    if (!categoryId || categoryId === 'all') return this.videos;
    return this.videos.filter(v => v.category === categoryId);
  },

  getVideoById(id) {
    return this.videos.find(v => v.id === id);
  },

  getRelatedVideos(categoryId, excludeId, limit = 8) {
    return this.videos
      .filter(v => v.category === categoryId && v.id !== excludeId)
      .slice(0, limit);
  },

  getTrending(limit = 12) {
    return [...this.videos].sort((a, b) => {
      const viewsA = parseInt(String(a.views).replace(/[KM]/g, m => m === 'K' ? '000' : '000000'));
      const viewsB = parseInt(String(b.views).replace(/[KM]/g, m => m === 'K' ? '000' : '000000'));
      return viewsB - viewsA;
    }).slice(0, limit);
  },

  getLatest(limit = 8) {
    return this.videos.slice(0, limit);
  }
};
`;

  return template;
}

// === EXECUTE ===
console.log('🚀 PLEASUREHUB - Gerador de Conteúdo em Massa\n');
console.log(`📊 Gerando ${TOTAL_VIDEOS} vídeos em ${CATEGORIES.length} categorias...\n`);

const videos = generateVideos(TOTAL_VIDEOS);
const output = generateDataJS(videos);

writeFileSync(OUTPUT_FILE, output, 'utf-8');

// Print summary
console.log('\n📁 Arquivo gerado: js/data.js');
console.log('\n📋 RESUMO:');
const catCount = {};
videos.forEach(v => {
  catCount[v.category] = (catCount[v.category] || 0) + 1;
});
Object.entries(catCount).forEach(([cat, count]) => {
  const catInfo = CATEGORIES.find(c => c.id === cat);
  console.log(`   ${catInfo ? catInfo.emoji : '•'} ${catInfo ? catInfo.name : cat}: ${count} vídeos`);
});
console.log(`\n📊 Total: ${videos.length} vídeos`);
console.log('\n✅ Geração concluída!');
console.log('\n💡 DICA: Substitua os embedUrls no data.js por URLs reais usando a ferramenta admin/import.html');
