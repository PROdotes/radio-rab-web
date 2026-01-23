/**
 * Radio Rab News Portal — Main Application
 * Version: 2.0.0
 */

// ===========================================
// CONFIGURATION
// ===========================================
const CONFIG = {
    itemsPerBatch: 9,
    scrollThreshold: 200,
    animationDelay: 80,
    loadDelay: 300
};

// ===========================================
// STATE
// ===========================================
const state = {
    currentVisibleCount: 0,
    activeCategory: 'all',
    isLoading: false,
    observer: null
};

// ===========================================
// INITIALIZATION
// ===========================================
document.addEventListener('DOMContentLoaded', init);

function init() {
    // Initialize components based on page content
    if (document.getElementById('primary-feature-container')) {
        initNewsFeed();
    }

    initNavigation();
    initModal();
    initRadioPlayer();
    initDateDisplay();
    initScrollEffects();
}

// ===========================================
// NEWS FEED
// ===========================================
function initNewsFeed() {
    renderHero(HERO_ARTICLE);
    loadMoreArticles();
    initInfiniteScroll();
    initFilters();
}

function renderHero(article) {
    const container = document.getElementById('primary-feature-container');
    if (!container || !article) return;

    container.innerHTML = `
        <article class="main-feature card-animate" style="--delay: 1">
            <div class="feature-img-container">
                <div class="feature-img" style="background-image: url('${escapeHtml(article.image)}');" role="img" aria-label="${escapeHtml(article.title)}"></div>
            </div>
            <div class="feature-content">
                <div class="flex-between">
                    <span class="category-pill">${escapeHtml(article.category)}</span>
                    <span class="meta-info">${escapeHtml(article.date)} · ${escapeHtml(article.readTime)} čitanja</span>
                </div>
                <h2>${escapeHtml(article.title)}</h2>
                <p>${escapeHtml(article.snippet)}</p>

                <div class="editorial-ai">
                    <p class="ai-label">AI SAŽETAK</p>
                    <p>${escapeHtml(article.aiSummary || 'Automatski sažetak članka trenutno nije dostupan.')}</p>
                </div>

                <div class="meta-info">Piše: ${escapeHtml(article.author)}</div>
            </div>
        </article>
    `;
}

function loadMoreArticles() {
    const grid = document.getElementById('news-grid');
    if (!grid || state.isLoading) return;

    const filteredArticles = getFilteredArticles();
    const nextBatch = filteredArticles.slice(
        state.currentVisibleCount,
        state.currentVisibleCount + CONFIG.itemsPerBatch
    );

    if (nextBatch.length === 0) {
        hideLoader();
        return;
    }

    state.isLoading = true;

    // Simulate network delay for demo
    setTimeout(() => {
        const fragment = document.createDocumentFragment();

        nextBatch.forEach((article, index) => {
            const card = createNewsCard(article, index);
            fragment.appendChild(card);
        });

        grid.appendChild(fragment);
        state.currentVisibleCount += nextBatch.length;
        state.isLoading = false;

        // Check if more articles available
        if (state.currentVisibleCount >= filteredArticles.length) {
            hideLoader();
        }
    }, CONFIG.loadDelay);
}

function createNewsCard(article, index) {
    const card = document.createElement('article');
    card.className = 'small-news-card card-animate';
    card.style.setProperty('--delay', (index % 3) + 1);
    card.setAttribute('data-category', article.category);

    card.innerHTML = `
        <div class="feature-img-container small-img-container">
            <div class="feature-img" style="background-image: url('${escapeHtml(article.image)}');" role="img" aria-label="${escapeHtml(article.title)}"></div>
        </div>
        <div class="feature-content">
            <span class="category-pill" style="font-size: 0.6rem; padding: 0.2rem 0.8rem; margin-bottom: 0.8rem;">${escapeHtml(article.category)}</span>
            <h3>${escapeHtml(article.title)}</h3>
            <p>${escapeHtml(article.snippet)}</p>
            <div class="meta-info flex-between">
                <span>${escapeHtml(article.author)}</span>
                <span>${escapeHtml(article.date)}</span>
            </div>
        </div>
    `;

    return card;
}

function getFilteredArticles() {
    if (state.activeCategory === 'all') {
        return ALL_ARTICLES;
    }
    return ALL_ARTICLES.filter(a => a.category === state.activeCategory);
}

// ===========================================
// INFINITE SCROLL
// ===========================================
function initInfiniteScroll() {
    const grid = document.getElementById('news-grid');
    if (!grid) return;

    // Create sentinel element
    const sentinel = document.createElement('div');
    sentinel.id = 'scroll-sentinel';
    sentinel.innerHTML = '<div class="loader"></div>';
    grid.parentNode.appendChild(sentinel);

    // Intersection Observer for infinite scroll
    state.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !state.isLoading) {
                const filteredArticles = getFilteredArticles();
                if (state.currentVisibleCount < filteredArticles.length) {
                    loadMoreArticles();
                }
            }
        });
    }, { rootMargin: `${CONFIG.scrollThreshold}px` });

    state.observer.observe(sentinel);
}

function hideLoader() {
    const sentinel = document.getElementById('scroll-sentinel');
    if (sentinel) {
        sentinel.style.display = 'none';
    }
}

function showLoader() {
    const sentinel = document.getElementById('scroll-sentinel');
    if (sentinel) {
        sentinel.style.display = 'flex';
    }
}

// ===========================================
// FILTERS
// ===========================================
function initFilters() {
    const buttons = document.querySelectorAll('.filter-btn');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.cat;
            if (category === state.activeCategory) return;

            // Update button states
            buttons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');

            // Reset and reload
            state.activeCategory = category;
            state.currentVisibleCount = 0;

            const grid = document.getElementById('news-grid');
            if (grid) {
                grid.innerHTML = '';
                showLoader();
                loadMoreArticles();
            }
        });
    });
}

// ===========================================
// NAVIGATION
// ===========================================
function initNavigation() {
    const navTriggers = document.querySelectorAll('.nav-trigger[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');
    const widgetLinks = document.querySelectorAll('.widget-link[data-tab]');

    // Combine all navigation triggers
    const allTriggers = [...navTriggers, ...widgetLinks];

    allTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = trigger.dataset.tab;
            if (!targetTab) return;

            switchTab(targetTab, navTriggers, tabContents);
        });
    });
}

function switchTab(targetTab, navTriggers, tabContents) {
    // Update nav states (both desktop and mobile)
    navTriggers.forEach(t => {
        t.classList.toggle('active', t.dataset.tab === targetTab);
    });

    // Switch content
    tabContents.forEach(content => {
        const isActive = content.id === targetTab;
        content.classList.toggle('active', isActive);
    });

    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===========================================
// MODAL
// ===========================================
function initModal() {
    const modal = document.getElementById('reporter-modal');
    const openBtn = document.getElementById('reporter-btn');
    const closeBtn = modal?.querySelector('.modal-close');

    if (!modal) return;

    openBtn?.addEventListener('click', () => openModal(modal));
    closeBtn?.addEventListener('click', () => closeModal(modal));

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) {
            closeModal(modal);
        }
    });
}

function openModal(modal) {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modal.querySelector('input')?.focus();
}

function closeModal(modal) {
    modal.hidden = true;
    document.body.style.overflow = '';
}

// ===========================================
// RADIO PLAYER (Demo)
// ===========================================
function initRadioPlayer() {
    const playBtn = document.getElementById('radio-play');
    if (!playBtn) return;

    playBtn.addEventListener('click', () => {
        playBtn.classList.toggle('playing');

        // Demo: In production, this would control actual audio
        const songTitle = document.querySelector('.song-title');
        if (songTitle) {
            songTitle.textContent = playBtn.classList.contains('playing')
                ? 'Radio Rab - Uživo'
                : 'Radio Rab - 24/7';
        }
    });
}

// ===========================================
// DATE DISPLAY
// ===========================================
function initDateDisplay() {
    const dateEl = document.querySelector('.current-date');
    if (!dateEl) return;

    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('hr-HR', options);
}

// ===========================================
// SCROLL EFFECTS
// ===========================================
function initScrollEffects() {
    const nav = document.querySelector('.news-nav');
    if (!nav) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const scrolled = window.scrollY > 100;
                nav.style.background = scrolled
                    ? 'rgba(2, 6, 23, 0.95)'
                    : 'rgba(15, 23, 42, 0.85)';
                ticking = false;
            });
            ticking = true;
        }
    });
}

// ===========================================
// UTILITIES
// ===========================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
