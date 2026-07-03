/* ============================================
   PLEASUREHUB - Video Embed System
   Suporta: XVideos, Pornhub, XHamster, XNXX, RedTube
   ============================================ */

const EMBED = {
  /* --- Plataformas suportadas --- */
  PLATFORMS: {
    xvideos: {
      name: 'XVideos',
      embedTemplate: (id) => `https://www.xvideos.com/embedframe/${id}`,
      thumbTemplate: (id) => `https://img-hw.xvideos-cdn.com/videos/thumbs169ll/${id.split('/')[0]}/${id.split('/')[1]}_169.jpg`,
      detect: (url) => {
        const m = url.match(/(?:xvideos\.com\/video|xvideos\.com\/embedframe)\/([a-z0-9]+)/i);
        return m ? m[1] : null;
      }
    },
    pornhub: {
      name: 'Pornhub',
      embedTemplate: (id) => `https://www.pornhub.com/embed/${id}`,
      thumbTemplate: (id) => `https://ci.phncdn.com/videos/202501/01/${id}/thumb_168.jpg`,
      detect: (url) => {
        const m = url.match(/(?:pornhub\.com\/view_video\.php\?viewkey=|pornhub\.com\/embed\/)([a-z0-9]+)/i);
        return m ? m[1] : null;
      }
    },
    xhamster: {
      name: 'XHamster',
      embedTemplate: (id) => `https://xhamster.com/embed/${id}`,
      detect: (url) => {
        const m = url.match(/(?:xhamster\.com\/videos\/|xhamster\.com\/embed\/)([a-z0-9-]+)/i);
        return m ? m[1] : null;
      }
    },
    xnxx: {
      name: 'XNXX',
      embedTemplate: (id) => `https://www.xnxx.com/embedframe/${id}`,
      detect: (url) => {
        const m = url.match(/(?:xnxx\.com\/video-|xnxx\.com\/embedframe\/)([a-z0-9]+)/i);
        return m ? m[1] : null;
      }
    },
    redtube: {
      name: 'RedTube',
      embedTemplate: (id) => `https://www.redtube.com/embed/${id}`,
      detect: (url) => {
        const m = url.match(/(?:redtube\.com\/|redtube\.com\/embed\/)([a-z0-9]+)/i);
        return m ? m[1] : null;
      }
    },
    generic: {
      name: 'Embed',
      embedTemplate: (url) => url,
      detect: (url) => url.match(/^https?:\/\//) ? url : null
    }
  },

  /* --- Detectar plataforma e extrair ID --- */
  detectPlatform(url) {
    if (!url) return null;
    for (const [key, platform] of Object.entries(this.PLATFORMS)) {
      const id = platform.detect(url);
      if (id) {
        return { platform: key, id, ...platform };
      }
    }
    // Se não detectou nenhuma, tenta usar a URL diretamente (embed genérico)
    if (url.match(/^https?:\/\//)) {
      return { platform: 'generic', id: url, name: 'External', embedTemplate: () => url };
    }
    return null;
  },

  /* --- Construir URL de embed --- */
  buildEmbedUrl(url) {
    const info = this.detectPlatform(url);
    if (!info) return null;
    return info.embedTemplate(info.id);
  },

  /* --- Renderizar iframe de embed --- */
  renderEmbed(container, url, options = {}) {
    if (!container) return;

    const embedUrl = this.buildEmbedUrl(url);
    if (!embedUrl) {
      container.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--text-muted);">
          <div style="font-size:3rem;margin-bottom:12px;">⚠️</div>
          <p>URL de embed inválida ou não reconhecida.</p>
          <p style="font-size:0.8rem;margin-top:8px;">URL: ${url}</p>
        </div>
      `;
      return;
    }

    const allowAttr = options.allow || 'autoplay; encrypted-media; picture-in-picture';
    const width = options.width || '100%';
    const height = options.height || '100%';

    const platformName = this.getPlatformName(url);
    const originalUrl = this.getOriginalUrl(url);

    container.innerHTML = `
      <div style="position:relative;width:100%;height:100%;">
        <iframe
          src="${embedUrl}"
          width="${width}"
          height="${height}"
          frameborder="0"
          scrolling="no"
          allowfullscreen
          allow="${allowAttr}"
          loading="lazy"
          class="embed-iframe"
        ></iframe>
        <span class="embed-badge">🎬 ${platformName}</span>
        <a href="${originalUrl}" target="_blank" rel="noopener" class="embed-original-link">↗ Original</a>
      </div>
    `;
  },

  /* --- Detectar se URL é de vídeo incorporável --- */
  isValidEmbedUrl(url) {
    const info = this.detectPlatform(url);
    return info !== null;
  },

  /* --- Pegar nome amigável da plataforma --- */
  getPlatformName(url) {
    const info = this.detectPlatform(url);
    return info ? info.name : 'Desconhecido';
  },

  /* --- Obter link para página original --- */
  getOriginalUrl(url) {
    const info = this.detectPlatform(url);
    if (!info || info.platform === 'generic') return url;
    // Retornar a URL original baseada no ID
    switch (info.platform) {
      case 'xvideos': return `https://www.xvideos.com/video${info.id}`;
      case 'pornhub': return `https://www.pornhub.com/view_video.php?viewkey=${info.id}`;
      case 'xhamster': return `https://xhamster.com/videos/${info.id}`;
      case 'xnxx': return `https://www.xnxx.com/video-${info.id}`;
      case 'redtube': return `https://www.redtube.com/${info.id}`;
      default: return url;
    }
  },

  /* --- Carregar embed no player (com animação) --- */
  loadIntoPlayer(containerId, embedUrl, videoTitle = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Animação de transição
    container.style.opacity = '0';
    container.style.transition = 'opacity 0.3s ease';

    setTimeout(() => {
      this.renderEmbed(container, embedUrl, {
        allow: 'autoplay; encrypted-media; picture-in-picture'
      });
      container.style.opacity = '1';
    }, 300);
  }
};

// Export global
window.EMBED = EMBED;
