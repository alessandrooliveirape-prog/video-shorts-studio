/* ============================================
   PLEASUREHUB - Analytics & Tracking
   Google Analytics 4 + Event Tracking + Heatmap
   ============================================ */

const ANALYTICS = {
  // === CONFIGURAÇÃO ===
  // !!! IMPORTANTE: Substitua pelo seu ID de medição GA4 !!!
  GA_MEASUREMENT_ID: 'G-XXXXXXXXXX',
  
  CONFIG: {
    ENABLE_GA: true,
    ENABLE_CUSTOM_EVENTS: true,
    ENABLE_SCROLL_TRACKING: true,
    ENABLE_CLICK_TRACKING: true,
    ENABLE_TIME_TRACKING: true,
  },

  _state: {
    startTime: null,
    scrollDepth: 0,
    pageLoaded: false,
    eventsSent: [],
  },

  /* --- Inicializar Analytics --- */
  init(config = {}) {
    Object.assign(this.CONFIG, config);
    this._state.startTime = Date.now();

    // Google Analytics 4
    if (this.CONFIG.ENABLE_GA && this.GA_MEASUREMENT_ID && !this.GA_MEASUREMENT_ID.includes('XXXXXXXXXX')) {
      this._initGA4();
    } else {
      console.log('[Analytics] GA4 não configurado. Configure o GA_MEASUREMENT_ID');
    }

    // Custom tracking
    if (this.CONFIG.ENABLE_SCROLL_TRACKING) this._initScrollTracking();
    if (this.CONFIG.ENABLE_CLICK_TRACKING) this._initClickTracking();
    if (this.CONFIG.ENABLE_TIME_TRACKING) this._initTimeTracking();

    // Page view
    this.trackPageView();

    console.log('[Analytics] Sistema de tracking inicializado');
  },

  /* --- Google Analytics 4 --- */
  _initGA4() {
    // Carregar script GA4
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Configurar gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', this.GA_MEASUREMENT_ID, {
      send_page_view: false,
      anonymize_ip: true,
    });

    console.log(`[Analytics] GA4 inicializado: ${this.GA_MEASUREMENT_ID}`);
  },

  /* --- Track Page View --- */
  trackPageView() {
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname,
        send_to: this.GA_MEASUREMENT_ID,
      });
    }
    this._state.pageLoaded = true;
  },

  /* --- Track Custom Event --- */
  trackEvent(eventName, params = {}) {
    if (!this.CONFIG.ENABLE_CUSTOM_EVENTS) return;

    const eventData = {
      ...params,
      timestamp: Date.now(),
      page: window.location.pathname,
    };

    // GA4 event
    if (window.gtag) {
      window.gtag('event', eventName, eventData);
    }

    // Log local
    console.log(`[Analytics] Event: ${eventName}`, eventData);
    this._state.eventsSent.push({ eventName, eventData, time: Date.now() });
  },

  /* --- Track Video Events --- */
  trackVideoEvent(action, videoData = {}) {
    this.trackEvent('video_' + action, {
      video_id: videoData.id,
      video_title: videoData.title,
      video_category: videoData.category,
      video_duration: videoData.duration,
      video_quality: videoData.quality,
    });
  },

  /* --- Track Search --- */
  trackSearch(query, resultsCount) {
    this.trackEvent('search', {
      search_term: query,
      results_count: resultsCount,
    });
  },

  /* --- Track Ad Click --- */
  trackAdClick(adType, adLocation) {
    this.trackEvent('ad_click', {
      ad_type: adType,
      ad_location: adLocation,
    });
  },

  /* --- Track Error --- */
  trackError(errorType, errorMessage) {
    this.trackEvent('error', {
      error_type: errorType,
      error_message: errorMessage,
    });
  },

  /* --- Scroll Tracking --- */
  _initScrollTracking() {
    let maxDepth = 0;
    
    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      
      const depth = Math.min(Math.round((scrollTop / docHeight) * 100), 100);
      
      // Trigger at 25%, 50%, 75%, 90%, 100%
      const milestones = [25, 50, 75, 90, 100];
      milestones.forEach(milestone => {
        if (depth >= milestone && maxDepth < milestone) {
          this.trackEvent('scroll_depth', { 
            depth: milestone,
            page: window.location.pathname,
          });
        }
      });
      
      maxDepth = Math.max(maxDepth, depth);
      this._state.scrollDepth = maxDepth;
    }, { passive: true });
  },

  /* --- Click Tracking --- */
  _initClickTracking() {
    document.addEventListener('click', (e) => {
      const target = e.target;
      
      // Track video card clicks
      const card = target.closest('.content-card');
      if (card) {
        const title = card.querySelector('.card-title');
        this.trackEvent('click_video_card', {
          video_title: title ? title.textContent.trim() : 'unknown',
        });
        return;
      }

      // Track navigation clicks
      const navItem = target.closest('.nav-item');
      if (navItem) {
        this.trackEvent('click_nav', {
          nav_text: navItem.textContent.trim(),
        });
        return;
      }

      // Track category chip clicks
      const catChip = target.closest('.cat-chip');
      if (catChip) {
        this.trackEvent('click_category', {
          category: catChip.textContent.trim(),
        });
        return;
      }

      // Track external links
      const link = target.closest('a');
      if (link && link.hostname !== window.location.hostname) {
        this.trackEvent('click_external_link', {
          url: link.href,
          text: link.textContent.trim(),
        });
      }
    }, { passive: true });
  },

  /* --- Time Tracking --- */
  _initTimeTracking() {
    // Track time on page at intervals
    const intervals = [10, 30, 60, 120, 300]; // seconds
    intervals.forEach(seconds => {
      setTimeout(() => {
        this.trackEvent('time_on_page', {
          seconds: seconds,
          page: window.location.pathname,
        });
      }, seconds * 1000);
    });

    // Track engagement before leaving
    window.addEventListener('beforeunload', () => {
      const timeSpent = Math.round((Date.now() - this._state.startTime) / 1000);
      this.trackEvent('session_end', {
        time_spent_seconds: timeSpent,
        scroll_depth: this._state.scrollDepth,
        events_count: this._state.eventsSent.length,
      });
    });
  },

  /* --- User Properties --- */
  setUserProperty(name, value) {
    if (window.gtag) {
      window.gtag('set', 'user_properties', {
        [name]: value,
      });
    }
  },

  /* --- Consent Mode --- */
  setConsent(granted = true) {
    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: granted ? 'granted' : 'denied',
        ad_storage: granted ? 'granted' : 'denied',
        ad_user_data: granted ? 'granted' : 'denied',
        ad_personalization: granted ? 'granted' : 'denied',
      });
    }
  },
};

// Export global
window.ANALYTICS = ANALYTICS;
