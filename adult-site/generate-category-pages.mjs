/* ============================================
   PLEASUREHUB - Category Pages Generator
   Gera páginas HTML individuais para SEO
   ============================================ */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const categories = [
  { id: 'milf', name: 'MILF', emoji: '🔥', count: 1248, desc: 'As MILFs mais gostosas do Brasil. Vídeos de MILFs coroas, maduras e saradas. Conteúdo exclusivo de MILFs brasileiras em HD e 4K.', keywords: 'milf, coroa gostosa, milf brasileira, mãe gostosa, milf onlyfans, coroa fogosa, milf madura, vídeos milf' },
  { id: 'latina', name: 'Latina', emoji: '💃', count: 892, desc: 'Latinas gostosas de todo o mundo. Vídeos de mulheres latinas, espanholas, colombianas, mexicanas e argentinas. Conteúdo latino em HD.', keywords: 'latina gostosa, espanhola, colombiana, mexicana, latina onlyfans, mulher latina, vídeos latinas' },
  { id: 'amador', name: 'Amador', emoji: '📱', count: 2456, desc: 'Os melhores vídeos amadores brasileiros. Conteúdo caseiro real, gravações amadoras, webcam e onlyfans vazado. Tudo em HD e 4K.', keywords: 'amador, caseiro, vídeo amador brasileiro, onlyfans vazado, webcam amadora, gravação caseira, sexo amador' },
  { id: 'hentai', name: 'Hentai', emoji: '🎨', count: 1763, desc: 'O melhor hentai 3D e animado. Hentai MILF, futanari, yuri, tentáculo e muito mais. Animações adultas em HD e 4K dubladas em português.', keywords: 'hentai, anime hentai, hentai 3d, hentai dublado, hentai futanari, hentai yuri, animação adulta' },
  { id: 'lesbian', name: 'Lésbicas', emoji: '💋', count: 987, desc: 'Vídeos lésbicos reais e amadores. Mulheres gostosas se divertindo juntas. Conteúdo lésbico brasileiro e internacional em HD.', keywords: 'lébicas, sexo lésbico, mulheres gostosas, lésbicas brasileiras, sexo entre mulheres, vídeos lésbicos' },
  { id: 'brasileiras', name: 'Brasileiras', emoji: '🇧🇷', count: 1534, desc: 'As brasileiras mais gostosas do OnlyFans e da internet. Mulheres do Brasil em vídeos adultos exclusivos. Brasileira rebolando e muito mais.', keywords: 'brasileira gostosa, onlyfans brasileiro, brasileira rebolando, mulher brasileira, brazilian, vídeos brasileiros' },
  { id: 'anal', name: 'Anal', emoji: '🔞', count: 2103, desc: 'Os melhores vídeos de sexo anal. Brasileiras dando o cu, anal amador, onlyfans anal e muito mais. Conteúdo anal em HD e 4K.', keywords: 'anal, sexo anal, dando o cu, anal gostoso, onlyfans anal, brasileira anal, cu gostoso' },
  { id: 'teen', name: '18+ Novinhas', emoji: '🌸', count: 1342, desc: 'Novinhas de 18 anos se divertindo. Conteúdo adulto com jovens maiores de idade. Novinhas brasileiras gostosas em HD.', keywords: 'novinha, 18 anos, novinha gostosa, jovem, onlyfans novinha, primeiras vezes, novinha brasileira' },
  { id: 'gangbang', name: 'Gang Bang', emoji: '🔥', count: 678, desc: 'Os melhores gang bangs e orgias. Mulher com vários homens, sexo grupal e suruba. Conteúdo explícito em HD e 4K.', keywords: 'gangbang, orgia, suruba, sexo grupal, mulher varios homens, gang bang brasileiro' },
  { id: 'solo', name: 'Solo', emoji: '✊', count: 1567, desc: 'Masturbação e vídeos solo. Mulheres se tocando e se divertindo sozinhas. Webcam solo, brinquedos e muito mais em HD.', keywords: 'solo, masturbação, mulher se tocando, webcam solo, brinquedos sexuais, gozando sozinha' },
  { id: 'casal', name: 'Casal Amador', emoji: '💑', count: 1890, desc: 'Casais amadores transando gostoso. Vídeos caseiros de casais reais se amando. Conteúdo de casal em HD e 4K.', keywords: 'casal, casal amador, transando, namorados, marido e mulher, sexo caseiro, vídeos de casal' },
  { id: 'fetish', name: 'Fetiche', emoji: '⛓️', count: 723, desc: 'Fetiches e BDSM. Conteúdo fetichista para todos os gostos. Algemas, couro, dominação e muito mais em HD.', keywords: 'fetiche, bdsm, algemas, dominação, fetichista, sexo bdsm, fetiche brasileiro' },
  { id: 'orgy', name: 'Suruba', emoji: '🎉', count: 456, desc: 'Surubas e orgias completas. Sexo grupal com várias pessoas. Melhores surubas brasileiras em HD e 4K.', keywords: 'suruba, orgia, sexo grupal, orgia brasileira, suruba completa, mulher varios homens' },
  { id: 'trans', name: 'Trans', emoji: '⚧️', count: 892, desc: 'Mulheres trans gostosas. Conteúdo trans brasileiro e internacional. Travestis e transsexuais em vídeos HD exclusivos.', keywords: 'trans, travesti, mulher trans, trans brasileira, onlyfans trans, transsexuais, vídeos trans' },
  { id: 'interracial', name: 'Interracial', emoji: '🌍', count: 634, desc: 'Sexo interracial. Mulheres e homens de todas as raças e cores. Conteúdo interracial brasileiro em HD e 4K.', keywords: 'interracial, sexo interracial, interracial brasileiro, raças, mulher negra, sexo entre raças' },
  { id: 'cosplay', name: 'Cosplay', emoji: '🎭', count: 567, desc: 'Cosplay adulto e fantasia. Personagens animados e de games em versão adulta. Conteúdo cosplay onlyfans em HD e 4K.', keywords: 'cosplay, fantasia, cosplay adulto, personagens, onlyfans cosplay, cosplay brasileiro, fantasia erótica' },
];

const TEMPLATE = (cat) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cat.emoji} ${cat.name} - Vídeos Adultos Grátis | PleasureHub</title>
  <meta name="description" content="${cat.desc}">
  <meta name="keywords" content="${cat.keywords}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://pleasurehub.com/${cat.id}.html">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${cat.emoji} ${cat.name} - PleasureHub">
  <meta property="og:description" content="${cat.desc.substring(0, 150)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://pleasurehub.com/${cat.id}.html">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${cat.emoji} ${cat.name} - PleasureHub">
  
  <link rel="stylesheet" href="css/style.css">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='url(%23g)'/><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='%23ff2d5c'/><stop offset='1' stop-color='%23b829e0'/></linearGradient></defs><text x='16' y='22' font-size='18' fill='white' text-anchor='middle'>P</text></svg>">

  <!-- Schema Markup -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "${cat.emoji} ${cat.name}",
    "description": "${cat.desc}",
    "url": "https://pleasurehub.com/${cat.id}.html",
    "about": {
      "@type": "Thing",
      "name": "${cat.name}"
    }
  }
  </script>
</head>
<body>
  <!-- TOP BAR -->
  <header class="top-bar">
    <div class="top-bar-inner">
      <a href="index.html" class="logo"><span class="logo-icon">P</span> PleasureHub</a>
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="Pesquisar vídeos..." aria-label="Pesquisar">
        <button type="button" aria-label="Buscar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
        </button>
      </div>
      <div class="header-actions">
        <button class="btn-icon" aria-label="Favoritos">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        <a href="category.html" class="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
          <span>Categorias</span>
        </a>
      </div>
    </div>
  </header>

  <!-- NAV -->
  <nav class="main-nav">
    <div class="nav-inner">
      <a href="index.html" class="nav-item"><span class="nav-icon">🔥</span> Em Alta</a>
      <a href="category.html" class="nav-item"><span class="nav-icon">📂</span> Todas</a>
      <a href="brasileiras.html" class="nav-item"><span class="nav-icon">🇧🇷</span> Brasileiras</a>
      <a href="milf.html" class="nav-item"><span class="nav-icon">🔥</span> MILF</a>
      <a href="latina.html" class="nav-item"><span class="nav-icon">💃</span> Latina</a>
      <a href="amador.html" class="nav-item"><span class="nav-icon">📱</span> Amador</a>
      <a href="hentai.html" class="nav-item"><span class="nav-icon">🎨</span> Hentai</a>
      <a href="lesbian.html" class="nav-item"><span class="nav-icon">💋</span> Lésbicas</a>
    </div>
  </nav>

  <!-- AD LEADERBOARD -->
  <div class="container">
    <div id="ad-leaderboard" class="ad-container ad-leaderboard"><span class="ad-label">Publicidade</span></div>
  </div>

  <!-- CATEGORY HEADER -->
  <section class="category-header">
    <div class="container">
      <h1>${cat.emoji} ${cat.name}</h1>
      <p>${cat.desc} Mais de ${cat.count} vídeos disponíveis gratuitamente.</p>
    </div>
  </section>

  <!-- CATEGORY LEGAL PAGES DESC -->
  <div class="container" style="max-width:800px;margin-bottom:24px;">
    <div style="background:var(--bg-card);padding:24px;border-radius:var(--radius-lg);border:1px solid var(--border-color);">
      <h2 style="font-size:1.1rem;font-weight:700;margin-bottom:12px;">📖 Sobre a categoria <strong>${cat.name}</strong></h2>
      <p style="color:var(--text-secondary);line-height:1.8;font-size:0.9rem;">
        Bem-vindo à categoria <strong>${cat.name}</strong> do PleasureHub. Aqui você encontra os melhores vídeos 
        adultos desta categoria, todos gratuitos e em alta qualidade. São mais de ${cat.count} vídeos disponíveis 
        em HD e 4K, atualizados diariamente com conteúdo novo e exclusivo. Navegue pelos nossos vídeos, use os 
        filtros para encontrar exatamente o que procura e aproveite o melhor entretenimento adulto da internet. 
        Todo o conteúdo é destinado exclusivamente para maiores de 18 anos.
      </p>
    </div>
  </div>

  <!-- AD RECTANGLE -->
  <div class="container">
    <div id="ad-rectangle" class="ad-container ad-banner"><span class="ad-label">Publicidade</span></div>
  </div>

  <!-- CONTENT GRID -->
  <section class="content-section">
    <div class="container">
      <div class="section-title">
        <span>${cat.emoji} ${cat.name} - Vídeos em Destaque</span>
        <span class="badge">${cat.count}+ vídeos</span>
        <a href="category.html?cat=${cat.id}" class="see-all">Ver todos →</a>
      </div>
      <div class="content-grid" id="categoryGrid">
        <!-- Populated by JS -->
      </div>
    </div>
  </section>

  <!-- PAGINATION -->
  <div class="container">
    <div class="pagination">
      <button class="page-btn active">1</button>
      <button class="page-btn">2</button>
      <button class="page-btn">3</button>
      <button class="page-btn">4</button>
      <button class="page-btn">5</button>
      <span style="color:var(--text-muted);padding:0 8px;">...</span>
      <button class="page-btn">${Math.ceil(cat.count / 24)}</button>
    </div>
  </div>

  <!-- AD NATIVE -->
  <div class="container">
    <div id="ad-native" class="ad-container"><span class="ad-label">Conteúdo Patrocinado</span></div>
  </div>

  <!-- SEO CONTENT -->
  <div class="container" style="max-width:800px;margin-bottom:24px;">
    <div style="background:var(--bg-card);padding:24px;border-radius:var(--radius-lg);border:1px solid var(--border-color);">
      <h2 style="font-size:1.1rem;font-weight:700;margin-bottom:12px;">🔍 Mais sobre ${cat.name}</h2>
      <div style="color:var(--text-secondary);line-height:1.8;font-size:0.9rem;">
        <p style="margin-bottom:12px;">
          O PleasureHub é o maior portal de conteúdo adulto do Brasil, e nossa categoria <strong>${cat.name}</strong> 
          é uma das mais populares do site. Com mais de ${cat.count} vídeos disponíveis, você encontra desde 
          conteúdo amador até produções profissionais em 4K.
        </p>
        <p style="margin-bottom:12px;">
          Todos os vídeos são gratuitos e podem ser assistidos diretamente no site, sem necessidade de cadastro. 
          Nosso conteúdo é atualizado diariamente para garantir que você sempre tenha novidades para assistir.
        </p>
        <p>
          O PleasureHub respeita as leis de direitos autorais e todo o conteúdo é verificado para garantir que 
          está em conformidade com o DMCA. Para remoção de conteúdo, visite nossa 
          <a href="dmca.html" style="color:var(--accent-primary);">página DMCA</a>.
        </p>

        <h3 style="color:var(--text-primary);font-weight:700;margin:20px 0 8px;">Palavras-chave relacionadas</h3>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${cat.keywords.split(', ').map(kw => `<span style="padding:4px 12px;background:var(--bg-hover);border-radius:16px;font-size:0.75rem;">${kw}</span>`).join('\n          ')}
        </div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="index.html" class="logo" style="margin-bottom:12px;display:inline-block;"><span class="logo-icon">P</span> PleasureHub</a>
          <p>O maior portal de entretenimento adulto gratuito do Brasil. Milhares de vídeos em HD e 4K.</p>
        </div>
        <div class="footer-col">
          <h4>Categorias</h4>
          <ul>
            <li><a href="brasileiras.html">Brasileiras</a></li>
            <li><a href="milf.html">MILF</a></li>
            <li><a href="latina.html">Latina</a></li>
            <li><a href="amador.html">Amador</a></li>
            <li><a href="hentai.html">Hentai</a></li>
            <li><a href="lesbian.html">Lésbicas</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Site</h4>
          <ul>
            <li><a href="privacy.html">Política de Privacidade</a></li>
            <li><a href="terms.html">Termos de Uso</a></li>
            <li><a href="dmca.html">DMCA / Remoção</a></li>
            <li><a href="contact.html">Fale Conosco</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Parceiros</h4>
          <ul>
            <li><a href="#">OnlyFans Models</a></li>
            <li><a href="#">Seja um Afiliado</a></li>
            <li><a href="#">Anuncie Conosco</a></li>
            <li><a href="#">AdCash Ads</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; 2025 PleasureHub. Todos os direitos reservados. 18+</span>
        <div class="footer-bottom-links">
          <a href="privacy.html">Privacidade</a>
          <a href="terms.html">Termos</a>
          <a href="dmca.html">DMCA</a>
        </div>
      </div>
    </div>
  </footer>

  <script src="js/data.js"></script>
  <script src="js/adcash.js"></script>
  <script src="js/main.js"></script>
  <script src="js/analytics.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const videos = SITE_DATA.getVideosByCategory('${cat.id}').slice(0, 12);
      const grid = document.getElementById('categoryGrid');
      
      if (videos.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">Nenhum vídeo encontrado nesta categoria.</p>';
        return;
      }
      
      videos.forEach(v => {
        const card = document.createElement('a');
        card.href = \`video.html?id=\${v.id}\`;
        card.className = 'content-card';
        card.innerHTML = \`
          <div class="card-thumb" style="background: \${v.gradient};">
            <div class="card-gradient"></div>
            <span class="quality-badge">\${v.quality}</span>
            <span class="duration-badge">\${v.duration}</span>
            <div class="play-overlay"><div class="play-circle">▶</div></div>
          </div>
          <div class="card-body">
            <div class="card-title">\${v.title}</div>
            <div class="card-meta"><span class="views">\${v.views}</span><span>⭐ \${(4 + Math.random()).toFixed(1)}</span></div>
          </div>
        \`;
        grid.appendChild(card);
      });

      // Init analytics
      if (window.ANALYTICS) {
        ANALYTICS.init();
      }
    });
  </script>
</body>
</html>`;

// Generate all category pages
categories.forEach(cat => {
  const html = TEMPLATE(cat);
  const filename = join(__dirname, `${cat.id}.html`);
  writeFileSync(filename, html, 'utf-8');
  console.log(`✅ Created: ${cat.id}.html (${cat.name})`);
});

console.log('\n🎯 Todas as ${categories.length} páginas de categoria foram geradas com sucesso!');
