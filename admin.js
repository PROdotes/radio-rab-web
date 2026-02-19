/**
 * Radio Rab News Portal — Admin Module
 * Extracted from script.js
 */
/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
/* global CONFIG, state, escapeHtml, updateWeatherWithNPT, initNPT, AUTHORS, saveArticles, loadMoreArticles */

// ===========================================
// ADMIN PORTAL
// ===========================================

/**
 * Admin Portal Logic (UPDATED)
 */
function initAdminPortal() {
  const modal = document.getElementById('admin-modal')
  const btn = document.getElementById('staff-portal-btn')
  const close = document.getElementById('admin-close')
  const ferryToggle = document.getElementById('ferry-override-toggle')
  const d8Toggle = document.getElementById('d8-override-toggle')

  // Tab buttons
  const tabBtns = document.querySelectorAll('.admin-tab-btn')
  const tabContents = document.querySelectorAll('.admin-tab-content')

  if (!modal) return

  const toggleModal = () => {
    const isHidden = modal.hasAttribute('hidden')
    if (isHidden) {
      modal.removeAttribute('hidden')
      // Sync toggles
      if (ferryToggle) ferryToggle.checked = state.manualOverrides.ferrySuspended
      if (d8Toggle) d8Toggle.checked = state.manualOverrides.d8Restricted
      renderAdminNewsList()
      renderAdminGallery()
    } else {
      modal.setAttribute('hidden', '')
    }
  }

  // Tab switching logic
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.adminTab
      tabBtns.forEach((b) => b.classList.toggle('active', b === btn))
      tabContents.forEach((content) => {
        content.classList.toggle('active', content.id === `admin-tab-${target}`)
      })
    })
  })

  // Hidden Shortcut: Alt + Shift + A
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && e.key === 'A') {
      e.preventDefault()
      toggleModal()
    }
  })

  btn?.addEventListener('click', (e) => {
    e.preventDefault()
    toggleModal()
  })

  close?.addEventListener('click', toggleModal)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) toggleModal()
  })

  // Island Status Overrides
  ferryToggle?.addEventListener('change', (e) => {
    state.manualOverrides.ferrySuspended = e.target.checked
    if (state.nptIslandWeather) updateWeatherWithNPT(state.nptIslandWeather)
    initNPT() // Refresh UI
  })

  d8Toggle?.addEventListener('change', (e) => {
    state.manualOverrides.d8Restricted = e.target.checked
    if (state.nptIslandWeather) updateWeatherWithNPT(state.nptIslandWeather)
    initNPT()
  })

  // Initialize Editor Modal
  initNewsEditor()
}

function renderAdminNewsList(filter = '') {
  const list = document.getElementById('admin-news-list')
  if (!list) return

  const q = filter.toLowerCase()
  const filtered = q
    ? state.allArticles.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          (a.tags || []).some((t) => t.toLowerCase().includes(q))
      )
    : state.allArticles

  list.innerHTML = filtered
    .map((article) => {
      const dateStr = article.timestamp
        ? new Date(article.timestamp).toLocaleDateString('hr-HR')
        : article.date || '—'
      return `
    <tr>
      <td>${escapeHtml(article.title)}</td>
      <td><span class="status-badge">${escapeHtml(article.category)}</span></td>
      <td>${dateStr}</td>
      <td><span class="status-badge ${article.status || 'published'}">${
        article.status || 'published'
      }</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" onclick="editArticle('${article.id}')" title="Uredi">✏️</button>
          <button class="btn-icon delete" onclick="deleteArticle('${
            article.id
          }')" title="Obriši">🗑️</button>
        </div>
      </td>
    </tr>
  `
    })
    .join('')
}

function renderAdminGallery(filter = '') {
  const grid = document.getElementById('admin-gallery-grid')
  if (!grid) return

  // Deduplicate images by URL using a Map (Set doesn't work on objects)
  const imageMap = new Map()
  state.allArticles.forEach((a) => {
    if (a.image && !imageMap.has(a.image)) {
      imageMap.set(a.image, a.tags || [])
    }
  })

  const q = filter.toLowerCase()
  let entries = [...imageMap.entries()]
  if (q) {
    entries = entries.filter(([, tags]) => tags.some((t) => t.toLowerCase().includes(q)))
  }

  grid.innerHTML = entries
    .map(
      ([url, tags]) => `
    <div class="gallery-item" onclick="selectGalleryImage('${url}')">
      <img src="${url}" loading="lazy">
      <div class="tags">${tags.join(', ')}</div>
    </div>
  `
    )
    .join('')
}

function initNewsEditor() {
  const editorModal = document.getElementById('news-editor-modal')
  const editorForm = document.getElementById('news-editor-form')
  const closeBtn = document.getElementById('editor-close')
  const addBtn = document.getElementById('add-news-btn')
  const templateSelect = document.getElementById('edit-template')
  const aiBtn = document.getElementById('editor-ai-summarize')
  const imageInput = document.getElementById('edit-image')
  const preview = document.getElementById('image-preview')
  const bodyEl = document.getElementById('edit-body')
  const gallerySearch = document.getElementById('gallery-search-input')

  if (!editorModal) return

  // --- Toolbar: wire up execCommand buttons ---
  editorModal.querySelectorAll('.tool-btn[data-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      bodyEl.focus()
      const cmd = btn.dataset.cmd
      if (cmd === 'createLink') {
        const url = prompt('Unesite URL:')
        if (url) document.execCommand('createLink', false, url)
      } else if (cmd === 'formatBlock') {
        document.execCommand('formatBlock', false, btn.dataset.value || 'H3')
      } else {
        document.execCommand(cmd, false, null)
      }
      // Update button active states
      updateToolbarState()
    })
  })

  // Track active formatting state
  function updateToolbarState() {
    editorModal.querySelectorAll('.tool-btn[data-cmd]').forEach((btn) => {
      const cmd = btn.dataset.cmd
      if (cmd === 'bold' || cmd === 'italic' || cmd === 'insertUnorderedList') {
        btn.classList.toggle('active', document.queryCommandState(cmd))
      }
    })
  }

  bodyEl?.addEventListener('keyup', updateToolbarState)
  bodyEl?.addEventListener('mouseup', updateToolbarState)

  // --- "New Article" button ---
  addBtn?.addEventListener('click', () => {
    editorForm.reset()
    if (bodyEl) bodyEl.innerHTML = ''
    editorForm.dataset.editId = ''
    if (preview) preview.style.backgroundImage = ''
    document.getElementById('edit-status').value = 'published'
    editorModal.removeAttribute('hidden')
  })

  closeBtn?.addEventListener('click', () => editorModal.setAttribute('hidden', ''))

  // --- Image preview ---
  imageInput?.addEventListener('input', () => {
    if (preview) preview.style.backgroundImage = `url(${imageInput.value})`
  })

  // --- Templates (all three) ---
  templateSelect?.addEventListener('change', (e) => {
    const tpl = e.target.value
    if (!bodyEl) return

    if (tpl === 'brownout') {
      bodyEl.innerHTML =
        '<h3>Prekid opskrbe strujom</h3><p>Zbog radova na mreži... Area: [Insert Area]</p><p>Vrijeme: [Insert Time]</p>'
      document.getElementById('edit-title').value = 'Najava prekida struje'
      document.getElementById('edit-category').value = 'LOKALNO'
    } else if (tpl === 'traffic') {
      bodyEl.innerHTML =
        '<h3>Izvanredna regulacija prometa</h3><p>Zbog [Razlog] promet se odvija [Opis].</p>'
      document.getElementById('edit-title').value = 'Otežan promet'
      document.getElementById('edit-category').value = 'LOKALNO'
    } else if (tpl === 'event') {
      bodyEl.innerHTML =
        '<h3>Najava događanja</h3><p><b>Što:</b> [Naziv]</p><p><b>Kada:</b> [Datum i vrijeme]</p><p><b>Gdje:</b> [Lokacija]</p><p>Opis…</p>'
      document.getElementById('edit-title').value = 'Najava: '
      document.getElementById('edit-category').value = 'KULTURA'
    }

    // Reset after applying
    templateSelect.value = ''
  })

  // --- AI Summary ---
  aiBtn?.addEventListener('click', () => {
    const bodyContent = bodyEl?.innerText || ''
    if (!bodyContent.trim()) return
    aiBtn.textContent = '✨ Generiranje...'
    setTimeout(() => {
      const summary = bodyContent.substring(0, 120).trim() + '...'
      alert('AI Sažetak Generiran: ' + summary)
      aiBtn.textContent = 'AI Sažetak'
    }, 1000)
  })

  // --- Gallery search ---
  gallerySearch?.addEventListener('input', () => {
    renderAdminGallery(gallerySearch.value)
  })

  // --- Form submit ---
  editorForm?.addEventListener('submit', (e) => {
    e.preventDefault()
    const editId = editorForm.dataset.editId
    const bodyHtml = bodyEl?.innerHTML || ''
    const plainText = bodyEl?.innerText || ''

    // Build base article object
    const article = {
      id: editId || `news-${Date.now()}`,
      title: document.getElementById('edit-title').value,
      body: bodyHtml,
      category: document.getElementById('edit-category').value,
      image: document.getElementById('edit-image').value,
      tags: document
        .getElementById('edit-tags')
        .value.split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      snippet: plainText.substring(0, 150).trim() + (plainText.length > 150 ? '...' : ''),
      status: document.getElementById('edit-status').value,
      timestamp: new Date().toISOString(),
      author: AUTHORS[0],
      date: 'Danas',
      readTime: `${Math.max(2, Math.ceil(plainText.split(/\s+/).length / 200))} min`,
    }

    if (editId) {
      // Preserve fields that aren't in the form
      const idx = state.allArticles.findIndex((a) => a.id === editId)
      if (idx !== -1) {
        const existing = state.allArticles[idx]
        article.isHero = existing.isHero
        article.aiSummary = existing.aiSummary
        state.allArticles[idx] = article
      }
    } else {
      state.allArticles.unshift(article)
    }

    saveArticles()
    renderAdminNewsList()
    editorModal.setAttribute('hidden', '')

    // Refresh the main feed
    const grid = document.getElementById('news-grid')
    if (grid) {
      grid.innerHTML = ''
      state.currentVisibleCount = 0
      loadMoreArticles()
    }
  })
}

// Global functions for inline usage
window.editArticle = function (id) {
  const article = state.allArticles.find((a) => a.id === id)
  if (!article) return

  const modal = document.getElementById('news-editor-modal')
  const form = document.getElementById('news-editor-form')
  const bodyEl = document.getElementById('edit-body')

  document.getElementById('edit-title').value = article.title
  if (bodyEl) bodyEl.innerHTML = article.body || ''
  document.getElementById('edit-category').value = article.category
  document.getElementById('edit-status').value = article.status || 'published'
  document.getElementById('edit-image').value = article.image
  document.getElementById('edit-tags').value = (article.tags || []).join(', ')

  form.dataset.editId = id
  const preview = document.getElementById('image-preview')
  if (preview) preview.style.backgroundImage = `url(${article.image})`

  modal.removeAttribute('hidden')
}

window.deleteArticle = function (id) {
  if (confirm('Jeste li sigurni da želite obrisati ovu vijest?')) {
    state.allArticles = state.allArticles.filter((a) => a.id !== id)
    saveArticles()
    renderAdminNewsList()

    const grid = document.getElementById('news-grid')
    if (grid) {
      grid.innerHTML = ''
      state.currentVisibleCount = 0
      loadMoreArticles()
    }
  }
}

window.selectGalleryImage = function (url) {
  const imageInput = document.getElementById('edit-image')
  if (imageInput) {
    imageInput.value = url
    document.getElementById('image-preview').style.backgroundImage = `url(${url})`
    // Switch to news tab
    document.querySelector('[data-admin-tab="news"]')?.click()
  }
}
