/* ============================================
   PLEASUREHUB v2.0 - Main Application
   ============================================ */

function debounce(fn, delay = 150) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // --- Age Verification ---
  const ageModal = document.getElementById('ageModal');
  if (ageModal) {
    const ageYes = document.getElementById('ageYes');
    const ageNo = document.getElementById('ageNo');

    if (localStorage.getItem('ph_age_verified') === 'true') {
      ageModal.style.display = 'none';
    }

    if (ageYes) {
      ageYes.addEventListener('click', () => {
        localStorage.setItem('ph_age_verified', 'true');
        ageModal.style.display = 'none';
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
    item.addEventListener('click', function() {
      navItems.forEach(n => n.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // --- Category Chips ---
  const catChips = document.querySelectorAll('.cat-chip');
  catChips.forEach(chip => {
    chip.addEventListener('click', function() {
      catChips.forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      const category = this.dataset.category;
      if (category && category !== 'all') {
        window.location.href = `/${category}`;
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
  const shareBtn = document.querySelector('.share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({ title: document.title, url: window.location.href }).catch(() => {});
      } else {
        navigator.clipboard.writeText(window.location.href).then(() => {
          shareBtn.innerHTML = '✅ Link copied!';
          setTimeout(() => { shareBtn.innerHTML = '🔗 Share'; }, 2000);
        });
      }
    });
  }

  // --- Search ---
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && searchInput.value.trim()) {
        window.location.href = `/category?q=${encodeURIComponent(searchInput.value.trim())}`;
      }
    });
  }

  // --- Load More Button ---
  const loadMoreBtn = document.getElementById('loadMore');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', function() {
      this.textContent = 'Loading...';
      this.disabled = true;
      setTimeout(() => {
        this.textContent = 'Load more videos';
        this.disabled = false;
      }, 1000);
    });
  }

  // --- Mobile Menu Toggle (improved - no duplicate) ---
  let menuToggle = document.querySelector('.mobile-menu-toggle');
  
  function setupMobileMenu() {
    const headerActions = document.querySelector('.header-actions');
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile && !menuToggle && headerActions) {
      menuToggle = document.createElement('button');
      menuToggle.className = 'mobile-menu-toggle';
      menuToggle.setAttribute('aria-label', 'Menu');
      menuToggle.innerHTML = '<span></span><span></span><span></span>';
      headerActions.parentNode.insertBefore(menuToggle, headerActions);
      
      menuToggle.addEventListener('click', () => {
        const nav = document.querySelector('.main-nav');
        if (nav) {
          nav.classList.toggle('nav-open');
          menuToggle.classList.toggle('active');
        }
      });
    } else if (!isMobile && menuToggle) {
      menuToggle.remove();
      menuToggle = null;
      const nav = document.querySelector('.main-nav');
      if (nav) nav.classList.remove('nav-open');
    }
  }

  setupMobileMenu();
  window.addEventListener('resize', debounce(setupMobileMenu, 200));

  // --- Scroll Spy for nav items ---
  const sections = document.querySelectorAll('section[id]');
  if (sections.length > 0) {
    window.addEventListener('scroll', debounce(() => {
      let current = '';
      sections.forEach(section => {
        if (window.scrollY >= section.offsetTop - 100) {
          current = section.getAttribute('id');
        }
      });
      navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === `#${current}`) {
          item.classList.add('active');
        }
      });
    }, 100), { passive: true });
  }

  // --- Scroll to Top Button ---
  let scrollTopBtn = document.createElement('button');
  scrollTopBtn.className = 'scroll-top';
  scrollTopBtn.setAttribute('aria-label', 'Scroll to top');
  scrollTopBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>';
  document.body.appendChild(scrollTopBtn);

  window.addEventListener('scroll', debounce(() => {
    if (window.scrollY > 400) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  }, 100), { passive: true });

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  console.log('[PleasureHub] Site loaded successfully! 🚀');
});
