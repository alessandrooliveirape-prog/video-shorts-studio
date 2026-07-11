/* ============================================
   PLEASUREHUB v2.0 - MASTER REBUILD SCRIPT
   Regenera TODO o site: data.js, video pages,
   category pages, homepage, sitemap, SEO
   
   USO: node rebuild-site.mjs
   ============================================ */

import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

// ============================================
// REAL EMBED URL POOL (Eporner)
// ============================================
const REAL_EMBED_URLS = [
  'zsbYVHJZfm3', 'IVCJatwVEOb', '1VjZxhXY7J7', 'X16vFQCJH3L',
  'SIvyYWtoeRA', 'ilCqEJUkATj', '08HWMidc2YA', 'cLIbVNM95rS',
  'ROU7ro90d0Q', 'OY088ckHd5M', 'bXPUzafPktH', 'Xhv3i9zLV0z',
  'Hspe814Wt7q', 'Sena8bu8mPF', 'RtiblkAtoxR', 'fDxlwT3Cd9k',
  'yLgHzLgd9qL', 'rJfly6xnyhK', 'UJhODmDI2WH', 'PxMOXjmzS1r',
  '3InF3V5jAhv', 'l202DYqDy1L', 'fdc1B3SXD5s', 'd248B2I3nvM',
  'E8YE4EW1nuP', 'MhfoMSVSXd4', 'dVMqQSlsyDL', 'cIO9vYhXDnX',
  'vMTWyaS3CR2', 'vCib7VvBnke', 'ASBP5tpqa61', 'S9g7Ar6JWQE',
  '7ZMa1reJLKT', 'QbD27dEkyWj', 'aZn61wj9xPy', 'Wgy6rxNy31Y',
  'e5lkwvuOB6j', 'hiVgcPK7A1V', 'zJJNgK2lfe0', 'IQRUnBzzfko',
  'sVRaLdbuIcy', 'EkqoGTaVbRg', '8so2yGQmxI4', '4hY5hQjh1P8',
  'cC1fpKYM3tS', 'TXpKMzcU8H0', 'LuuOOaqroIV', 'jGTHjk74W97',
  'V95Fcl3h5uT', 'lR9M6WyIn9k', 'VLpSCblxFNw', 'xpLefCTPkLO',
  'KUVJk3WcYoK', 'mrHwNZ9UUlu', 'L1sp51MJ1S1', 'J6lQ7KUx6wb',
  'sY3KrlYanyk', 'TrOd9u6sgBE', 'S5gFceCfDQX', 'C6LJDjEIuJd',
  'AOQZ2jVKjKJ', 'JilmEtmF0ND', 'UL9MFl4PJ6z', 'KwK0PelGYbq',
  'd36aO2fO2C6', 'YBOzFkFA80p', 'IQYeHhLWfdi', 'nASi96ZhE9J',
  'XanwewaJzvD', 'YZ5QUXfTzss', 'LCneB8GlPVA', 'bwC3gktSWO7',
  'tXYAa8OM7r5', 'OMXCo6AtQux', '2wEUsCAtff0', '3BcWGJ6Bils',
  '4ab712208qQ', 'pDhAqKVZatv', 'i1PTvJeMv5C', 'MrYlCgxm8mJ',
  'POtDdVJVjpj', '4rqEC3WBE2O', 'k7PmEXq59Sf', 'RmOn8Ode1p1',
  '1BEov6ovLfj', 'vzh7Rm6jK3d', 'HEF4bHzPvDs', 'Fz4torEFDXo',
  't9bujcznuuH', 'ixbT5SJSn7b', 'kEMoIaMSs9D', '9KbLWGxxYvb',
  'n0oansjAnsJ', 'y3UwmNEUPk9', 'ogO71Yqarq1', 'dOZMDjH0F9Y',
  'Mtlj4FPPPp9', 'xE3jF6YECJ4', 'z5TQmUi9Nl8', 'SeJyhephFN1',
  'rUeRe1d11gw', 'XNUt0XhvzDG', '4Foet5uNknd', 'mMZWQ6tLjs9',
  'U5mofnA1tRQ', 'AMtehbBMQRe', 'ZGQKynZX8gZ', 'mXV9rEYD6x5',
  'HVBUwNrStEs', 'nhx4Vl6tq0R', 'V2DdmEsE5vZ', '0eru90dG4Hu',
  'H779OhVXvYO', '6q3G7BvqpWs', 'WF2ETWHFORF', 'zRjIzHwr5Gn',
  'dE9voLFNYPJ', 'A9WYB0rH4Im', 'PvPzfBlqcP0', 'Ru3zCTwE6bE',
  'VGqHZ1x80TN', '6uxyEnqw3dL', 'NubaU6FEgBo', '2DWokiAAenv',
  'ssVWNrONTOZ', 'xWekoFHZatz', 'teDMj0972S8', 'qFfX1neTKop',
  '9z95UM66zYo', '7BdDbpaWjAH', 'nOjeyFs4R63', 'GLt3UqvCxwi',
  'ETgIFkRc03o', 'ikeBLCL8gFb', 'PufeNHSikFN', 'IWVC3WrKhyO',
  'O4UyKrgYhRd', 'xZ1YsaUW9YF', 'nmsNfi9Vgx6', 'j4QZNTsWRju',
  'U6qfO8kNqXv', 'POtsjbJBdel', '2krYVM868Wh', '99RgQAiWl7b',
  'lVZr8NgfheZ', '5bvvB3uqsg3', 'qwvLotWaDkA', 'j90ICIpvGuF',
  'oNlPKjqGmXg', 'urfUusLW5W6', 'UizybG7cba4', 'GO3lWcKgeXm',
  'NMgliu9MvKP', 'J4R0S827bHO', 'nTka63Cs6U4', 'gdDLZoAamTc',
  'd7FmTPQgoFI', '7ekdTkWhkB7', 'SQOCcmTzjAc', 'mg6ZQpEeXV8',
  '1eoXE3f1w57', '2EJ00jrqy8X', 'LCgVNQlc7lW', '7XVTZGBGmr4',
  '9Ak2oMbBzb3', 'hXeImxDSSNP', 'QWNaCt4NDuI', '5Bj1cW2QRkd',
  'SijdN20O9Vu', 'FsTeoESHMSd', 'nTMhiJfXkOL', 'ieR79YKYaRw',
  'rQBpNCohCUi', 'pPufbggTsmF', 'IxIpbcdpih2', 'xGvuhIZ30Ky',
  'gIqygNfKDg8', 'Thd501AUMyW', 'oewGmYLkHJa', 'ofjlQVHyN1B',
  'xJgy2qilqwB', 'RX15JirMwBk',
];

// ============================================
// CATEGORIES
// ============================================
const CATEGORIES = [
  { id: 'milf', name: 'MILF', emoji: '🔥', color: '#ff2d5c', desc: 'The hottest MILFs. Exclusive mature women content in HD and 4K.' },
  { id: 'latina', name: 'Latina', emoji: '💃', color: '#e84393', desc: 'Hot Latinas from all over the world. Spanish, Colombian, Mexican and more.' },
  { id: 'amateur', name: 'Amateur', emoji: '📱', color: '#6c5ce7', desc: 'Real homemade content, amateur recordings, webcam, and leaked OnlyFans.' },
  { id: 'hentai', name: 'Hentai', emoji: '🎨', color: '#fd79a8', desc: '3D and animated hentai. Hentai MILF, futanari, yuri, tentacle and more.' },
  { id: 'lesbian', name: 'Lesbians', emoji: '💋', color: '#e17055', desc: 'Real and amateur lesbian videos. Hot women having fun together.' },
  { id: 'brazilian', name: 'Brazilian', emoji: '🇧🇷', color: '#00b894', desc: 'The hottest Brazilian girls from OnlyFans and across the web.' },
  { id: 'anal', name: 'Anal', emoji: '🔞', color: '#d63031', desc: 'Best anal sex videos. Hot girls taking it deep in HD and 4K.' },
  { id: 'teen', name: 'Teens (18+)', emoji: '🌸', color: '#e84393', desc: 'Adult content with young adult performers. Hot teens in HD and 4K.' },
  { id: 'gangbang', name: 'Gang Bang', emoji: '🔥', color: '#e17055', desc: 'Best gangbangs and group sex. One woman with multiple men.' },
  { id: 'solo', name: 'Solo / Masturbation', emoji: '✊', color: '#6c5ce7', desc: 'Women touching themselves and having fun alone. Webcam, toys and more.' },
  { id: 'couple', name: 'Couples', emoji: '💑', color: '#00b894', desc: 'Amateur couples having hot sex. Homemade videos of real couples.' },
  { id: 'fetish', name: 'Fetish', emoji: '⛓️', color: '#2d3436', desc: 'Fetish and BDSM content. Handcuffs, leather, domination and more.' },
  { id: 'orgy', name: 'Orgy', emoji: '🎉', color: '#e17055', desc: 'Complete swing and orgy videos. Group sex with multiple people.' },
  { id: 'trans', name: 'Trans', emoji: '⚧️', color: '#a29bfe', desc: 'Hot trans women. Brazilian and international trans content in HD.' },
  { id: 'interracial', name: 'Interracial', emoji: '🌍', color: '#00cec9', desc: 'Interracial sex. Women and men of all races and colors in HD.' },
  { id: 'cosplay', name: 'Cosplay', emoji: '🎭', color: '#fd79a8', desc: 'Adult cosplay and fantasy. Animated and game characters in adult versions.' },
  { id: 'brazilian-amateurs', name: 'Brazilian Amateurs', emoji: '🇧🇷', color: '#00cec9', desc: 'Real Brazilian homemade content and amateur recordings.' },
  { id: 'horny-grannies', name: 'Horny Grannies', emoji: '👵', color: '#e17055', desc: 'Horniest grannies and mature women. Exclusive mature content in HD.' },
];

// ============================================
// VIDEO DATA
// ============================================
const CUSTOM_COUNTS = {
  brazilian: 108,
  'brazilian-amateurs': 50,
  'horny-grannies': 50,
};
const DEFAULT_COUNT = 8;

const TITLES = {
  milf: [
    'Hot MILF neighbor invited me for coffee',
    'Fit MILF from work finally gave in - Part 2',
    'MILF teacher after private lesson - FULL',
    'Mature MILF teaching tantric massage',
    'Caught my MILF stepmom in the shower - Leaked',
    'Hottest Brazilian OnlyFans MILF - Full Video',
    'Thick MILF shaking in black lingerie - HD',
    'Sweet neighborhood MILF mom - Caught on camera',
  ],
  latina: [
    'Hot Latina dancing - OnlyFans leaked',
    'Sexy Spanish girl in the car - beach trip',
    'Hottest Colombian girl on TikTok - FULL',
    'Mexican beauty shaking it slow in red dress',
    'Thick Latina in motel - full night recorded',
    'Venezuelan beauty doing explicit striptease',
    'Argentine OnlyFans creator - best of 2025',
    'Tattooed Latina giving sensual dance lesson',
  ],
  amateur: [
    'Amateur couple recording for the first time',
    'Amateur webcam - teen showing off',
    'Leaked: Best moments of amateur OnlyFans',
    'Amateur secret tape - full homemade video',
    'Exhibitionism on the balcony - busy street',
    'Chubby couple having wild sex - full video',
    'Amateur in nature - sex in the woods',
    'Girlfriend recording boyfriend secretly - spycam',
  ],
  hentai: [
    '3D Hentai Thick MILF - Full Animation HD',
    'Hentai - Cyborg Escort Girl - Episode 4',
    'Hentai Futanari - Best 2025 Compilation',
    'Hentai High School Elite - Hot Scenes',
    'Anime Hentai - Sexy Shinobi vs Monster',
    'Hentai Harem - One Night with 5 Girls',
    'Hentai Tentacle - Full Dubbed Version',
    'Hentai Yuri - Animated Lesbian Romance',
  ],
  lesbian: [
    'Two hot blondes in the shower - full HD',
    'Lesbians meeting on Tinder - real date',
    'Tantric massage between girlfriends - full video',
    'Brunette and blonde at motel - best lesbian scene',
    'Brazilian lesbians - filming for OnlyFans',
    'Gym class - personal trainer and client - hot scenes',
    'Best friends - discovering together - full video',
    'Tattooed lesbians - hot photoshoot',
  ],
  brazilian: [
    'Hot Brazilian girl shaking at funk party - leaked',
    'Blonde from OnlyFans leaked - full updated',
    'Thick Brazilian girl in secret - amateur recording',
    'Big brunette from Tinder - real date recorded',
    'Horny Brazilian - best Brazilian OnlyFans 2025',
    'Paulista babe at nude beach - uncensored',
    'Carioca girl dancing - best of Brazil',
    'Tattooed Mineira from OnlyFans - full HD',
    'Hot Gaúcha in the countryside - amateur video',
    'Brazilian girl in group sex - 3 guys 1 girl',
    'Hot blonde from OnlyFans - full leak',
    'Brazilian girl dancing Rio funk - HD',
    'Thick Paulista in secret - full video',
    'Carioca babe having sex - homemade amateur',
    'Horny Mineira on OnlyFans - full HD',
    'Baiana babe shaking it hard - full video',
    'Gaúcha girl in the field - hot scenes',
    'Hot Brazilian from Tinder - real encounter',
    'Carioca at nude beach - caught on tape',
    'Horny Brazilian in motel - wild night',
  ],
  anal: [
    'Hot Brazilian taking it in the ass - full HD',
    'Amateur anal - first time taking it deep',
    'Hot brunette riding the dick - anal 4K',
    'Sensual anal with horny Brazilian - full video',
    'Blonde taking it in the ass at motel - full scene',
    'Anal just the tip - hot Brazilian girl',
    'Taking it deep for boyfriend - homemade anal',
    'Wild anal - thick girl riding on dick',
  ],
  teen: [
    'Hot 18yo teen - first time recording',
    'OnlyFans teen model - full 4K HD',
    'Young babe having fun - amateur tape',
    'Teen shaking it hard - leaked online',
    'First time of the teen - recorded full',
    'Hot teen from Tinder - real date',
    '18yo young model - OnlyFans full video',
    'Horny teen - best content of 2025',
  ],
  gangbang: [
    'Brazilian gangbang - 3 guys 1 girl',
    'Full swinger orgy - 5 guys 1 hot girl',
    'Amateur gangbang - Brazilian girl in group',
    'Full group sex - homemade orgy',
    'OnlyFans gangbang - hot girl in group',
    '3 guys 1 girl - amateur full video',
    'Wild gangbang - 4 guys 1 girl',
    'Secret gangbang - full group tape',
  ],
  solo: [
    'Hot masturbation - teen touching herself',
    'Solo in the bedroom - private webcam',
    'Brazilian girl cumming alone - full video',
    'Masturbation with toys - full HD',
    'Solo on webcam - hot teen model',
    'Touching herself - full video recording',
    'Female masturbation - full orgasm',
    'Sex toys - teen having fun alone',
  ],
  couple: [
    'Couple having hot sex - full amateur tape',
    'Girlfriend and boyfriend recording - hot bed',
    'Couple in motel - full love night',
    'Sex of passionate couple - HD full video',
    'Brazilian couple having sex - homemade tape',
    'Secret lovers - full recording',
    'Hot couple having sex - intimate scenes',
    'Husband and wife - wild night HD',
  ],
  fetish: [
    'BDSM full session - handcuffs and leather',
    'Brazilian fetish - hot dominatrix',
    'Handcuffs and whip - BDSM session',
    'Amateur fetish - BDSM couple full video',
    'Female domination - Brazilian mistress rules',
    'Fetish with handcuffs - amateur full',
    'Hot BDSM - fetish couple',
    'Total submission - full session HD',
  ],
  orgy: [
    'Full orgy with 4 couples',
    'Brazilian amateur orgy - full group tape',
    'Orgy at motel - 4 couples swapping',
    'Wild orgy - 10 people having fun',
    'Homemade swinger party - friends with benefits',
    'Amateur orgy - full video HD',
    'Brazilian orgy - 3 couples swapping',
    'Orgy with 8 people - wild night',
  ],
  trans: [
    'Hot trans girl shaking - full HD',
    'Hottest Brazilian shemale on OnlyFans',
    'Trans woman in motel - full 4K',
    'Thick trans girl shaking and sitting hard',
    'Sexy shemale - best content of 2025',
    'Brazilian trans - full video HD',
    'OnlyFans shemale - leaked full video',
    'Hot trans model - full hot scenes',
  ],
  interracial: [
    'Hot Brazilian girl with foreigner - full HD',
    'Amateur interracial - brunette with blonde guy',
    'Hot foreigner with Brazilian girl - 4K full',
    'Interracial in motel - full video tape',
    'Brazilian girl with foreigner - hot scenes',
    'Amateur interracial - mixed couple HD',
    'Hot brunette with blonde - full video',
    'Foreigner fucks Brazilian - full 4K video',
  ],
  cosplay: [
    'Adult cosplay - anime character full scene',
    'Sexy costume - hot nurse fantasy',
    'Cosplay OnlyFans - game character HD',
    'Full costume play - hot police officer',
    'Brazilian cosplay - famous character',
    'Sexy fantasy - student full scene',
    'Cosplay 4K - anime character full video',
    'Maid costume erotica - hot scenes',
  ],
  'brazilian-amateurs': [
    'Brazilian amateur recording for the first time',
    'Amateur couple in bedroom - full homemade tape',
    'Leaked: Best of Brazilian amateur OnlyFans',
    'Brazilian amateur secret tape - full video',
    'Exhibitionist on the balcony - busy street',
    'Chubby couple having wild sex - homemade',
    'Brazilian amateur in nature - sex in the woods',
    'Girlfriend recording boyfriend secretly - spy cam',
    'Best Brazilian amateur video of 2025',
    'Hot neighbor through the window - filmed from afar',
  ],
  'horny-grannies': [
    'Horny granny from the neighborhood - caught the young neighbor',
    'Hot mature woman after divorce - 55 years young',
    'Horny granny at motel with younger lover',
    'Hot stepmom caught stepson red-handed',
    'Horny granny shaking and riding hard - full video',
    'Let me teach you everything says the horny granny',
    'Hottest granny in town - full 4K video',
    'Blonde mature woman secretly recorded - homemade',
    'Exhibitionist granny at the beach - caught on tape',
    'Horny granny OnlyFans leaked - full video',
  ],
};

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

const VIEWS = [
  '158K', '234K', '67K', '892K', '1.2M', '445K',
  '78K', '523K', '987K', '345K', '156K', '678K',
  '2.1M', '89K', '312K', '567K', '123K', '789K',
  '234K', '456K', '432K', '876K', '543K', '1.5M',
  '210K', '654K', '321K', '789K', '147K', '963K',
  '1.8M', '369K', '741K', '852K', '159K', '753K',
];

const QUALITIES = ['HD', 'Full HD', '4K', 'Full HD', 'HD', '4K'];

const TAG_POOLS = [
  ['brazilian', 'hot', 'onlyfans', 'leaked'],
  ['amateur', 'homemade', 'couple', 'bedroom'],
  ['milf', 'mature', 'hot', 'fit'],
  ['teen', '18', 'first time', 'amateur'],
  ['latina', 'hot', 'dancing', 'sensual'],
  ['hentai', 'animated', '3d', 'anime'],
  ['lesbian', 'girls', 'romantic', 'amateur'],
  ['brazilian', 'thick', 'onlyfans', 'leaked'],
  ['sex', 'couple', 'amateur', 'homemade'],
  ['orgy', 'group sex', 'swinger', 'motel'],
  ['anal', 'tight ass', 'deep anal', 'riding'],
  ['trans', 'shemale', 'hot', 'brazilian'],
  ['fetish', 'bdsm', 'handcuffs', 'leather'],
  ['cosplay', 'costume', 'anime', 'game'],
  ['interracial', 'foreigner', 'brazilian', 'mixed'],
  ['solo', 'masturbation', 'webcam', 'toys'],
];

function randomDate() {
  const m = Math.floor(Math.random() * 5) + 1;
  const d = Math.floor(Math.random() * 28) + 1;
  return `2025-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ============================================
// GENERATE VIDEOS
// ============================================
function generateVideos() {
  const videos = [];
  let id = 1;

  for (const cat of CATEGORIES) {
    const titles = TITLES[cat.id] || [];
    const targetCount = CUSTOM_COUNTS[cat.id] || DEFAULT_COUNT;
    
    for (let i = 0; i < targetCount; i++) {
      const titleIdx = i % titles.length;
      const hue = (id * 137.508) % 360;
      const embedId = REAL_EMBED_URLS[(id - 1) % REAL_EMBED_URLS.length];

      videos.push({
        id,
        title: titles[titleIdx],
        category: cat.id,
        duration: DURATIONS[Math.floor(Math.random() * DURATIONS.length)],
        views: VIEWS[Math.floor(Math.random() * VIEWS.length)],
        quality: QUALITIES[Math.floor(Math.random() * QUALITIES.length)],
        tags: TAG_POOLS[Math.floor(Math.random() * TAG_POOLS.length)],
        likes: Math.floor(Math.random() * 20000) + 500,
        dislikes: Math.floor(Math.random() * 600) + 5,
        date: randomDate(),
        gradient: `linear-gradient(135deg, hsl(${hue}, 70%, 30%), hsl(${(hue + 40) % 360}, 60%, 20%))`,
        thumbnail: `img/thumbs/video-${id}.svg`,
        embedUrl: `https://www.eporner.com/embed/${embedId}`,
      });
      id++;
    }
  }

  return videos;
}

// ============================================
// GENERATE DATA.JS
// ============================================
function generateDataJS(videos) {
  const counts = {};
  videos.forEach(v => { counts[v.category] = (counts[v.category] || 0) + 1; });

  const catsStr = CATEGORIES.map((c, i) => 
    `    { id: '${c.id}', name: '${c.name}', emoji: '${c.emoji}', count: ${counts[c.id] || 0}, color: '${c.color}' }`
  ).join(',\n');

  return `/* ============================================
   PLEASUREHUB v2.0 - Content Data
   Generated on ${new Date().toISOString().split('T')[0]}
   Total: ${videos.length} videos in ${CATEGORIES.length} categories
   ============================================ */

const SITE_DATA = {
  categories: [
${catsStr}
  ],

  videos: ${JSON.stringify(videos, null, 2)},

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
      const va = parseInt(String(a.views).replace(/[KM]/g, m => m === 'K' ? '000' : '000000'));
      const vb = parseInt(String(b.views).replace(/[KM]/g, m => m === 'K' ? '000' : '000000'));
      return vb - va;
    }).slice(0, limit);
  },

  getLatest(limit = 8) {
    return [...this.videos].sort((a, b) => b.id - a.id).slice(0, limit);
  },

  getByCategory(catId, limit = 12) {
    return this.getVideosByCategory(catId).slice(0, limit);
  },

  search(query) {
    const q = query.toLowerCase();
    return this.videos.filter(v => 
      v.title.toLowerCase().includes(q) || 
      v.tags.some(t => t.includes(q))
    );
  }
};
`;
}

// ============================================
// GENERATE VIDEO PAGE
// ============================================
function generateVideoPage(video, allVideos) {
  const related = allVideos
    .filter(v => v.category === video.category && v.id !== video.id)
    .slice(0, 6);
  
  const relatedHTML = related.map(v => `
        <a href="/video/${v.id}" class="related-item">
          <div class="related-thumb" style="background:${v.gradient};">
            <img src="/${v.thumbnail}" alt="${v.title.replace(/"/g, '&quot;')}" loading="lazy">
            <span class="related-duration">${v.duration}</span>
          </div>
          <div class="related-info">
            <div class="related-title">${v.title}</div>
            <div class="related-meta">👁️ ${v.views} views</div>
          </div>
        </a>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${video.title} - PleasureHub</title>
  <meta name="description" content="Watch ${video.title} for free on PleasureHub. Quality: ${video.quality} • Duration: ${video.duration}. Best free adult videos in HD and 4K.">
  <meta name="keywords" content="${video.tags.join(', ')}, adult videos, free, HD">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://pleasurehub-mu.vercel.app/video/${video.id}">
  <meta property="og:title" content="${video.title} - PleasureHub">
  <meta property="og:description" content="Watch ${video.title} in ${video.quality} for free on PleasureHub.">
  <meta property="og:type" content="video.other">
  <meta property="og:url" content="https://pleasurehub-mu.vercel.app/video/${video.id}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${video.title} - PleasureHub">
  <link rel="stylesheet" href="../css/style.css">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='url(%23g)'/><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='%23ff2d5c'/><stop offset='1' stop-color='%23b829e0'/></linearGradient></defs><text x='16' y='22' font-size='18' fill='white' text-anchor='middle'>P</text></svg>">
  <link rel="alternate" hreflang="en" href="https://pleasurehub-mu.vercel.app/video/${video.id}">
  <script type="text/javascript" src="https://acscdn.com/script/aclib.js"></script>
  <script>aclib.runAutoTag({zoneId:'cmbzjmxz1i'});</script>
  <script type="application/ld+json">
  {
    "@context":"https://schema.org",
    "@type":"VideoObject",
    "name":"${video.title.replace(/"/g, '\\"')}",
    "description":"Watch ${video.title.replace(/"/g, '\\"')} for free on PleasureHub. Quality: ${video.quality} • Duration: ${video.duration}.",
    "thumbnailUrl":["https://pleasurehub-mu.vercel.app/${video.thumbnail}"],
    "uploadDate":"${video.date}T08:00:00Z",
    "duration":"PT${video.duration.split(':')[0]}M${video.duration.split(':')[1]}S",
    "embedUrl":"${video.embedUrl}",
    "interactionStatistic":{"@type":"InteractionCounter","interactionType":{"@type":"WatchAction"},"userInteractionCount":${parseInt(String(video.views).replace(/[KM]/g, m => m === 'K' ? '000' : '000000'))}},
    "author":{"@type":"Organization","name":"PleasureHub"}
  }
  </script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
    {"@type":"ListItem","position":1,"name":"Home","item":"https://pleasurehub-mu.vercel.app/"},
    {"@type":"ListItem","position":2,"name":"${video.title.replace(/"/g, '\\"')}","item":"https://pleasurehub-mu.vercel.app/video/${video.id}"}
  ]}
  </script>
</head>
<body>
  <header class="top-bar">
    <div class="top-bar-inner">
      <a href="/" class="logo"><span class="logo-icon">P</span> PleasureHub</a>
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="Search videos...">
        <button type="button"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></button>
      </div>
      <div class="header-actions">
        <a href="/category" class="btn-primary"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg><span>Categories</span></a>
      </div>
    </div>
  </header>

  <nav class="main-nav">
    <div class="nav-inner">
      <a href="/" class="nav-item"><span class="nav-icon">🔥</span> Trending</a>
      <a href="/category" class="nav-item"><span class="nav-icon">📂</span> All</a>
      <a href="/brazilian" class="nav-item"><span class="nav-icon">🇧🇷</span> Brazilian</a>
      <a href="/milf" class="nav-item"><span class="nav-icon">🔥</span> MILF</a>
      <a href="/latina" class="nav-item"><span class="nav-icon">💃</span> Latina</a>
      <a href="/amateur" class="nav-item"><span class="nav-icon">📱</span> Amateur</a>
      <a href="/hentai" class="nav-item"><span class="nav-icon">🎨</span> Hentai</a>
      <a href="/lesbian" class="nav-item"><span class="nav-icon">💋</span> Lesbians</a>
      <a href="/brazilian-amateurs" class="nav-item"><span class="nav-icon">🇧🇷</span> Brazilian Amateurs</a>
      <a href="/horny-grannies" class="nav-item"><span class="nav-icon">👵</span> Horny Grannies</a>
      <a href="/blog" class="nav-item"><span class="nav-icon">📝</span> Blog</a>
    </div>
  </nav>

  <div class="container">
    <div id="ad-leaderboard" class="ad-container ad-leaderboard"><span class="ad-label">Advertisement</span></div>

    <div class="video-page">
      <div class="video-layout">
        <div class="video-main">
          <div class="video-player-wrapper">
            <div class="player-placeholder" id="playerPlaceholder" style="background:${video.gradient};">
              <img src="../${video.thumbnail}" alt="${video.title}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;" loading="lazy">
              <div style="position:absolute;inset:0;background:rgba(0,0,0,0.4);z-index:2;"></div>
              <div style="text-align:center;position:relative;z-index:3;">
                <div class="big-play-btn" id="playBtn">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="white"><polygon points="8,5 19,12 8,19"/></svg>
                </div>
                <p style="margin-top:16px;text-shadow:0 2px 8px rgba(0,0,0,0.8);">Click to play</p>
                <p style="font-size:0.8rem;color:var(--text-muted);margin-top:8px;text-shadow:0 2px 8px rgba(0,0,0,0.8);">${video.quality} • ${video.duration}</p>
              </div>
            </div>
          </div>

          <div class="video-info-section">
            <h1 class="video-title">${video.title}</h1>
            <div class="video-stats">
              <span>👁️ ${video.views} views</span>
              <span>📅 ${video.date}</span>
              <span>⭐ ${(4 + Math.random()).toFixed(1)}</span>
            </div>
            <div class="video-actions">
              <button class="video-action-btn liked" data-action="like">👍 ${video.likes}</button>
              <button class="video-action-btn" data-action="dislike">👎 ${video.dislikes}</button>
              <button class="video-action-btn share-btn">🔗 Share</button>
              <button class="video-action-btn no-pop">⭐ Favorite</button>
            </div>
            <div id="ad-rectangle" class="ad-container ad-banner"><span class="ad-label">Advertisement</span></div>
            <div class="video-description">
              <p>Updated on ${video.date}. Best free adult videos in HD and 4K.</p>
              <div class="tags">${video.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>
            </div>
            <div class="comments-section">
              <div id="commentsContainer">
                <div class="comments-header"><h3 class="comments-title">💬 Comments <span class="comments-count">(0)</span></h3></div>
                <div class="comments-empty">Loading comments...</div>
              </div>
            </div>
          </div>
        </div>

        <div class="video-sidebar">
          <div id="ad-native" class="ad-container ad-sidebar"><span class="ad-label">Advertisement</span></div>
          <h3 style="font-size:1rem;font-weight:700;margin:16px 0 12px;">📺 Related Videos</h3>
          <div id="relatedVideos">${relatedHTML}</div>
        </div>
      </div>
    </div>
  </div>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="/" class="logo" style="margin-bottom:12px;display:inline-block;"><span class="logo-icon">P</span> PleasureHub</a>
          <p>The largest free adult entertainment portal. Thousands of HD and 4K videos updated daily.</p>
        </div>
        <div class="footer-col">
          <h4>Categories</h4>
          <ul>
            ${CATEGORIES.slice(0, 8).map(c => `<li><a href="/${c.id}">${c.emoji} ${c.name}</a></li>`).join('')}
          </ul>
        </div>
        <div class="footer-col">
          <h4>Site</h4>
          <ul>
            <li><a href="/privacy">Privacy Policy</a></li>
            <li><a href="/terms">Terms of Service</a></li>
            <li><a href="/dmca">DMCA / Removal</a></li>
            <li><a href="/contact">Contact Us</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Partners</h4>
          <ul>
            <li><a href="#">OnlyFans Models</a></li>
            <li><a href="#">Become an Affiliate</a></li>
            <li><a href="#">Advertise with Us</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; 2026 PleasureHub. All rights reserved. 18+</span>
        <div class="footer-bottom-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/dmca">DMCA</a>
        </div>
      </div>
    </div>
  </footer>

  <script src="../js/data.js"></script>
  <script src="../js/embed.js"></script>
  <script src="../js/comments.js"></script>
  <script src="../js/main.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const v = SITE_DATA.getVideoById(${video.id});
      if (!v) return;

      document.getElementById('playBtn').addEventListener('click', () => {
        if (typeof EMBED !== 'undefined') {
          EMBED.loadIntoPlayer('playerPlaceholder', v.embedUrl, v.title, { autoplay: true });
        }
      });

      if (typeof COMMENTS !== 'undefined') {
        setTimeout(() => COMMENTS.renderComments('commentsContainer', ${video.id}), 100);
      }
    });
  </script>
  <script src="../js/adcash.js"></script>
  <script src="../js/analytics.js"></script>
</body>
</html>`;
}

// ============================================
// GENERATE CATEGORY PAGE
// ============================================
function generateCategoryPage(cat) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cat.emoji} ${cat.name} - Free Adult Videos | PleasureHub</title>
  <meta name="description" content="${cat.desc} Watch free ${cat.name} videos in HD and 4K. Updated daily.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://pleasurehub-mu.vercel.app/${cat.id}">
  <meta property="og:title" content="${cat.emoji} ${cat.name} - PleasureHub">
  <meta property="og:description" content="${cat.desc.substring(0, 150)}">
  <meta property="og:url" content="https://pleasurehub-mu.vercel.app/${cat.id}">
  <link rel="stylesheet" href="css/style.css">
  <link rel="alternate" hreflang="en" href="https://pleasurehub-mu.vercel.app/${cat.id}">
  <script type="text/javascript" src="https://acscdn.com/script/aclib.js"></script>
  <script>aclib.runAutoTag({zoneId:'cmbzjmxz1i'});</script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"CollectionPage","name":"${cat.name}","description":"${cat.desc}","url":"https://pleasurehub-mu.vercel.app/${cat.id}"}
  </script>
</head>
<body>
  <header class="top-bar">
    <div class="top-bar-inner">
      <a href="/" class="logo"><span class="logo-icon">P</span> PleasureHub</a>
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="Search videos...">
        <button type="button"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></button>
      </div>
      <div class="header-actions">
        <a href="/category" class="btn-primary"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg><span>Categories</span></a>
      </div>
    </div>
  </header>
  <nav class="main-nav">
    <div class="nav-inner">
      <a href="/" class="nav-item"><span class="nav-icon">🔥</span> Trending</a>
      <a href="/category" class="nav-item"><span class="nav-icon">📂</span> All</a>
      ${CATEGORIES.slice(0, 10).map(c => `<a href="/${c.id}" class="nav-item${c.id === cat.id ? ' active' : ''}"><span class="nav-icon">${c.emoji}</span> ${c.name}</a>`).join('')}
    </div>
  </nav>
  <div class="container">
    <div id="ad-leaderboard" class="ad-container ad-leaderboard"><span class="ad-label">Advertisement</span></div>
    <section class="category-header">
      <h1>${cat.emoji} ${cat.name}</h1>
      <p>${cat.desc}</p>
    </section>
    <div id="ad-rectangle" class="ad-container ad-banner"><span class="ad-label">Advertisement</span></div>
    <section class="content-section">
      <div class="section-title">
        <span>${cat.emoji} ${cat.name} Videos</span>
        <span class="badge">HD & 4K</span>
        <a href="/${cat.id}" class="see-all">See all →</a>
      </div>
      <div class="content-grid" id="categoryGrid"></div>
    </section>
    <div id="ad-native" class="ad-container"><span class="ad-label">Sponsored Content</span></div>
  </div>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="/" class="logo" style="margin-bottom:12px;display:inline-block;"><span class="logo-icon">P</span> PleasureHub</a>
          <p>The largest free adult entertainment portal. Thousands of HD and 4K videos updated daily.</p>
        </div>
        <div class="footer-col">
          <h4>Categories</h4>
          <ul>${CATEGORIES.slice(0, 8).map(c => `<li><a href="/${c.id}">${c.emoji} ${c.name}</a></li>`).join('')}</ul>
        </div>
        <div class="footer-col">
          <h4>Site</h4>
          <ul>
            <li><a href="/privacy">Privacy Policy</a></li>
            <li><a href="/terms">Terms of Service</a></li>
            <li><a href="/dmca">DMCA</a></li>
            <li><a href="/contact">Contact Us</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Partners</h4>
          <ul>
            <li><a href="#">OnlyFans Models</a></li>
            <li><a href="#">Become an Affiliate</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; 2026 PleasureHub. All rights reserved. 18+</span>
        <div class="footer-bottom-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/dmca">DMCA</a>
        </div>
      </div>
    </div>
  </footer>
  <script src="js/data.js"></script>
  <script src="js/main.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const grid = document.getElementById('categoryGrid');
      const videos = SITE_DATA.getByCategory('${cat.id}', 12);
      if (!videos.length) { grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">No videos found</p>'; return; }
      videos.forEach(v => {
        const card = document.createElement('a');
        card.href = '/video/' + v.id;
        card.className = 'content-card';
        card.innerHTML = \`<div class="card-thumb" style="background:\${v.gradient};"><img src="\${v.thumbnail}" alt="\${v.title.replace(/'/g, "\\\\'")}" class="card-thumb-img" loading="lazy" onerror="this.style.display='none'"><div class="card-gradient"></div><span class="quality-badge">\${v.quality}</span><span class="duration-badge">\${v.duration}</span><div class="play-overlay"><div class="play-circle">▶</div></div></div><div class="card-body"><div class="card-title">\${v.title}</div><div class="card-meta"><span class="views">\${v.views}</span><span>⭐ \${(4 + Math.random()).toFixed(1)}</span></div></div>\`;
        grid.appendChild(card);
      });
    });
  </script>
</body>
</html>`;
}

// ============================================
// GENERATE SITEMAP
// ============================================
function generateSitemap(videos) {
  const today = new Date().toISOString().split('T')[0];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">

  <url><loc>https://pleasurehub-mu.vercel.app/</loc><changefreq>daily</changefreq><priority>1.0</priority><lastmod>${today}</lastmod></url>
`;

  CATEGORIES.forEach(c => {
    xml += `  <url><loc>https://pleasurehub-mu.vercel.app/${c.id}</loc><changefreq>daily</changefreq><priority>0.8</priority><lastmod>${today}</lastmod></url>\n`;
  });

  xml += `  <url><loc>https://pleasurehub-mu.vercel.app/category</loc><changefreq>daily</changefreq><priority>0.6</priority><lastmod>${today}</lastmod></url>\n`;

  ['privacy', 'terms', 'dmca', 'contact', 'about', 'blog'].forEach(p => {
    xml += `  <url><loc>https://pleasurehub-mu.vercel.app/${p}</loc><changefreq>monthly</changefreq><priority>0.3</priority><lastmod>${today}</lastmod></url>\n`;
  });

  videos.forEach(v => {
    const t = v.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const d = v.duration.split(':');
    const sec = parseInt(d[0]) * 60 + parseInt(d[1]);
    xml += `  <url><loc>https://pleasurehub-mu.vercel.app/video/${v.id}</loc><lastmod>${v.date}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority><video:video><video:thumbnail_loc>https://pleasurehub-mu.vercel.app/${v.thumbnail}</video:thumbnail_loc><video:title>${t}</video:title><video:description>Watch ${t} for free in ${v.quality} on PleasureHub.</video:description><video:player_loc>${v.embedUrl}</video:player_loc><video:duration>${sec}</video:duration><video:publication_date>${v.date}T08:00:00Z</video:publication_date></video:video></url>\n`;
  });

  xml += `</urlset>`;
  return xml;
}

// ============================================
// MAIN BUILD
// ============================================
console.log('🚀 PLEASUREHUB v2.0 - MASTER REBUILD');
console.log('='.repeat(50));

// 1. Generate videos
console.log('\n📊 Generating video data...');
const videos = generateVideos();
console.log(`   ✅ ${videos.length} videos generated`);

// 2. Write data.js
console.log('\n📝 Writing js/data.js...');
writeFileSync(join(ROOT, 'js', 'data.js'), generateDataJS(videos), 'utf-8');
console.log('   ✅ data.js written');

// 3. Generate video pages
console.log('\n📄 Generating video pages...');
const videoDir = join(ROOT, 'video');
mkdirSync(videoDir, { recursive: true });

// Clear existing video pages
try {
  const existing = readdirSync(videoDir).filter(f => f.endsWith('.html'));
  existing.forEach(f => {
    try { writeFileSync(join(videoDir, f), ''); } catch(e) {}
  });
} catch(e) {}

videos.forEach(v => {
  const html = generateVideoPage(v, videos);
  writeFileSync(join(videoDir, `${v.id}.html`), html, 'utf-8');
});
console.log(`   ✅ ${videos.length} video pages generated`);

// 4. Generate category pages
console.log('\n📄 Generating category pages...');
CATEGORIES.forEach(cat => {
  writeFileSync(join(ROOT, `${cat.id}.html`), generateCategoryPage(cat), 'utf-8');
  console.log(`   ✅ ${cat.id}.html`);
});

// 5. Generate sitemap
console.log('\n🗺️ Generating sitemap.xml...');
const sitemap = generateSitemap(videos);
writeFileSync(join(ROOT, 'sitemap.xml'), sitemap, 'utf-8');
console.log(`   ✅ sitemap.xml (${videos.length} video entries)`);

// 6. Summary
console.log('\n' + '='.repeat(50));
console.log('📋 BUILD SUMMARY:');
console.log(`   Videos: ${videos.length}`);
console.log(`   Categories: ${CATEGORIES.length}`);
console.log(`   Video Pages: ${videos.length}`);
console.log(`   Category Pages: ${CATEGORIES.length}`);
console.log('   Sitemap: ✅');

const catCount = {};
videos.forEach(v => { catCount[v.category] = (catCount[v.category] || 0) + 1; });
Object.entries(catCount).forEach(([cat, count]) => {
  const info = CATEGORIES.find(c => c.id === cat);
  console.log(`   ${info ? info.emoji : '•'} ${info ? info.name : cat}: ${count} videos`);
});

console.log('\n✅ BUILD COMPLETE! All files regenerated with real embed URLs.');
