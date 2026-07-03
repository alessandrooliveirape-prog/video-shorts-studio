/* ============================================
   PLEASUREHUB - AdCash Banner Rendering
   Apenas renderização de banners em containers.
   Pop-under, Push e Interstitial são gerenciados
   automaticamente pelo aclib.runAutoTag no <head>.
   ============================================ */

const ADCASH = {
  // Zone IDs para banners específicos
  ZONES: {
    BANNER_728x90: 'BANNER_728_ZONE_ID',
    BANNER_300x250: 'BANNER_300_ZONE_ID',
    NATIVE: 'NATIVE_ZONE_ID',
  },

  /* --- Banner Ad --- */
  renderBanner(containerId, zoneKey = 'BANNER_728x90') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const zoneId = this.ZONES[zoneKey];
    if (!zoneId || zoneId.includes('ZONE_ID')) {
      this._renderPlaceholder(container, zoneKey);
      return;
    }

    const script = document.createElement('script');
    script.src = `//adcash.com/ad/zone/${zoneId}`;
    script.async = true;
    container.appendChild(script);
  },

  /* --- Native Ads --- */
  renderNative(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const zoneId = this.ZONES.NATIVE;
    if (!zoneId || zoneId.includes('ZONE_ID')) {
      this._renderPlaceholder(container, 'NATIVE');
      return;
    }

    const script = document.createElement('script');
    script.src = `//adcash.com/ad/zone/${zoneId}`;
    script.async = true;
    container.appendChild(script);
  },

  /* --- Carregar todos os banners da página --- */
  loadPageAds() {
    this.renderBanner('ad-leaderboard', 'BANNER_728x90');
    this.renderBanner('ad-rectangle', 'BANNER_300x250');
    this.renderNative('ad-native');
  },

  /* --- Placeholder visual (enquanto não configura IDs reais) --- */
  _renderPlaceholder(container, type) {
    const labels = {
      'BANNER_728x90': 'Anúncio 728x90',
      'BANNER_300x250': 'Anúncio 300x250',
      'NATIVE': 'Anúncio Nativo',
    };

    container.innerHTML = `
      <div class="ad-placeholder-content">
        <div class="ad-icon">📢</div>
        <p>${labels[type] || 'Espaço Publicitário'}</p>
        <small>AdCash - Configure seu ID de publisher</small>
      </div>
    `;
  },

  /* --- Rastrear evento --- */
  trackEvent(eventName, data = {}) {
    console.log(`[AdCash Track] ${eventName}`, data);
  }
};

// Export para uso global
window.ADCASH = ADCASH;
