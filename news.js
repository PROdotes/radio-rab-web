/**
 * Radio Rab News Portal — News Module
 * Extracted from script.js
 */
/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
/* global CONFIG, state, escapeHtml, getCategoryPillHTML, openReaderMode, shareArticle */

// ===========================================
// NEWS FEED
// ===========================================

function initNewsFeed() {
  // Initialize managed articles from localStorage or templates
  const saved = localStorage.getItem('radio_rab_articles')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      state.allArticles = Array.isArray(parsed) ? parsed : flattenTemplates()
    } catch (e) {
      state.allArticles = flattenTemplates()
    }
  } else {
    state.allArticles = flattenTemplates()
    saveArticles()
  }

  const hero = state.allArticles.find((a) => a.isHero) || state.allArticles[0]
  renderHero(hero)
  loadMoreArticles()
  initLoadMore()
  initFilters()
}

function flattenTemplates() {
  const flattened = []
  Object.keys(NEWS_TEMPLATES).forEach((cat) => {
    NEWS_TEMPLATES[cat].forEach((item, idx) => {
      flattened.push({
        id: `${cat.toLowerCase()}-${idx}-${Date.now()}`,
        ...item,
        category: cat,
        author: AUTHORS[Math.floor(Math.random() * AUTHORS.length)],
        date: 'Danas',
        readTime: '4 min',
        isHero: cat === 'LOKALNO' && idx === 0,
        status: 'published',
        tags: item.tags || [cat.toLowerCase()],
        timestamp: new Date().toISOString(),
      })
    })
  })
  return flattened
}

function saveArticles() {
  localStorage.setItem('radio_rab_articles', JSON.stringify(state.allArticles))
  window.dispatchEvent(new CustomEvent('news-updated'))
}

function renderHero(article) {
  const container = document.getElementById('primary-feature-container')
  if (!container || !article) return

  const isObituary = article.category === 'OSMRTNICE'

  container.innerHTML = `
        <article class="main-feature card-animate ${
          isObituary ? 'obituary-view' : ''
        }" style="--delay: 1;" data-category="${escapeHtml(article.category)}">
            <div class="feature-img-container">
                <span class="category-pill">${getCategoryPillHTML(article.category)}</span>
                <div class="feature-img" style="background-image: url('${escapeHtml(
                  article.image
                )}');" role="img" aria-label="${escapeHtml(article.title)}"></div>
            </div>
            <div class="feature-content">
                <div class="meta-row">
                    <span class="meta-info">${escapeHtml(article.date)} · ${escapeHtml(
    article.readTime || '4 min'
  )} čit.</span>
                    <button class="translate-btn" title="Prevedi na Engleski">
                      <span class="icon">🌐</span> EN
                    </button>
                </div>
                <h2>${escapeHtml(article.title)}</h2>
                <div class="article-body">
                  ${
                    isObituary
                      ? `<img src="${article.image}" class="obituary-full-img" alt="Osmrtnica">`
                      : ''
                  }
                  ${article.body || `<p>${escapeHtml(article.snippet)}</p>`}
                </div>

                <div class="editorial-ai" ${isObituary ? 'hidden' : ''}>
                    <p class="ai-label">AI SAŽETAK</p>
                    <p>${escapeHtml(
                      article.aiSummary || 'Automatski sažetak članka trenutno nije dostupan.'
                    )}</p>
                </div>

                <div class="article-actions">
                    <button class="action-btn" id="reader-mode-btn">
                        <span class="icon">📖</span> <span class="label">Pročitaj članak</span>
                    </button>
                    <div class="share-group">
                        <button class="action-btn icon-only" data-share="copy" title="Kopiraj link">🔗</button>
                        <button class="action-btn icon-only" data-share="twitter" title="Podijeli na X">𝕏</button>
                        <button class="action-btn icon-only" data-share="facebook" title="Podijeli na Facebooku">f</button>
                    </div>
                </div>
            </div>
        </article>
    `

  // Attach event listeners
  container.querySelector('#reader-mode-btn')?.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopImmediatePropagation()
    openReaderMode(article.id)
  })
  container.querySelectorAll('[data-share]').forEach((btn) => {
    btn.addEventListener('click', () => shareArticle(btn.dataset.share))
  })
}

function loadMoreArticles() {
  const grid = document.getElementById('news-grid')
  const btn = document.getElementById('load-more-btn')
  const loader = document.getElementById('grid-loader')
  const btnText = btn?.querySelector('span')

  if (!grid || state.isLoading) return

  const filteredArticles = getFilteredArticles()
  const nextBatch = filteredArticles.slice(
    state.currentVisibleCount,
    state.currentVisibleCount + CONFIG.itemsPerBatch
  )

  if (nextBatch.length === 0) {
    hideLoader()
    if (btn) btn.style.display = 'none'
    return
  }

  state.isLoading = true
  if (btn) btn.disabled = true
  if (loader) loader.hidden = false
  if (btnText) btnText.textContent = 'Učitavanje...'

  // Simulate network delay for demo
  setTimeout(() => {
    const fragment = document.createDocumentFragment()

    nextBatch.forEach((article, index) => {
      const card = createNewsCard(article, index)
      fragment.appendChild(card)
    })

    grid.appendChild(fragment)
    if (window.lucide) {
      lucide.createIcons()
    }
    state.currentVisibleCount += nextBatch.length
    state.isLoading = false

    if (btn) btn.disabled = false
    if (loader) loader.hidden = true
    if (btnText) btnText.textContent = 'Učitaj više'

    // Check if more articles available
    if (state.currentVisibleCount >= filteredArticles.length) {
      hideLoader()
      if (btn) btn.style.display = 'none'
    }
  }, CONFIG.loadDelay)
}

function createNewsCard(article, index) {
  const card = document.createElement('article')
  const isObituary = article.category === 'OSMRTNICE'
  card.className = `small-news-card card-animate ${isObituary ? 'obituary-card' : ''}`
  card.style.setProperty('--delay', (index % 3) + 1)
  card.setAttribute('data-category', article.category)

  card.innerHTML = `
        <div class="feature-img-container">
            <span class="category-pill">${getCategoryPillHTML(article.category)}</span>
            <div class="feature-img" style="background-image: url('${escapeHtml(
              article.image
            )}');" role="img" aria-label="${escapeHtml(article.title)}"></div>
        </div>
        <div class="feature-content">
            <h3>${escapeHtml(article.title)}</h3>
            <p>${escapeHtml(article.snippet)}</p>
            <div class="meta-info flex-between">
                <span>${escapeHtml(article.author)}</span>
                <span>${escapeHtml(article.date)}</span>
            </div>
        </div>
    `

  card.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopImmediatePropagation()
    openReaderMode(article.id)
  })

  return card
}

function getFilteredArticles() {
  if (state.activeCategory === 'all') {
    return state.allArticles
  }
  return state.allArticles.filter((a) => a.category === state.activeCategory)
}
