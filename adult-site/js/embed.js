/* ============================================
   PLEASUREHUB - Professional Video Player System
   Suporta: HTML5 Native + Iframe Embeds
   Estilo: XVideos / PornHub / RedTube quality
   ============================================ */

const EMBED = {
  /* --- Config --- */
  CONFIG: {
    AUTOPLAY: false,
    VOLUME: 1,
    PLAYBACK_SPEED: 1,
    DEFAULT_QUALITY: 'auto',
    THEME: {
      primary: '#ff2d5c',
      secondary: '#b829e0',
      bg: 'rgba(0,0,0,0.85)',
      text: '#ffffff',
      textMuted: '#a0a0b8'
    }
  },

  /* --- Plataformas suportadas para iframe embed --- */
  PLATFORMS: {
    xvideos: {
      name: 'XVideos',
      embedTemplate: (id) => `https://www.xvideos.com/embedframe/${id}`,
      detect: (url) => {
        const m = url.match(/(?:xvideos\.com\/video|xvideos\.com\/embedframe)\/([a-z0-9]+)/i);
        return m ? m[1] : null;
      }
    },
    pornhub: {
      name: 'Pornhub',
      embedTemplate: (id) => `https://www.pornhub.com/embed/${id}`,
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
    eporner: {
      name: 'Eporner',
      embedTemplate: (id) => `https://www.eporner.com/embed/${id}`,
      detect: (url) => {
        const m = url.match(/eporner\.com\/embed\/([a-z0-9]+)/i);
        return m ? m[1] : null;
      }
    }
  },

  /* --- Detectar se URL é embed de iframe válido --- */
  detectIframePlatform(url) {
    if (!url) return null;
    for (const [key, platform] of Object.entries(this.PLATFORMS)) {
      const id = platform.detect(url);
      if (id) return { platform: key, id, ...platform };
    }
    return null;
  },

  /* --- Verificar se URL é de vídeo direto (MP4, WebM, etc) --- */
  isDirectVideoUrl(url) {
    if (!url) return false;
    return /\.(mp4|webm|ogg|mov|m3u8)(\?.*)?$/i.test(url);
  },

  /* ============================================
     HTML5 NATIVE PLAYER
     ============================================ */

  /**
   * Criar um player HTML5 nativo completo com controles customizados
   */
  createNativePlayer(container, videoUrl, options = {}) {
    const self = this;
    const playerId = 'player-' + Date.now();

    const html = `
      <div class="ph-player" id="${playerId}" style="position:relative;width:100%;height:100%;background:#000;overflow:hidden;user-select:none;">
        <video class="ph-player-video" playsinline webkit-playsinline="true" style="width:100%;height:100%;object-fit:contain;background:#000;display:block;">
          <source src="${videoUrl}" type="video/mp4">
          Your browser does not support HTML5 video.
        </video>

        <!-- Controls Overlay -->
        <div class="ph-player-overlay" style="position:absolute;inset:0;z-index:10;cursor:pointer;display:flex;flex-direction:column;justify-content:flex-end;">
          
          <!-- Top gradient -->
          <div class="ph-gradient-top" style="position:absolute;top:0;left:0;right:0;height:80px;background:linear-gradient(180deg,rgba(0,0,0,0.7),transparent);pointer-events:none;z-index:1;"></div>
          
          <!-- Center Play Button (big) -->
          <div class="ph-center-play" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:5;text-align:center;pointer-events:none;opacity:1;transition:opacity 0.3s ease;">
            <div class="ph-big-play-btn" style="width:80px;height:80px;background:linear-gradient(135deg,#ff2d5c,#b829e0);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;box-shadow:0 0 40px rgba(255,45,92,0.3);transition:transform 0.2s ease,box-shadow 0.2s ease;">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="white"><polygon points="8,5 19,12 8,19"/></svg>
            </div>
          </div>

          <!-- Loading Spinner -->
          <div class="ph-loading" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:4;display:none;">
            <svg width="48" height="48" viewBox="0 0 50 50" style="animation:ph-spin 1s linear infinite;">
              <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="4"/>
              <circle cx="25" cy="25" r="20" fill="none" stroke="#ff2d5c" stroke-width="4" stroke-linecap="round" stroke-dasharray="80,200" stroke-dashoffset="0" style="animation:ph-dash 1.5s ease-in-out infinite;"/>
            </svg>
          </div>

          <!-- Video title badge -->
          <div class="ph-title-badge" style="position:absolute;top:16px;left:16px;z-index:6;color:white;font-size:0.9rem;font-weight:600;text-shadow:0 2px 8px rgba(0,0,0,0.8);pointer-events:none;max-width:80%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:none;">
            ${options.title || ''}
          </div>

          <!-- Controls Bar -->
          <div class="ph-controls" style="position:relative;z-index:10;background:linear-gradient(0deg,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.4) 60%,transparent 100%);padding:40px 16px 12px;transform:translateY(0);transition:transform 0.3s ease;pointer-events:auto;">
            
            <!-- Progress Bar -->
            <div class="ph-progress-container" style="position:absolute;top:0;left:0;right:0;height:32px;cursor:pointer;display:flex;align-items:center;padding:0 16px;z-index:12;">
              <div class="ph-progress-bg" style="width:100%;height:4px;background:rgba(255,255,255,0.2);border-radius:2px;position:relative;overflow:visible;transition:height 0.15s ease;">
                <div class="ph-progress-loaded" style="height:100%;background:rgba(255,255,255,0.15);border-radius:2px;width:0%;transition:width 0.3s ease;"></div>
                <div class="ph-progress-played" style="height:100%;background:linear-gradient(90deg,#ff2d5c,#b829e0);border-radius:2px;width:0%;position:relative;transition:width 0.1s linear;"></div>
                <div class="ph-progress-thumb" style="position:absolute;top:50%;right:-8px;transform:translateY(-50%);width:16px;height:16px;background:white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);opacity:0;transition:opacity 0.2s ease,transform 0.2s ease;border:2px solid #ff2d5c;"></div>
              </div>
            </div>

            <!-- Controls Row -->
            <div class="ph-controls-row" style="display:flex;align-items:center;gap:8px;padding:0 4px;">
              <!-- Play/Pause -->
              <button class="ph-btn ph-play-btn" style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;color:white;background:transparent;border:none;cursor:pointer;border-radius:4px;transition:background 0.2s ease;" title="Play / Pause">
                <svg class="ph-icon-play" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="8,5 19,12 8,19"/></svg>
                <svg class="ph-icon-pause" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="display:none;"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              </button>

              <!-- Rewind 10s -->
              <button class="ph-btn" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.7);background:transparent;border:none;cursor:pointer;border-radius:4px;transition:color 0.2s ease;" title="Rewind 10s">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              </button>

              <!-- Forward 10s -->
              <button class="ph-btn" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.7);background:transparent;border:none;cursor:pointer;border-radius:4px;transition:color 0.2s ease;" title="Forward 10s">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              </button>

              <!-- Volume -->
              <div class="ph-volume-wrap" style="display:flex;align-items:center;gap:4px;">
                <button class="ph-btn ph-volume-btn" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.7);background:transparent;border:none;cursor:pointer;border-radius:4px;transition:color 0.2s ease;" title="Mute">
                  <svg class="ph-icon-volume-high" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                  <svg class="ph-icon-volume-mid" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display:none;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                  <svg class="ph-icon-volume-mute" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display:none;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                </button>
                <div class="ph-volume-slider" style="width:0;overflow:hidden;transition:width 0.2s ease;">
                  <div class="ph-volume-bg" style="width:64px;height:4px;background:rgba(255,255,255,0.2);border-radius:2px;position:relative;cursor:pointer;">
                    <div class="ph-volume-level" style="height:100%;background:white;border-radius:2px;width:100%;"></div>
                    <div class="ph-volume-thumb" style="position:absolute;top:50%;right:-6px;transform:translateY(-50%);width:12px;height:12px;background:white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>
                  </div>
                </div>
              </div>

              <!-- Time Display -->
              <span class="ph-time" style="font-size:0.8rem;color:rgba(255,255,255,0.7);font-family:monospace;margin-left:4px;white-space:nowrap;">
                <span class="ph-current-time">0:00</span>
                <span style="margin:0 4px;opacity:0.5;">/</span>
                <span class="ph-duration">0:00</span>
              </span>

              <!-- Spacer -->
              <div style="flex:1;"></div>

              <!-- Quality (placeholder) -->
              <button class="ph-btn ph-quality-btn" style="display:none;padding:4px 10px;color:rgba(255,255,255,0.7);background:rgba(255,255,255,0.1);border:none;cursor:pointer;border-radius:4px;font-size:0.7rem;font-weight:600;text-transform:uppercase;transition:background 0.2s ease;" title="Quality">HD</button>

              <!-- PiP -->
              <button class="ph-btn ph-pip-btn" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.7);background:transparent;border:none;cursor:pointer;border-radius:4px;transition:color 0.2s ease;" title="Picture in Picture">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><rect x="11" y="9" width="10" height="7" rx="1"/></svg>
              </button>

              <!-- Fullscreen -->
              <button class="ph-btn ph-fullscreen-btn" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.7);background:transparent;border:none;cursor:pointer;border-radius:4px;transition:color 0.2s ease;" title="Fullscreen">
                <svg class="ph-icon-fs-enter" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                <svg class="ph-icon-fs-exit" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none;"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Error State -->
        <div class="ph-error" style="position:absolute;inset:0;z-index:20;display:none;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);gap:12px;">
          <div style="font-size:3rem;opacity:0.5;">⚠️</div>
          <p style="color:rgba(255,255,255,0.7);font-size:0.9rem;">Video could not be loaded</p>
          <button class="ph-retry-btn" style="padding:10px 24px;background:linear-gradient(135deg,#ff2d5c,#b829e0);color:white;border:none;border-radius:24px;font-weight:600;font-size:0.85rem;cursor:pointer;transition:transform 0.2s ease;">Try Again</button>
        </div>
      </div>
    `;

    container.innerHTML = html;
    container.style.position = 'relative';

    const player = document.getElementById(playerId);
    const video = player.querySelector('video');
    const overlay = player.querySelector('.ph-player-overlay');
    const controlsBar = player.querySelector('.ph-controls');
    const progressContainer = player.querySelector('.ph-progress-container');
    const progressBg = player.querySelector('.ph-progress-bg');
    const progressPlayed = player.querySelector('.ph-progress-played');
    const progressLoaded = player.querySelector('.ph-progress-loaded');
    const progressThumb = player.querySelector('.ph-progress-thumb');
    const playBtn = player.querySelector('.ph-play-btn');
    const iconPlay = player.querySelector('.ph-icon-play');
    const iconPause = player.querySelector('.ph-icon-pause');
    const centerPlay = player.querySelector('.ph-center-play');
    const bigPlayBtn = player.querySelector('.ph-big-play-btn');
    const currentTimeSpan = player.querySelector('.ph-current-time');
    const durationSpan = player.querySelector('.ph-duration');
    const volumeBtn = player.querySelector('.ph-volume-btn');
    const volumeSlider = player.querySelector('.ph-volume-slider');
    const volumeBg = player.querySelector('.ph-volume-bg');
    const volumeLevel = player.querySelector('.ph-volume-level');
    const volumeThumb = player.querySelector('.ph-volume-thumb');
    const iconVolumeHigh = player.querySelector('.ph-icon-volume-high');
    const iconVolumeMid = player.querySelector('.ph-icon-volume-mid');
    const iconVolumeMute = player.querySelector('.ph-icon-volume-mute');
    const fullscreenBtn = player.querySelector('.ph-fullscreen-btn');
    const iconFsEnter = player.querySelector('.ph-icon-fs-enter');
    const iconFsExit = player.querySelector('.ph-icon-fs-exit');
    const pipBtn = player.querySelector('.ph-pip-btn');
    const loadingEl = player.querySelector('.ph-loading');
    const errorEl = player.querySelector('.ph-error');
    const retryBtn = player.querySelector('.ph-retry-btn');
    const titleBadge = player.querySelector('.ph-title-badge');
    const rewindBtn = player.querySelectorAll('.ph-btn')[1];
    const forwardBtn = player.querySelectorAll('.ph-btn')[2];
    const qualityBtn = player.querySelector('.ph-quality-btn');

    let isPlaying = false;
    let controlsTimeout = null;
    let volumeBeforeMute = 1;
    let userInteracted = false;
    let isDragging = false;
    const destroyFns = [];

    // --- Format Time ---
    function formatTime(seconds) {
      if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // --- Update progress ---
    function updateProgress() {
      if (video.duration) {
        const pct = (video.currentTime / video.duration) * 100;
        progressPlayed.style.width = pct + '%';
        progressThumb.style.right = -8 + 'px';
        currentTimeSpan.textContent = formatTime(video.currentTime);
      }
    }

    // --- Seek ---
    function seek(e) {
      const rect = progressBg.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      video.currentTime = pct * video.duration;
    }

    // --- Set volume ---
    function setVolume(value) {
      value = Math.max(0, Math.min(1, value));
      video.volume = value;
      video.muted = value === 0;
      volumeLevel.style.width = (value * 100) + '%';
      
      if (value === 0) {
        iconVolumeHigh.style.display = 'none';
        iconVolumeMid.style.display = 'none';
        iconVolumeMute.style.display = 'block';
      } else if (value < 0.5) {
        iconVolumeHigh.style.display = 'none';
        iconVolumeMid.style.display = 'block';
        iconVolumeMute.style.display = 'none';
      } else {
        iconVolumeHigh.style.display = 'block';
        iconVolumeMid.style.display = 'none';
        iconVolumeMute.style.display = 'none';
      }
    }

    // --- Toggle play ---
    function togglePlay() {
      if (video.paused) {
        const playPromise = video.play();
        if (playPromise) {
          playPromise.catch(() => {});
        }
      } else {
        video.pause();
      }
    }

    // --- Show/hide controls ---
    function showControls(show) {
      clearTimeout(controlsTimeout);
      if (show) {
        controlsBar.style.transform = 'translateY(0)';
        progressContainer.style.opacity = '1';
        if (video.paused) {
          centerPlay.style.opacity = '1';
        }
        if (isPlaying) {
          controlsTimeout = setTimeout(() => {
            controlsBar.style.transform = 'translateY(calc(100% - 32px))';
            progressContainer.style.opacity = '0';
            centerPlay.style.opacity = '0';
          }, 3000);
        }
      } else {
        controlsBar.style.transform = 'translateY(calc(100% - 32px))';
        progressContainer.style.opacity = '0';
        centerPlay.style.opacity = '0';
      }
    }

    // --- Keyboard shortcuts ---
    function handleKeydown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          if (video.volume > 0) {
            volumeBeforeMute = video.volume;
            setVolume(0);
          } else {
            setVolume(volumeBeforeMute || 0.5);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, video.volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, video.volume - 0.1));
          break;
      }
    }

    // --- Fullscreen ---
    function toggleFullscreen() {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const el = player;
        if (el.requestFullscreen) {
          el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    }

    // --- PiP ---
    async function togglePip() {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await video.requestPictureInPicture();
        }
      } catch (err) {
        console.log('[Player] PiP not supported');
      }
    }

    // --- Event Listeners ---

    // Play/Pause
    playBtn.addEventListener('click', togglePlay);
    overlay.addEventListener('click', (e) => {
      if (e.target.closest('.ph-controls') || e.target.closest('.ph-btn') || e.target.closest('.ph-progress-container')) return;
      togglePlay();
    });
    bigPlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlay();
    });

    // Video events
    video.addEventListener('play', () => {
      isPlaying = true;
      iconPlay.style.display = 'none';
      iconPause.style.display = 'block';
      centerPlay.style.opacity = '0';
      titleBadge.style.display = 'block';
      showControls(true);
    });

    video.addEventListener('pause', () => {
      isPlaying = false;
      iconPlay.style.display = 'block';
      iconPause.style.display = 'none';
      centerPlay.style.opacity = '1';
      showControls(true);
    });

    video.addEventListener('timeupdate', updateProgress);

    video.addEventListener('loadedmetadata', () => {
      durationSpan.textContent = formatTime(video.duration);
      setVolume(options.volume !== undefined ? options.volume : EMBED.CONFIG.VOLUME);
      if (options.autoplay || EMBED.CONFIG.AUTOPLAY) {
        video.play().catch(() => {});
      }
    });

    video.addEventListener('progress', () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const pct = (bufferedEnd / video.duration) * 100;
        progressLoaded.style.width = pct + '%';
      }
    });

    video.addEventListener('waiting', () => {
      loadingEl.style.display = 'block';
    });

    video.addEventListener('canplay', () => {
      loadingEl.style.display = 'none';
    });

    video.addEventListener('error', () => {
      errorEl.style.display = 'flex';
      loadingEl.style.display = 'none';
    });

    // Progress bar
    progressContainer.addEventListener('mousedown', (e) => {
      isDragging = true;
      seek(e);
      function onMove(ev) { seek(ev); }
      function onUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    progressContainer.addEventListener('mouseenter', () => {
      progressThumb.style.opacity = '1';
      progressBg.style.height = '6px';
    });

    progressContainer.addEventListener('mouseleave', () => {
      if (!isDragging) {
        progressThumb.style.opacity = '0';
        progressBg.style.height = '4px';
      }
    });

    // Volume
    volumeBtn.addEventListener('click', () => {
      if (video.volume > 0) {
        volumeBeforeMute = video.volume;
        setVolume(0);
      } else {
        setVolume(volumeBeforeMute || 0.5);
      }
    });

    volumeBtn.addEventListener('mouseenter', () => {
      volumeSlider.style.width = '64px';
      volumeSlider.style.overflow = 'visible';
    });

    volumeBtn.addEventListener('mouseleave', (e) => {
      if (!e.relatedTarget || !e.relatedTarget.closest('.ph-volume-slider')) {
        setTimeout(() => {
          volumeSlider.style.width = '0';
          volumeSlider.style.overflow = 'hidden';
        }, 300);
      }
    });

    volumeSlider.addEventListener('mouseenter', () => {
      volumeSlider.style.width = '64px';
      volumeSlider.style.overflow = 'visible';
    });

    volumeSlider.addEventListener('mouseleave', () => {
      setTimeout(() => {
        volumeSlider.style.width = '0';
        volumeSlider.style.overflow = 'hidden';
      }, 300);
    });

    function setVolumeFromEvent(e) {
      const rect = volumeBg.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setVolume(pct);
    }

    volumeBg.addEventListener('mousedown', (e) => {
      setVolumeFromEvent(e);
      function onMove(ev) { setVolumeFromEvent(ev); }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    // Fullscreen
    fullscreenBtn.addEventListener('click', toggleFullscreen);

    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        iconFsEnter.style.display = 'none';
        iconFsExit.style.display = 'block';
      } else {
        iconFsEnter.style.display = 'block';
        iconFsExit.style.display = 'none';
      }
    });

    document.addEventListener('webkitfullscreenchange', () => {
      if (document.webkitFullscreenElement) {
        iconFsEnter.style.display = 'none';
        iconFsExit.style.display = 'block';
      } else {
        iconFsEnter.style.display = 'block';
        iconFsExit.style.display = 'none';
      }
    });

    // PiP
    if (document.pictureInPictureEnabled) {
      pipBtn.addEventListener('click', togglePip);
    } else {
      pipBtn.style.display = 'none';
    }

    // Rewind / Forward
    rewindBtn.addEventListener('click', () => {
      video.currentTime = Math.max(0, video.currentTime - 10);
    });

    forwardBtn.addEventListener('click', () => {
      video.currentTime = Math.min(video.duration, video.currentTime + 10);
    });

    // Retry
    retryBtn.addEventListener('click', () => {
      errorEl.style.display = 'none';
      video.load();
    });

    // Keyboard
    document.addEventListener('keydown', handleKeydown);
    destroyFns.push(() => document.removeEventListener('keydown', handleKeydown));

    // Touch support for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    overlay.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }, { passive: true });

    overlay.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const dt = Date.now() - touchStartTime;

      // Tap (not swipe)
      if (Math.abs(dx) < 30 && Math.abs(dy) < 30 && dt < 300) {
        togglePlay();
      }
    }, { passive: true });

    // Mouse move shows controls
    let mouseMoveTimeout = null;
    player.addEventListener('mousemove', () => {
      showControls(true);
      clearTimeout(mouseMoveTimeout);
      if (isPlaying) {
        mouseMoveTimeout = setTimeout(() => {
          showControls(false);
        }, 3000);
      }
    });

    player.addEventListener('mouseleave', () => {
      if (isPlaying) showControls(false);
    });

    // Double click for fullscreen
    video.addEventListener('dblclick', toggleFullscreen);

    // Cleanup
    const destroy = () => {
      destroyFns.forEach(fn => fn());
      video.pause();
      video.src = '';
      video.load();
      player.remove();
    };

    if (options.autoplay) {
      video.play().catch(() => {});
    }

    return {
      player,
      video,
      play: () => video.play(),
      pause: () => video.pause(),
      toggle: togglePlay,
      seek: (t) => { video.currentTime = t; },
      setVolume: setVolume,
      destroy: destroy,
      element: player
    };
  },

  /* ============================================
     IFRAME EMBED PLAYER
     ============================================ */

  /**
   * Criar um iframe embed player
   */
  createIframePlayer(container, embedUrl, options = {}) {
    const platformName = this.getPlatformName(embedUrl);
    const originalUrl = this.getOriginalUrl(embedUrl);
    const playerId = 'iframe-player-' + Date.now();

    container.innerHTML = `
      <div id="${playerId}" style="position:relative;width:100%;height:100%;background:#000;overflow:hidden;">
        <iframe
          src="${embedUrl}"
          style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;background:#000;"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowfullscreen
          loading="lazy"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        ></iframe>
        <div style="position:absolute;bottom:12px;left:12px;background:rgba(0,0,0,0.75);padding:4px 10px;border-radius:4px;font-size:0.7rem;color:rgba(255,255,255,0.5);z-index:5;pointer-events:none;">
          🎬 ${platformName}
        </div>
        <a href="${originalUrl}" target="_blank" rel="noopener" style="position:absolute;bottom:12px;right:12px;background:rgba(0,0,0,0.75);padding:4px 10px;border-radius:4px;font-size:0.7rem;color:#ff2d5c;z-index:5;text-decoration:none;transition:color 0.2s ease;" 
           onmouseover="this.style.color='white'" onmouseout="this.style.color='#ff2d5c'">
          ↗ Source
        </a>
      </div>
    `;
  },

  /* ============================================
     MAIN ENTRY POINT
     ============================================ */

  /**
   * Carregar player no container - detecta automaticamente o tipo
   */
  loadIntoPlayer(containerId, url, videoTitle = '', options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return null;
    
    const parent = container.closest('.video-player-wrapper') || container.parentElement;

    // Fade out
    container.style.opacity = '0';
    container.style.transition = 'opacity 0.3s ease';

    setTimeout(() => {
      // Determinar tamanhos
      const width = parent ? parent.offsetWidth : container.offsetWidth;
      const height = parent ? parent.offsetHeight : container.offsetHeight;

      // 1. Se for URL de vídeo direto (MP4, WebM, etc)
      if (this.isDirectVideoUrl(url)) {
        this.createNativePlayer(container, url, {
          title: videoTitle,
          autoplay: options.autoplay !== false,
          volume: options.volume || 1,
          ...options
        });
      }
      // 2. Se for embed de iframe (XVideos, Pornhub, etc)
      else if (this.detectIframePlatform(url)) {
        this.createIframePlayer(container, url, options);
      }
      // 3. Fallback: exibe placeholder estilizado
      else {
        container.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;background:linear-gradient(135deg,#1a1a2e,#0a0a0f);gap:12px;padding:20px;text-align:center;">
            <div style="width:64px;height:64px;background:linear-gradient(135deg,#ff2d5c,#b829e0);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;box-shadow:0 0 30px rgba(255,45,92,0.2);">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><polygon points="8,5 19,12 8,19"/></svg>
            </div>
            <p style="color:rgba(255,255,255,0.7);font-size:0.9rem;">${videoTitle || 'Video Player'}</p>
            <p style="color:rgba(255,255,255,0.4);font-size:0.75rem;">Configure the video URL in data.js</p>
          </div>
        `;
      }

      // Fade in
      container.style.opacity = '1';
    }, 300);

    return container;
  },

  /* ============================================
     DETECTION HELPERS
     ============================================ */

  detectPlatform(url) {
    return this.detectIframePlatform(url);
  },

  isValidEmbedUrl(url) {
    return this.isDirectVideoUrl(url) || this.detectIframePlatform(url) !== null;
  },

  getPlatformName(url) {
    if (this.isDirectVideoUrl(url)) return 'Direct Video';
    const info = this.detectIframePlatform(url);
    return info ? info.name : 'Unknown';
  },

  getOriginalUrl(url) {
    const info = this.detectIframePlatform(url);
    if (!info) return url;
    switch (info.platform) {
      case 'xvideos': return `https://www.xvideos.com/video${info.id}`;
      case 'pornhub': return `https://www.pornhub.com/view_video.php?viewkey=${info.id}`;
      case 'xhamster': return `https://xhamster.com/videos/${info.id}`;
      case 'xnxx': return `https://www.xnxx.com/video-${info.id}`;
      case 'redtube': return `https://www.redtube.com/${info.id}`;
      case 'eporner': return `https://www.eporner.com/embed/${info.id}`;
      default: return url;
    }
  }
};

// Export global
window.EMBED = EMBED;
