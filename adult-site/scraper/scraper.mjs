/* ============================================
   PLEASUREHUB - Auto Scraper System v1.0
   Raspagem automática de URLs de embed de múltiplas fontes
   
   Fontes primárias:
   - Eporner API (pública, sem autenticação)
   - Feeds de sites parceiros
   
   Uso: 
     node scraper/scraper.mjs --bulk=1000   (gerar 1000 vídeos)
     node scraper/scraper.mjs --daily=2      (adicionar 2 vídeos)
     node scraper/scraper.mjs --help         (ajuda)
   ============================================ */

import { writeFileSync, readFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Verificar Node.js 18+ (fetch API)
if (typeof fetch !== 'function') {
  console.error('❌ ERRO: Node.js 18+ é necessário para o scraper.');
  console.error('   Versão atual: ' + process.version);
  console.error('   Atualize com: npm install -g n && n 18');
  process.exit(1);
}
const DATA_FILE = join(ROOT, 'js', 'data.js');
const STATE_FILE = join(__dirname, 'state.json');
const LOG_FILE = join(__dirname, 'scraper.log');
const CACHE_FILE = join(__dirname, 'cache.json');

// ============================================
// CONFIGURAÇÃO
// ============================================

const CONFIG = {
  // Eporner API
  EPORNER: {
    SEARCH_URL: 'https://www.eporner.com/api/v2/video/search/',
    PER_PAGE: 100,  // max por página
    MAX_PAGES_BULK: 10,  // páginas para inicialização bulk
  },
  
  // Feed-based sources (RSS/feeds públicos)
  FEEDS: [
    // Eporner feed by category
    { name: 'Eporner Top', url: 'https://www.eporner.com/api/v2/video/search/?query=&order_by=top&per_page=50&page=1' },
    { name: 'Eporner Latest', url: 'https://www.eporner.com/api/v2/video/search/?query=&order_by=latest&per_page=50&page=1' },
    { name: 'Eporner Longest', url: 'https://www.eporner.com/api/v2/video/search/?query=&order_by=longest&per_page=50&page=1' },
  ],

  // Palavras-chave para associar categorias do Eporner às do PleasureHub
  CATEGORY_MAP: {
    // Eporner category keywords → PleasureHub category
    'milf': ['milf', 'mature', 'mom', 'mother', 'housewife', 'cougar', '40+', '50+', 'granny', 'old'],
    'latina': ['latina', 'spanish', 'mexican', 'cuban', 'colombian', 'argentinian', 'chilean', 'peruvian', 'brazil'],
    'amador': ['amateur', 'homemade', 'webcam', 'camming', 'verified couples', 'real', 'vlog'],
    'hentai': ['hentai', 'anime', 'cartoon', '3d', 'animated', 'manga', 'futanari', 'tentacle', 'drawn', 'fantasy'],
    'lesbian': ['lesbian', 'girl on girl', 'homemade', 'babe', 'romantic'],
    'brasileiras': ['brazilian', 'brazil', 'latin'],
    'anal': ['anal', 'ass', 'anal creampie', 'anal fuck', 'butt', 'dp', 'double penetration'],
    'teen': ['teen', '18', 'young', 'adolescent', 'college', 'student', 'barely legal'],
    'gangbang': ['gangbang', 'gang bang', 'group', 'orgy', 'bukkake', 'dp', 'double penetration'],
    'solo': ['solo', 'masturbation', 'finger', 'dildo', 'vibrator', 'solo girl', 'solo male'],
    'casal': ['couple', 'homemade', 'romantic', 'passion', 'lovers'],
    'fetish': ['fetish', 'bdsm', 'bondage', 'domination', 'submission', 'latex', 'leather', 'shibari', 'kink', 'foot', 'boots'],
    'orgy': ['orgy', 'group', 'gangbang', 'swingers', 'bukkake'],
    'trans': ['trans', 'transgender', 'transsexual', 'shemale', 'ladyboy', 'tranny', 'ts'],
    'interracial': ['interracial', 'black', 'white', 'bbc', 'bwc', 'mixed'],
    'cosplay': ['cosplay', 'costume', 'roleplay', 'fantasy', 'superhero', 'disney', 'parody'],
  },

  // Categorias padrão para fallback
  FALLBACK_CATEGORIES: ['milf', 'amador', 'latina', 'brasileiras', 'anal', 'lesbian', 'hentai', 'teen'],
};

// ============================================
// LOGGING
// ============================================

function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${type}] ${message}`;
  console.log(line);
  try {
    appendFileSync(LOG_FILE, line + '\n');
  } catch(e) {}
}

// ============================================
// HTTP FETCH (com retry e rate limiting)
// ============================================

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          ...(options.headers || {}),
        },
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        log(`HTTP ${response.status} para ${url}`, 'WARN');
        continue;
      }
      
      return response;
    } catch (err) {
      log(`Erro na tentativa ${attempt + 1}/${retries}: ${err.message}`, 'WARN');
      if (attempt < retries - 1) {
        await sleep(2000 * (attempt + 1)); // backoff
      }
    }
  }
  throw new Error(`Falha após ${retries} tentativas: ${url}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// STATE MANAGEMENT
// ============================================

function loadState() {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch(e) {}
  return { 
    totalScraped: 0,
    lastRun: null,
    lastVideoId: 120, // continuar do último ID gerado
    videosSeen: [],   // IDs de embed já vistos para evitar duplicatas
    dailyAdded: 0,
    dailyDate: null,
  };
}

function saveState(state) {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch(e) {
    log(`Erro ao salvar state: ${e.message}`, 'ERROR');
  }
}

function loadCache() {
  try {
    if (existsSync(CACHE_FILE)) {
      return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    }
  } catch(e) {}
  return { seenEmbeds: [] };
}

function saveCache(cache) {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch(e) {}
}

// ============================================
// CURRENT DATA LOADER
// ============================================

function loadCurrentData() {
  if (!existsSync(DATA_FILE)) {
    return { videos: [], nextId: 1 };
  }
  
  try {
    const content = readFileSync(DATA_FILE, 'utf-8');
    // Extrair vídeos atuais avaliando o SITE_DATA (regex flexível para ambos os formatos)
    const match = content.match(/videos:\s*\[([\s\S]*?)\],/);
    if (match) {
      // Parse aproximado para contar (aceita qq estilo de aspas)
      const videoMatches = content.match(/\{[\s\S]*?id:\s*(\d+)[\s\S]*?\}/g);
      if (videoMatches) {
        const ids = videoMatches.map(m => {
          const idMatch = m.match(/id:\s*(\d+)/);
          return idMatch ? parseInt(idMatch[1]) : 0;
        }).filter(id => id > 0);
        
        const maxId = Math.max(...ids, 0);
        return { videos: videoMatches, nextId: maxId + 1 };
      }
    }
  } catch(e) {}
  
  return { videos: [], nextId: 1 };
}

// ============================================
// EPORNER API SCRAPER
// ============================================

async function scrapeEpornerByQuery(query = '', page = 1, perPage = 50) {
  const url = `${CONFIG.EPORNER.SEARCH_URL}?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&order_by=latest&format=json`;
  
  try {
    const response = await fetchWithRetry(url);
    const data = await response.json();
    
    if (!data || !data.videos) {
      log(`Resposta vazia do Eporner para query="${query}" page=${page}`, 'WARN');
      return [];
    }
    
    log(`Eporner: ${data.videos.length} vídeos para query="${query}" page=${page} (total: ${data.total_count || '?'})`);
    return data.videos;
  } catch (err) {
    log(`Erro ao raspar Eporner: ${err.message}`, 'ERROR');
    return [];
  }
}

// ============================================
// CATEGORY CLASSIFIER
// ============================================

function classifyCategory(epornerCategory, title, tags = []) {
  const text = `${epornerCategory || ''} ${title || ''} ${(tags || []).join(' ')}`.toLowerCase();
  const scores = {};
  
  // Calcular score para cada categoria
  for (const [phCategory, keywords] of Object.entries(CONFIG.CATEGORY_MAP)) {
    scores[phCategory] = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) {
        scores[phCategory] += kw.length; // peso por tamanho da keyword
      }
    }
  }
  
  // Encontrar categoria com maior score
  let bestCategory = CONFIG.FALLBACK_CATEGORIES[Math.floor(Math.random() * CONFIG.FALLBACK_CATEGORIES.length)];
  let bestScore = 0;
  
  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }
  
  // Se nenhuma categoria teve match, distribuir uniformemente
  if (bestScore === 0) {
    bestCategory = CONFIG.FALLBACK_CATEGORIES[Math.floor(Math.random() * CONFIG.FALLBACK_CATEGORIES.length)];
  }
  
  return bestCategory;
}

// ============================================
// VIDEO DATA TRANSFORMER
// ============================================

const QUALITIES = ['HD', 'Full HD', '4K'];
const TAG_POOLS = [
  ['brasileira', 'gostosa', 'onlyfans', 'vazou'],
  ['amador', 'caseiro', 'brasil', 'sigilo'],
  ['milf', 'coroa', 'gostosa', 'madura'],
  ['novinha', '18', 'primeira vez', 'amador'],
  ['latina', 'gostosa', 'rebolando', 'funk'],
  ['hentai', 'animado', '3d', 'desenho'],
  ['lesbicas', 'gostosas', 'romântico', 'amador'],
  ['transando', 'casal', 'amador', 'caseiro'],
  ['anal', 'cuzinho', 'gostoso', 'completo'],
  ['trans', 'travesti', 'gostosa', 'brasileira'],
  ['fetish', 'bdsm', 'algemas'],
  ['cosplay', 'fantasia', 'anime'],
  ['interracial', 'gringo', 'misturado'],
  ['solo', 'masturbação', 'webcam'],
  ['suruba', 'orgia', 'grupo'],
];

const VIEW_POOL = [
  '158K', '234K', '67K', '892K', '1.2M', '445K', '78K', '523K', 
  '987K', '345K', '156K', '678K', '2.1M', '89K', '312K', '567K',
  '123K', '789K', '234K', '456K', '1.5M', '654K', '321K', '876K',
  '432K', '963K', '741K', '852K', '159K', '753K', '951K', '357K',
];

const DURATION_POOL = [
  '08:22', '12:34', '15:40', '18:22', '22:08', '25:10', '28:45',
  '32:15', '35:20', '38:40', '42:07', '45:30', '48:20', '51:12',
  '55:30', '60:00', '10:15', '14:45', '20:30', '30:00',
];

function transformEpornerVideo(epVideo, nextId, seenEmbeds) {
  const embedUrl = `https://www.eporner.com/embed/${epVideo.id}`;
  
  // Evitar duplicatas
  if (seenEmbeds.includes(embedUrl)) return null;
  
  const hue = (nextId * 137.508) % 360;
  const category = classifyCategory(epVideo.category, epVideo.title, epVideo.tags);
  
  // Formatar duração
  let duration = epVideo.duration || DURATION_POOL[Math.floor(Math.random() * DURATION_POOL.length)];
  if (typeof duration === 'number') {
    const mins = Math.floor(duration / 60);
    const secs = Math.floor(duration % 60);
    duration = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  
  // Formatar views
  let views = epVideo.views || VIEW_POOL[Math.floor(Math.random() * VIEW_POOL.length)];
  if (typeof views === 'number') {
    views = views >= 1000000 
      ? `${(views / 1000000).toFixed(1)}M`
      : views >= 1000 
        ? `${Math.floor(views / 1000)}K`
        : String(views);
    if (views.endsWith('.0M')) views = views.replace('.0M', 'M');
    if (views.endsWith('.0K')) views = views.replace('.0K', 'K');
  }
  
  // Data
  let date = epVideo.added || new Date().toISOString().split('T')[0];
  if (date.includes(' ')) date = date.split(' ')[0];
  if (date.length > 10) date = date.substring(0, 10);
  
  return {
    id: nextId,
    title: epVideo.title,
    category: category,
    duration: duration,
    views: String(views).replace(/\.0([KM])/, '$1'),
    quality: QUALITIES[Math.floor(Math.random() * QUALITIES.length)],
    tags: TAG_POOLS[Math.floor(Math.random() * TAG_POOLS.length)],
    likes: Math.floor(Math.random() * 20000) + 500,
    dislikes: Math.floor(Math.random() * 600) + 5,
    date: date,
    gradient: `linear-gradient(135deg, hsl(${hue}, 70%, 30%), hsl(${(hue + 40) % 360}, 60%, 20%))`,
    embedUrl: embedUrl,
  };
}

// ============================================
// DATA.JS GENERATOR
// ============================================

function generateDataJS(videos, existingContent = null) {
  // Se já existe um data.js, tentar preservar funções e estrutura
  if (existingContent) {
    const match = existingContent.match(/(getVideosByCategory[\s\S]*)$/);
    if (match) {
      return generateWithTemplate(videos) + '\n\n' + match[0];
    }
  }
  
  return generateWithTemplate(videos);
}

function generateWithTemplate(videos) {
  // Contar por categoria
  const counts = {};
  videos.forEach(v => {
    counts[v.category] = (counts[v.category] || 0) + 1;
  });

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

  const categoriesData = CATEGORIES.map(cat =>
    `    { id: '${cat.id}', name: '${cat.name}', emoji: '${cat.emoji}', count: ${counts[cat.id] || 0}, color: '${cat.color}' }`
  ).join(',\n');

  // Converter vídeos para JS literal
  const videosJS = videos.map(v => {
    return `  {\n    id: ${v.id},\n    title: ${JSON.stringify(v.title)},\n    category: '${v.category}',\n    duration: '${v.duration}',\n    views: '${v.views}',\n    quality: '${v.quality}',\n    tags: ${JSON.stringify(v.tags)},\n    likes: ${v.likes},\n    dislikes: ${v.dislikes},\n    date: '${v.date}',\n    gradient: '${v.gradient}',\n    embedUrl: '${v.embedUrl}'\n  }`;
  }).join(',\n');

  return `/* ============================================
   PLEASUREHUB - Content Data
   Gerado automaticamente pelo scraper em ${new Date().toISOString().split('T')[0]}
   Total: ${videos.length} vídeos
   Fonte: Eporner API (embed URLs reais)
   ============================================ */

const SITE_DATA = {
  categories: [
${categoriesData}
  ],

  videos: [
${videosJS}
  ],

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
}

// ============================================
// BULK SCRAPER
// ============================================

async function runBulkScrape(targetCount = 1000) {
  log(`🚀 INICIANDO SCRAPE EM MASSA: ${targetCount} vídeos`);
  
  const state = loadState();
  const cache = loadCache();
  const seenEmbeds = [...(cache.seenEmbeds || [])];
  
  let allVideos = [];
  let nextId = state.lastVideoId;
  let totalFetched = 0;
  
  // Queries para buscar variedade de conteúdo
  const queries = [
    { q: 'milf', weight: 2 },
    { q: 'amateur', weight: 2 },
    { q: 'latina', weight: 1.5 },
    { q: 'brazilian', weight: 2 },
    { q: 'lesbian', weight: 1.5 },
    { q: 'anal', weight: 1.5 },
    { q: 'teen', weight: 1 },
    { q: 'hentai', weight: 1 },
    { q: 'trans', weight: 1 },
    { q: 'solo', weight: 1 },
    { q: 'cosplay', weight: 0.5 },
    { q: 'interracial', weight: 1 },
    { q: 'gangbang', weight: 0.5 },
    { q: 'orgy', weight: 0.5 },
    { q: 'bdsm', weight: 0.5 },
    { q: 'fetish', weight: 0.5 },
    { q: 'masturbation', weight: 1 },
    { q: 'couple', weight: 1.5 },
    { q: 'homemade', weight: 1.5 },
    { q: 'webcam', weight: 1 },
    { q: '3d', weight: 0.5 },
    { q: 'cartoon', weight: 0.5 },
  ];
  
  // Calcular total de páginas baseado no target
  const totalPages = Math.ceil(targetCount / CONFIG.EPORNER.PER_PAGE);
  const pagesPerQuery = Math.ceil(totalPages / queries.length) + 1;
  
  for (const query of queries) {
    if (allVideos.length >= targetCount) break;
    
    const pagesForQuery = Math.ceil(pagesPerQuery * query.weight);
    
    for (let page = 1; page <= pagesForQuery; page++) {
      if (allVideos.length >= targetCount) break;
      
      log(`📡 Buscando: "${query.q}" página ${page}/${pagesForQuery}`);
      
      const epVideos = await scrapeEpornerByQuery(query.q, page, CONFIG.EPORNER.PER_PAGE);
      
      if (epVideos.length === 0) break; // sem mais resultados
      
      totalFetched += epVideos.length;
      
      for (const epVideo of epVideos) {
        if (allVideos.length >= targetCount) break;
        
        const video = transformEpornerVideo(epVideo, nextId, seenEmbeds);
        if (video) {
          allVideos.push(video);
          seenEmbeds.push(video.embedUrl);
          nextId++;
        }
      }
      
      // Rate limiting
      await sleep(1500);
    }
  }
  
  // Se não atingiu o target com queries específicas, buscar feed geral
  if (allVideos.length < targetCount) {
    log(`⚠️ Atingiu ${allVideos.length}/${targetCount}. Buscando feed geral...`);
    
    for (let page = 1; page <= 20 && allVideos.length < targetCount; page++) {
      const epVideos = await scrapeEpornerByQuery('', page, CONFIG.EPORNER.PER_PAGE);
      if (epVideos.length === 0) break;
      
      for (const epVideo of epVideos) {
        if (allVideos.length >= targetCount) break;
        const video = transformEpornerVideo(epVideo, nextId, seenEmbeds);
        if (video) {
          allVideos.push(video);
          seenEmbeds.push(video.embedUrl);
          nextId++;
        }
      }
      await sleep(1500);
    }
  }
  
  // Salvar cache e state
  cache.seenEmbeds = seenEmbeds.slice(-10000); // manter últimos 10000
  saveCache(cache);
  
  state.totalScraped += allVideos.length;
  state.lastRun = new Date().toISOString();
  state.lastVideoId = nextId;
  saveState(state);
  
  // Gerar data.js
  const output = generateDataJS(allVideos);
  writeFileSync(DATA_FILE, output, 'utf-8');
  
  log(`\n✅ SCRAPE CONCLUÍDO!`);
  log(`📊 Total fetched da API: ${totalFetched}`);
  log(`📊 Total vídeos inseridos: ${allVideos.length}`);
  log(`📁 Arquivo: ${DATA_FILE}`);
  log(`📋 Próximo ID disponível: ${nextId}`);
  
  // Estatísticas por categoria
  const catCount = {};
  allVideos.forEach(v => {
    catCount[v.category] = (catCount[v.category] || 0) + 1;
  });
  log('\n📊 Distribuição por categoria:');
  for (const [cat, count] of Object.entries(catCount).sort((a, b) => b[1] - a[1])) {
    log(`   ${cat}: ${count} vídeos`);
  }
  
  return allVideos;
}

// ============================================
// DAILY UPDATER (2 novos vídeos)
// ============================================

async function runDailyUpdate(count = 2) {
  log(`📅 ATUALIZAÇÃO DIÁRIA: adicionar ${count} vídeos`);
  
  const state = loadState();
  const cache = loadCache();
  const seenEmbeds = [...(cache.seenEmbeds || [])];
  
  // Verificar se já rodou hoje
  const today = new Date().toISOString().split('T')[0];
  if (state.dailyDate === today && state.dailyAdded >= count) {
    log(`⏭️  Já adicionou ${state.dailyAdded} vídeos hoje. Pulando.`);
    return [];
  }
  
  // Resetar contagem diária se for novo dia
  if (state.dailyDate !== today) {
    state.dailyAdded = 0;
    state.dailyDate = today;
  }
  
  // Carregar vídeos existentes para preservá-los
  let existingVideos = [];
  try {
    if (existsSync(DATA_FILE)) {
      // Extrair dados do data.js avaliando no Node
      const dataContent = readFileSync(DATA_FILE, 'utf-8');
      
      // Extrair array de vídeos usando regex (aceita aspas simples E duplas)
      const videoMatches = dataContent.match(/\{[\s\S]*?id:\s*(\d+)[\s\S]*?embedUrl:\s*['"][^'"]+['"][\s\S]*?\}/g);
      if (videoMatches) {
        existingVideos = videoMatches.map((match, idx) => {
          const idMatch = match.match(/id:\s*(\d+)/);
          const titleMatch = match.match(/title:\s*["']([^"']+)["']/);
          const catMatch = match.match(/category:\s*["']([^"']+)["']/);
          const embedMatch = match.match(/embedUrl:\s*["']([^"']+)["']/);
          return {
            id: idMatch ? parseInt(idMatch[1]) : idx + 1,
            title: titleMatch ? titleMatch[1] : '',
            category: catMatch ? catMatch[1] : 'amador',
            embedUrl: embedMatch ? embedMatch[1] : '',
          };
        });
        log(`📂 Carregados ${existingVideos.length} vídeos existentes`);
      }
    }
  } catch(e) {
    log(`Erro ao carregar data.js: ${e.message}`, 'WARN');
  }
  
  // Buscar vídeos recentes do Eporner
  const newVideos = [];
  let nextId = state.lastVideoId || (existingVideos.length > 0 ? Math.max(...existingVideos.map(v => v.id)) + 1 : 1);
  
  // Buscar últimas novidades (página 1 de várias queries)
  const recentQueries = ['', 'milf', 'amateur', 'brazilian', 'latina', 'hentai', 'lesbian'];
  
  for (const query of recentQueries) {
    if (newVideos.length >= count) break;
    
    const epVideos = await scrapeEpornerByQuery(query, 1, 20);
    
    for (const epVideo of epVideos) {
      if (newVideos.length >= count) break;
      
      const embedCheck = `https://www.eporner.com/embed/${epVideo.id}`;
      if (seenEmbeds.includes(embedCheck)) continue;
      if (existingVideos.some(v => v.embedUrl === embedCheck)) continue;
      
      const video = transformEpornerVideo(epVideo, nextId, seenEmbeds);
      if (video) {
        newVideos.push(video);
        seenEmbeds.push(video.embedUrl);
        nextId++;
      }
    }
    
    await sleep(1000);
  }
  
  if (newVideos.length === 0) {
    log('⚠️ Nenhum vídeo novo encontrado hoje.');
    return [];
  }
  
  // Adicionar novos vídeos aos existentes e regenerar
  const allVideos = [...existingVideos, ...newVideos];
  const output = generateDataJS(allVideos);
  writeFileSync(DATA_FILE, output, 'utf-8');
  
  // Atualizar state
  state.totalScraped += newVideos.length;
  state.lastRun = new Date().toISOString();
  state.lastVideoId = nextId;
  state.dailyAdded += newVideos.length;
  state.dailyDate = today;
  cache.seenEmbeds = seenEmbeds.slice(-10000);
  saveState(state);
  saveCache(cache);
  
  log(`\n✅ ATUALIZAÇÃO DIÁRIA CONCLUÍDA!`);
  log(`📊 ${newVideos.length} novos vídeos adicionados`);
  log(`📊 Total: ${allVideos.length} vídeos no site`);
  
  newVideos.forEach(v => {
    log(`   ➕ #${v.id}: ${v.title.substring(0, 60)}... [${v.category}]`);
  });
  
  return newVideos;
}

// ============================================
// HELP
// ============================================

function showHelp() {
  console.log(`
╔══════════════════════════════════════════════════════╗
║        PLEASUREHUB - AUTO SCRAPER SYSTEM            ║
╚══════════════════════════════════════════════════════╝

USO:
  node scraper/scraper.mjs [comando]

COMANDOS:
  --bulk=N     Scrape em massa: N vídeos (ex: --bulk=1000)
  --daily=N    Atualização diária: N vídeos (ex: --daily=2)
  --status     Mostrar status atual do scraper
  --help       Mostrar esta ajuda

EXEMPLOS:
  node scraper/scraper.mjs --bulk=1000   # 1000 vídeos iniciais
  node scraper/scraper.mjs --daily=2     # +2 vídeos (pode agendar no cron)

FONTES:
  • Eporner API (primária) - pública, sem autenticação
  • Feed de novidades (diário)

ARQUIVOS:
  scraper/scraper.mjs     - Script principal
  scraper/state.json      - Estado do scraper
  scraper/cache.json      - Cache de URLs já vistas
  scraper/scraper.log     - Log de execuções
  js/data.js              - Dados do site (gerado automaticamente)
`);
}

// ============================================
// STATUS
// ============================================

function showStatus() {
  const state = loadState();
  const cache = loadCache();
  
  let videoCount = 0;
  try {
    if (existsSync(DATA_FILE)) {
      const content = readFileSync(DATA_FILE, 'utf-8');
      const matches = content.match(/id:\s*\d+/g);
      videoCount = matches ? matches.length : 0;
    }
  } catch(e) {}
  
  console.log(`
╔══════════════════════════════════════════╗
║       PLEASUREHUB - SCRAPER STATUS      ║
╚══════════════════════════════════════════╝

📊 VÍDEOS NO SITE: ${videoCount}
📊 TOTAL JÁ RASPADOS: ${state.totalScraped || 0}
📊 CACHE DE URLs: ${(cache.seenEmbeds || []).length} URLs
📅 ÚLTIMA EXECUÇÃO: ${state.lastRun || 'Nunca'}
📅 PRÓXIMO ID: ${state.lastVideoId || 1}

📋 HOJE: ${state.dailyDate || 'N/A'}
   Adicionados hoje: ${state.dailyAdded || 0}
`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    showHelp();
    return;
  }
  
  if (args.includes('--status')) {
    showStatus();
    return;
  }
  
  const bulkArg = args.find(a => a.startsWith('--bulk='));
  const dailyArg = args.find(a => a.startsWith('--daily='));
  
  try {
    if (bulkArg) {
      const count = parseInt(bulkArg.split('=')[1]) || 500;
      log('='.repeat(60));
      log('MODO: SCRAPE EM MASSA');
      log('='.repeat(60));
      await runBulkScrape(count);
    }
    
    if (dailyArg) {
      const count = parseInt(dailyArg.split('=')[1]) || 2;
      log('='.repeat(60));
      log('MODO: ATUALIZAÇÃO DIÁRIA');
      log('='.repeat(60));
      await runDailyUpdate(count);
    }
    
    log('\n✅ Sistema concluído!');
  } catch (err) {
    log(`\n❌ ERRO FATAL: ${err.message}`, 'ERROR');
    console.error(err);
    process.exit(1);
  }
}

main();
