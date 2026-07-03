/* ============================================
   PLEASUREHUB - Main Application
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // --- Age Verification ---
  const ageModal = document.getElementById('ageModal');
  if (ageModal) {
    const ageYes = document.getElementById('ageYes');
    const ageNo = document.getElementById('ageNo');

    // Verificar localStorage
    if (localStorage.getItem('ph_age_verified') === 'true') {
      ageModal.style.display = 'none';
    }

    if (ageYes) {
      ageYes.addEventListener('click', () => {
        localStorage.setItem('ph_age_verified', 'true');
        ageModal.style.display = 'none';
        // Iniciar AdCash após verificação
        if (typeof ADCASH !== 'undefined') {
          ADCASH.init();
          setTimeout(() => ADCASH.loadPageAds(), 2000);
        }
      });
    }

    if (ageNo) {
      ageNo.addEventListener('click', () => {
        window.location.href = 'https://google.com';
      });
    }
  }

  // --- Navigation Active State ---
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', function(e) {
      navItems.forEach(n => n.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // --- Category Chips ---
  const catChips = document.querySelectorAll('.cat-chip');
  catChips.forEach(chip => {
    chip.addEventListener('click', function(e) {
      catChips.forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      
      const category = this.dataset.category;
      if (category && category !== 'all') {
        window.location.href = `category.html?cat=${category}`;
      }
    });
  });

  // --- Like / Dislike Buttons ---
  document.querySelectorAll('.video-action-btn[data-action="like"], .video-action-btn[data-action="dislike"]').forEach(btn => {
    btn.addEventListener('click', function() {
      const action = this.dataset.action;
      const target = action === 'like' ? 'dislike' : 'like';
      const opposite = document.querySelector(`.video-action-btn[data-action="${target}"]`);
      
      if (opposite) opposite.classList.remove('liked');
      this.classList.toggle('liked');
    });
  });

  // --- Share Button ---
  const shareBtn = document.querySelector('[data-action="share"]');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({
          title: document.title,
          url: window.location.href
        }).catch(() => {});
      } else {
        // Fallback: copiar link
        navigator.clipboard.writeText(window.location.href).then(() => {
          shareBtn.innerHTML = '✅ Link copiado!';
          setTimeout(() => {
            shareBtn.innerHTML = '🔗 Compartilhar';
          }, 2000);
        });
      }
    });
  }

  // --- Search Functionality ---
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && searchInput.value.trim()) {
        window.location.href = `category.html?q=${encodeURIComponent(searchInput.value.trim())}`;
      }
    });
  }

  // --- Load More Button ---
  const loadMoreBtn = document.getElementById('loadMore');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', function() {
      this.textContent = 'Carregando...';
      this.disabled = true;
      
      setTimeout(() => {
        // Simular carregamento de mais conteúdo
        const grid = document.querySelector('.content-grid');
        if (grid) {
          // Adicionar mais cards (exemplo)
          this.textContent = 'Carregar mais vídeos';
          this.disabled = false;
        }
      }, 1000);
    });
  }

  // --- Scroll suave para links âncora ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // --- Responsive Menu Toggle (mobile) ---
  const menuToggle = document.createElement('button');
  menuToggle.className = 'mobile-menu-toggle';
  menuToggle.setAttribute('aria-label', 'Menu');
  menuToggle.innerHTML = '<span></span><span></span><span></span>';
  
  const headerActions = document.querySelector('.header-actions');
  if (headerActions && window.innerWidth <= 768) {
    headerActions.parentNode.insertBefore(menuToggle, headerActions);
  }

  menuToggle.addEventListener('click', () => {
    const nav = document.querySelector('.main-nav');
    if (nav) {
      nav.classList.toggle('nav-open');
      menuToggle.classList.toggle('active');
    }
  });

  // Reajustar na mudança de tamanho
  window.addEventListener('resize', () => {
    const nav = document.querySelector('.main-nav');
    if (nav && window.innerWidth > 768) {
      nav.classList.remove('nav-open');
      menuToggle.classList.remove('active');
    }
    if (window.innerWidth <= 768) {
      if (headerActions && !document.querySelector('.mobile-menu-toggle')) {
        headerActions.parentNode.insertBefore(menuToggle, headerActions);
      }
    }
  });

  // --- Scroll Spy para nav items ---
  const sections = document.querySelectorAll('section[id]');
  if (sections.length > 0 && navItems.length > 0) {
    window.addEventListener('scroll', () => {
      let current = '';
      sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        if (window.scrollY >= sectionTop) {
          current = section.getAttribute('id');
        }
      });
      navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === `#${current}`) {
          item.classList.add('active');
        }
      });
    });
  }

  console.log('[PleasureHub] Site carregado com sucesso! 🚀');
  console.log('[PleasureHub] Configure o ID do AdCash em js/adcash.js');
});
