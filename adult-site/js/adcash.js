/* ============================================
   PLEASUREHUB - AdCash Integration
   Monetização com AdCash - Pop-under, Banners & Push
   ============================================ */

const ADCASH = {
  // === CONFIGURAÇÃO ===
  // !!! IMPORTANTE: Substitua pelo seu ID de publisher AdCash !!!
  PUBLISHER_ID: 'SEU_ID_ADCASH_AQUI',
  
  // Zonas de anúncio - crie no painel AdCash
  ZONES: {
    POP_UNDER: 'POP_UNDER_ZONE_ID',
    BANNER_728x90: 'BANNER_728_ZONE_ID',
    BANNER_300x250: 'BANNER_300_ZONE_ID',
    NATIVE: 'NATIVE_ZONE_ID',
    INTERSTITIAL: 'INTERSTITIAL_ZONE_ID',
  },

  // Configurações
  CONFIG: {
    POP_UNDER_DELAY: 3000,        // Delay para pop-under (ms)
    POP_UNDER_INTERVAL: 60000,    // Intervalo mínimo entre pop-unders
    INTERSTITIAL_INTERVAL: 120000, // Intervalo mínimo entre interstitials
    ENABLE_PUSH: true,            // Ativar push notifications?
    ENABLE_ANTI_ADBLOCK: true,    // Tentar recuperar bloqueadores?
  },

  // Estado interno
  _state: {
    lastPopUnder: 0,
    lastInterstitial: 0,
    pushSubscribed: false,
    adblockDetected: false,
  },

  /* --- Inicializar AdCash --- */
  init(config = {}) {
    Object.assign(this.CONFIG, config);
    
    // Detectar adblock
    if (this.CONFIG.ENABLE_ANTI_ADBLOCK) {
      this._detectAdblock();
    }

    // Push notifications
    if (this.CONFIG.ENABLE_PUSH) {
      this._initPush();
    }

    // Pop-under na primeira interação
    this._initPopUnderOnClick();

    console.log('[AdCash] Inicializado com sucesso!');
    console.log(`[AdCash] Pop-under delay: ${this.CONFIG.POP_UNDER_DELAY}ms`);
  },

  /* --- Pop-Under Ad --- */
  showPopUnder() {
    const now = Date.now();
    if (now - this._state.lastPopUnder < this.CONFIG.POP_UNDER_INTERVAL) {
      console.log('[AdCash] Pop-under ignorado (intervalo mínimo)');
      return;
    }

    this._state.lastPopUnder = now;

    // Método: Pop-under via window.open com about:blank
    try {
      const popUnder = window.open('', '_blank');
      if (popUnder) {
        // Redirecionar o pop-under para o AdCash
        popUnder.location.href = this._buildAdUrl('POP_UNDER');
        console.log('[AdCash] Pop-under exibido com sucesso');
      }
    } catch (e) {
      console.warn('[AdCash] Erro ao abrir pop-under:', e);
      // Fallback: redirect simulado
      this._fallbackPopUnder();
    }
  },

  /* --- Banner Ad --- */
  renderBanner(containerId, zoneKey = 'BANNER_728x90') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const zoneId = this.ZONES[zoneKey];
    if (!zoneId || zoneId.includes('ZONE_ID')) {
      // Placeholder enquanto não configura o ID real
      this._renderPlaceholder(container, zoneKey);
      return;
    }

    // Script do AdCash para banner
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

  /* --- Carregar todos os anúncios da página --- */
  loadPageAds() {
    // Banner leaderboard
    this.renderBanner('ad-leaderboard', 'BANNER_728x90');
    
    // Banner sidebar/rectangle
    this.renderBanner('ad-rectangle', 'BANNER_300x250');
    
    // Native ads
    this.renderNative('ad-native');
    
    // Interstitial com delay
    setTimeout(() => {
      this._tryInterstitial();
    }, this.CONFIG.INTERSTITIAL_INTERVAL);
  },

  /* --- Privado: Build AdCash URL --- */
  _buildAdUrl(zoneKey) {
    const zoneId = this.ZONES[zoneKey];
    if (!zoneId || zoneId.includes('ZONE_ID')) {
      return `https://adcash.com/click/${this.PUBLISHER_ID}`;
    }
    return `https://adcash.com/ad/redirect/${zoneId}?p=${this.PUBLISHER_ID}`;
  },

  /* --- Privado: Iniciar pop-under no clique --- */
  _initPopUnderOnClick() {
    document.addEventListener('click', (e) => {
      // Não disparar em links ou botões específicos
      if (e.target.closest('a') || e.target.closest('.no-pop')) return;
      
      setTimeout(() => {
        this.showPopUnder();
      }, this.CONFIG.POP_UNDER_DELAY);
    }, { passive: true });
  },

  /* --- Privado: Fallback pop-under --- */
  _fallbackPopUnder() {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = this._buildAdUrl('POP_UNDER');
    document.body.appendChild(iframe);
    setTimeout(() => {
      iframe.remove();
    }, 5000);
  },

  /* --- Privado: Tentar interstitial --- */
  _tryInterstitial() {
    const now = Date.now();
    if (now - this._state.lastInterstitial < this.CONFIG.INTERSTITIAL_INTERVAL) return;
    
    this._state.lastInterstitial = now;
    
    const zoneId = this.ZONES.INTERSTITIAL;
    if (!zoneId || zoneId.includes('ZONE_ID')) {
      console.log('[AdCash] Interstitial: Configure a Zona no painel AdCash');
      return;
    }

    const script = document.createElement('script');
    script.src = `//adcash.com/ad/zone/${zoneId}`;
    script.async = true;
    document.body.appendChild(script);
  },

  /* --- Privado: Push Notifications --- */
  _initPush() {
    if (!('Notification' in window) || this._state.pushSubscribed) return;
    
    // Push via AdCash
    const zoneId = this.ZONES.NATIVE;
    if (!zoneId || zoneId.includes('ZONE_ID')) return;

    // Push notification script
    const script = document.createElement('script');
    script.src = `//adcash.com/ad/push/${this.PUBLISHER_ID}`;
    script.async = true;
    document.head.appendChild(script);
  },

  /* --- Privado: Detectar AdBlock --- */
  _detectAdblock() {
    const test = document.createElement('div');
    test.innerHTML = '&nbsp;';
    test.className = 'adsbox';
    test.style.cssText = 'position:absolute;left:-9999px;height:1px;width:1px;overflow:hidden;';
    document.body.appendChild(test);

    setTimeout(() => {
      if (test.offsetHeight === 0) {
        this._state.adblockDetected = true;
        console.log('[AdCash] AdBlock detectado - tentando recuperação');
        this._antiAdblockRecovery();
      }
      test.remove();
    }, 100);
  },

  /* --- Privado: Recuperação Anti-AdBlock --- */
  _antiAdblockRecovery() {
    // Tenta carregar anúncios via iframe com domínios alternativos
    const domains = [
      'https://adcash.com',
      'https://adcash.org',
      'https://adcash.net',
    ];

    domains.forEach(domain => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = `${domain}/ad/pixel/${this.PUBLISHER_ID}`;
      document.body.appendChild(iframe);
      setTimeout(() => iframe.remove(), 3000);
    });
  },

  /* --- Placeholder visual para desenvolvimento --- */
  _renderPlaceholder(container, type) {
    const labels = {
      'BANNER_728x90': 'Anúncio 728x90',
      'BANNER_300x250': 'Anúncio 300x250',
      'NATIVE': 'Anúncio Nativo',
      'POP_UNDER': 'Pop-Under',
      'INTERSTITIAL': 'Interstitial',
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
    if (!this.PUBLISHER_ID || this.PUBLISHER_ID === 'SEU_ID_ADCASH_AQUI') return;
    
    console.log(`[AdCash Track] ${eventName}`, data);
    // Implementar tracking pixel se necessário
    const img = new Image();
    img.src = `https://adcash.com/track/${this.PUBLISHER_ID}?event=${eventName}&t=${Date.now()}`;
    img.style.display = 'none';
    document.body.appendChild(img);
    setTimeout(() => img.remove(), 1000);
  }
};

// Export para uso global
window.ADCASH = ADCASH;
