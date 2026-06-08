/** Radio Rab - UI Module */
function initLoadMore() {
  const btn = document.getElementById('load-more-btn')
  if (!btn) return

  btn.addEventListener('click', () => {
    if (!state.isLoading) {
      loadMoreArticles()
    }
  })
}

function hideLoader() {
  const container = document.getElementById('load-more-container')
  if (container) {
    container.style.display = 'none'
  }
}

function showLoader() {
  const container = document.getElementById('load-more-container')
  if (container) {
    container.style.display = 'flex'
    // Also reset button state if it was hidden
    const btn = document.getElementById('load-more-btn')
    if (btn) btn.style.display = 'flex'
  }
}

// ===========================================
// FILTERS
// ===========================================
function initFilters() {
  const buttons = document.querySelectorAll('.filter-btn')

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.cat
      if (category === state.activeCategory) return

      // Update button states
      buttons.forEach((b) => {
        b.classList.remove('active')
        b.setAttribute('aria-pressed', 'false')
      })
      btn.classList.add('active')
      btn.setAttribute('aria-pressed', 'true')

      // Reset and reload
      state.activeCategory = category
      state.currentVisibleCount = 0

      const grid = document.getElementById('news-grid')
      if (grid) {
        grid.innerHTML = ''
        showLoader()
        loadMoreArticles()
      }
    })
  })

  // Enable dragging/scrolling the filter bar with mouse (desktop) and keep touch scrolling
  const filterBar = document.querySelector('.filter-bar')
  if (filterBar) {
    let isDown = false
    let startX
    let scrollLeft

    filterBar.addEventListener('mousedown', (e) => {
      isDown = true
      filterBar.classList.add('dragging')
      startX = e.pageX - filterBar.offsetLeft
      scrollLeft = filterBar.scrollLeft
      filterBar.style.cursor = 'grabbing'
      e.preventDefault()
    })

    filterBar.addEventListener('mouseleave', () => {
      isDown = false
      filterBar.classList.remove('dragging')
      filterBar.style.cursor = ''
    })

    filterBar.addEventListener('mouseup', () => {
      isDown = false
      filterBar.classList.remove('dragging')
      filterBar.style.cursor = ''
    })

    filterBar.addEventListener('mousemove', (e) => {
      if (!isDown) return
      const x = e.pageX - filterBar.offsetLeft
      const walk = (x - startX) * 1 //scroll-fast
      filterBar.scrollLeft = scrollLeft - walk
    })
  }
}

// ===========================================
// NAVIGATION
// ===========================================
function initNavigation() {
  const navTriggers = document.querySelectorAll('.nav-trigger[data-tab]')
  const tabContents = document.querySelectorAll('.tab-content')
  const widgetLinks = document.querySelectorAll('.widget-link[data-tab]')

  // Combine all navigation triggers
  const allTriggers = [...navTriggers, ...widgetLinks]

  allTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault()
      const targetTab = trigger.dataset.tab
      if (!targetTab) return

      switchTab(targetTab, navTriggers, tabContents)
    })
  })
}

// Simple hamburger feedback for demo: toggles a small overlay showing menu is active
function initHamburger() {
  const btn = document.getElementById('header-menu-btn')
  if (!btn) return
  let open = false

  const off = document.getElementById('offcanvas-menu')
  const backdrop = document.getElementById('offcanvas-backdrop')
  const offclose = document.getElementById('offcanvas-close')

  btn.addEventListener('click', (e) => {
    e.preventDefault()
    open = !open
    btn.setAttribute('aria-expanded', String(open))

    if (off && backdrop) {
      off.setAttribute('aria-hidden', String(!open))
      backdrop.hidden = !open
    }
  })

  // Backdrop click and close button handling for the offcanvas menu
  backdrop?.addEventListener('click', () => {
    open = false
    off?.setAttribute('aria-hidden', 'true')
    backdrop.hidden = true
    btn.setAttribute('aria-expanded', 'false')
  })
  offclose?.addEventListener('click', () => {
    open = false
    off?.setAttribute('aria-hidden', 'true')
    backdrop.hidden = true
    btn.setAttribute('aria-expanded', 'false')
  })

  // Wire reporter link inside offcanvas to open reporter modal
  document.getElementById('offcanvas-reporter')?.addEventListener('click', (e) => {
    e.preventDefault()
    const modal = document.getElementById('reporter-modal')
    if (modal) openModal(modal)
    // close offcanvas
    open = false
    off?.setAttribute('aria-hidden', 'true')
    backdrop.hidden = true
    btn.setAttribute('aria-expanded', 'false')
  })
}

// Ensure sticky offsets (filter bar) respect the actual header & ticker size (fixes mobile overlap)
function initStickyOffsets() {
  const wrapper = document.querySelector('.filter-sticky-wrapper')
  if (!wrapper) return

  const ticker = document.querySelector('.news-ticker')
  const header = document.querySelector('.site-header')

  function updateTop() {
    const tickerH = ticker
      ? Math.ceil(ticker.getBoundingClientRect().height)
      : parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ticker-height')) ||
      0

    // Ensure header anchors immediately below the ticker to avoid tiny overlap
    header.style.top = `${tickerH}px`

    // Use header's bottom to place the sticky wrapper exactly below it
    const headerBottom = Math.ceil(header.getBoundingClientRect().bottom)

    // Minimal gap (0) — visual nudge handled in CSS to keep JS math exact
    const gap = 0

    if (window.innerWidth <= 768) {
      wrapper.style.top = `${headerBottom + gap}px`
    } else {
      wrapper.style.top = `calc(var(--ticker-height) + var(--header-height))`
    }
  }

  // Initial set
  updateTop()

  // Update on resize and orientation change
  window.addEventListener('resize', updateTop, { passive: true })
  window.addEventListener('orientationchange', updateTop)

  // If ResizeObserver available, watch header size changes
  if (window.ResizeObserver && header) {
    const ro = new ResizeObserver(updateTop)
    ro.observe(header)
    if (ticker) ro.observe(ticker)
  }
}

// Show/hide scroll hint overlays on the filter bar based on scroll position
function initFilterScrollHints() {
  const wrapper = document.querySelector('.filter-sticky-wrapper')
  const bar = document.querySelector('.filter-bar')
  if (!wrapper || !bar) return

  const leftHint = wrapper.querySelector('.filter-scroll-hint.left')
  const rightHint = wrapper.querySelector('.filter-scroll-hint.right')

  function updateHints() {
    const maxScrollLeft = bar.scrollWidth - bar.clientWidth
    if (bar.scrollLeft > 8) wrapper.classList.add('has-scroll-left')
    else wrapper.classList.remove('has-scroll-left')

    if (bar.scrollLeft < maxScrollLeft - 8) wrapper.classList.add('has-scroll-right')
    else wrapper.classList.remove('has-scroll-right')

    // Hints are positioned by syncFilterHintPositions(); do not modify transforms here
  }

  // Initial
  updateHints()

  bar.addEventListener(
    'scroll',
    () => {
      requestAnimationFrame(updateHints)
    },
    { passive: true }
  )

  // Also update on resize
  window.addEventListener('resize', updateHints, { passive: true })
}

// Ensure hint overlays line up exactly with the visible filter bar
function syncFilterHintPositions() {
  const wrapper = document.querySelector('.filter-sticky-wrapper')
  const bar = document.querySelector('.filter-bar')
  const leftHint = wrapper?.querySelector('.filter-scroll-hint.left')
  const rightHint = wrapper?.querySelector('.filter-scroll-hint.right')
  if (!wrapper || !bar || !leftHint || !rightHint) return

  function sync() {
    const wrapperRect = wrapper.getBoundingClientRect()
    const barRect = bar.getBoundingClientRect()
    // Compute top relative to wrapper
    const top = Math.max(0, Math.round(barRect.top - wrapperRect.top))
    const height = Math.max(0, Math.round(barRect.height))

    leftHint.style.top = top + 'px'
    leftHint.style.height = height + 'px'
    leftHint.style.left = '0px'

    rightHint.style.top = top + 'px'
    rightHint.style.height = height + 'px'
    rightHint.style.right = '0px'
  }

  // Run immediately
  sync()

  // Update on resize/orientation
  window.addEventListener('resize', sync, { passive: true })
  window.addEventListener('orientationchange', sync)

  // Observe size changes to the bar
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(sync)
    ro.observe(bar)
    ro.observe(wrapper)
  }
}

function switchTab(targetTab, navTriggers, tabContents) {
  // Update nav states (both desktop and mobile)
  navTriggers.forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === targetTab)
  })

  // Switch content
  tabContents.forEach((content) => {
    const isActive = content.id === targetTab
    content.classList.toggle('active', isActive)

    // Fix Leaflet map sizing when becoming visible
    if (isActive && targetTab === 'map' && state.mapInstance) {
      setTimeout(() => {
        state.mapInstance.invalidateSize(true)
        updateMapVisualization() // Re-render markers to ensure correct placement
      }, 500) // Increased timeout to wait for CSS animation
    }
  })

  // Scroll to top of content
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ===========================================
// MODAL
// ===========================================
function initModal() {
  const modal = document.getElementById('reporter-modal')
  const openTrigger = document.getElementById('reporter-link')
  const closeBtn = modal?.querySelector('.modal-close')

  if (!modal) return

  // Make the header "Kontakt" link open the reporter modal
  if (openTrigger) {
    openTrigger.addEventListener('click', (e) => {
      e.preventDefault()
      openModal(modal)
    })
  }

  closeBtn?.addEventListener('click', () => closeModal(modal))

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal(modal)
    }
  })

  // Form Submission (Updated for MVP)
  const form = modal.querySelector('.reporter-form')
  form?.addEventListener('submit', (e) => {
    e.preventDefault()
    const btn = form.querySelector('.submit-btn')
    const originalText = btn.textContent

    // Get form data
    const formData = new FormData(form)
    const name = form.querySelector('input[type="text"]').value
    const email = form.querySelector('input[type="email"]').value
    const body = form.querySelector('textarea').value

    // Create "Submitted" article entry
    const newSubmission = {
      id: `submission-${Date.now()}`,
      title: `Prijava: ${body.substring(0, 30)}...`,
      snippet: body.substring(0, 100) + '...',
      body: `<p>${body}</p><p><strong>Pošiljatelj:</strong> ${name} (${email})</p>`,
      category: 'LOKALNO',
      image: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=600&fit=crop', // Placeholder for submitted
      author: name,
      date: 'Upravo sada',
      readTime: '1 min',
      status: 'submitted', // Moderation status
      timestamp: new Date().toISOString(),
      tags: ['prijava', 'citizen-reporter'],
    }

    // Loading state
    btn.textContent = 'Slanje...'
    btn.disabled = true

    setTimeout(() => {
      // Save to global state
      state.allArticles.unshift(newSubmission)
      saveArticles()

      // Success state
      btn.textContent = 'Hvala! Primljeno.'
      btn.style.background = 'var(--success)'

      setTimeout(() => {
        closeModal(modal)
        form.reset()
        setTimeout(() => {
          btn.textContent = originalText
          btn.disabled = false
          btn.style.background = ''
        }, 300)
      }, 1000)
    }, 1500)
  })
}

function initNewsReaderModal() {
  const nrModal = document.getElementById('news-reader-modal')
  if (!nrModal) return

  // Close with button
  nrModal.querySelector('.modal-close')?.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    closeModal(nrModal)
  })

  // Prevent clicks inside the content from closing the backdrop
  nrModal.querySelector('.modal-content')?.addEventListener('click', (e) => {
    e.stopPropagation()
  })

  // Close on backdrop click (with protection against same-event-click)
  nrModal.addEventListener('click', (e) => {
    if (e.target === nrModal) {
      // Only close if it wasn't JUST opened (prevents event race condition)
      if (Date.now() - (nrModal._openedAt || 0) > 300) {
        closeModal(nrModal)
      }
    }
  })
}

function openModal(modal) {
  modal.hidden = false
  modal.scrollTop = 0
  document.body.style.overflow = 'hidden'
  modal.querySelector('input')?.focus()
}

function closeModal(modal) {
  modal.hidden = true
  document.body.style.overflow = ''
}

// ===========================================
// RADIO PLAYER (Demo)
// ===========================================
function initRadioPlayer() {
  const playBtn = document.getElementById('radio-play')
  const radioPlayer = document.getElementById('radio-player')
  if (!playBtn) return

  // Stream URL from config
  const audio = new Audio(CONFIG.urls.radioStream)

  audio.addEventListener('error', (e) => {
    debugError('Radio Stream Error:', e)
  })

  playBtn.addEventListener('click', () => {
    const isPlaying = playBtn.classList.contains('playing')
    const isLoading = playBtn.classList.contains('loading')
    if (isPlaying || isLoading) {
      // Pause
      audio.pause()
      audio.currentTime = 0
      playBtn.classList.remove('playing', 'loading')
      radioPlayer?.classList.remove('is-playing')
    } else {
      // Play
      playBtn.classList.add('loading')

      audio
        .play()
        .then(() => {
          playBtn.classList.remove('loading')
          playBtn.classList.add('playing')
          radioPlayer?.classList.add('is-playing')
        })
        .catch((err) => {
          playBtn.classList.remove('loading')
          debugError('Playback failed:', err)
          // Help user with HTTPS/Mixed content block
          if (window.location.protocol === 'https:') {
            alert(
              'Problem s pokretanjem: Preglednik blokira ovaj stream na HTTPS stranici. Pokušajte kliknuti na direktni link ispod playera.'
            )
            showDirectLink()
          }
        })
    }
  })

  function updateSongTitle(text) {
    const songTitle = document.querySelector('.song-title')
    const nowPlayingLabel = document.querySelector('.now-playing')

    if (songTitle && songTitle.textContent !== text) {
      // Animate the transition
      songTitle.classList.add('updating')
      setTimeout(() => {
        songTitle.textContent = text
        songTitle.classList.remove('updating')
      }, 300)
    }

    if (nowPlayingLabel) {
      // Reset label if we are just showing station name
      if (text === 'Radio Rab - 24/7' || text === 'Radio Rab - Uživo (92.6FM)') {
        nowPlayingLabel.textContent = 'Sada svira'
        nowPlayingLabel.style.color = ''
      }
    }
  }

  function startMetadataUpdates() {
    fetchMetadata()
  }

  function stopMetadataUpdates() {
    if (state.metadataTimeout) {
      clearTimeout(state.metadataTimeout)
      state.metadataTimeout = null
    }
  }

  function showDirectLink() {
    const container = document.querySelector('.radio-widget')
    if (!container || document.getElementById('direct-stream-link')) return

    const linkBox = document.createElement('div')
    linkBox.id = 'direct-stream-link'
    linkBox.style.cssText =
      'font-size: 0.7rem; margin-top: 1rem; text-align: center; color: var(--text-muted);'
    linkBox.innerHTML = `⚠️ Blokiran HTTPS od strane preglednika.<br><a href="${CONFIG.urls.radioStreamDirect}" target="_blank" style="color: var(--primary); text-decoration: underline;">Kliknite ovdje za slušanje u novom TAB-u</a>`
    container.appendChild(linkBox)
  }

  async function fetchMetadata() {
    const proxyBase = CONFIG.urls.corsProxy
    const timestamp = Date.now()
    let nextDelay = 15000 // Default fallback

    debugLog('Radio: Fetching metadata...')

    try {
      // Fetch all three in parallel, but don't let one failure stop the others
      const results = await Promise.allSettled([
        fetchCurrentSong(proxyBase, timestamp),
        fetchHistory(proxyBase, timestamp),
        fetchNext(proxyBase, timestamp),
      ])

      const currentSongResult = results[0]
      const expireTime =
        currentSongResult.status === 'fulfilled' ? currentSongResult.value : null

      if (expireTime) {
        const now = new Date()
        const [hours, minutes, seconds] = expireTime.split(':').map(Number)
        const expireDate = new Date()
        expireDate.setHours(hours, minutes, seconds)

        // Handle case where expire time is tomorrow (e.g. crossing midnight)
        if (expireDate < now && now.getTime() - expireDate.getTime() > 12 * 60 * 60 * 1000) {
          expireDate.setDate(expireDate.getDate() + 1)
        }

        const diff = expireDate.getTime() - now.getTime()
        if (diff > 0) {
          // Update 1s after song ends
          nextDelay = diff + 1500
          debugLog(`Next update scheduled in ${Math.round(nextDelay / 1000)}s (at ${expireTime})`)
        } else {
          // Song supposedly ended, check soon
          nextDelay = 5000
        }
      }
    } catch (e) {
      debugWarn('Radio: Metadata fetch error:', e)
      // On error, retry sooner
      nextDelay = 5000
    }


    debugLog(`Radio: Next update in ${Math.round(nextDelay / 1000)}s`)
    state.metadataTimeout = setTimeout(fetchMetadata, nextDelay)
  }

  async function fetchCurrentSong(proxyBase, timestamp) {
    const targetUrl = `${CONFIG.urls.metadataBase}/NowOnAir.xml?t=${timestamp}`;
    const response = await fetchWithRetry(targetUrl);
    if (!response) return null;

    const str = await response.text();
    const xmlDoc = new DOMParser().parseFromString(str, 'text/xml');
    const event = xmlDoc.querySelector('Event[status="happening"]');
    const songEl = event?.querySelector('Song');
    const artist = songEl?.querySelector('Artist')?.getAttribute('name');
    const songTitle = songEl?.getAttribute('title');
    const expireTime = songEl?.querySelector('Expire')?.getAttribute('Time');

    if (artist && songTitle) {
      updateSongTitle(`${artist} - ${songTitle}`);
      const nowPlayingLabel = document.querySelector('.now-playing');
      if (nowPlayingLabel) {
        nowPlayingLabel.textContent = '🎵 UŽIVO';
        nowPlayingLabel.style.color = 'var(--primary)';
      }
    }
    return expireTime;
  }

  async function fetchHistory(proxyBase, timestamp) {
    const targetUrl = `${CONFIG.urls.metadataBase}/AirPlayHistory.xml?t=${timestamp}`;
    const response = await fetchWithRetry(targetUrl);
    if (!response) return;

    const str = await response.text();
    const xmlDoc = new DOMParser().parseFromString(str, 'text/xml');
    const songs = Array.from(xmlDoc.querySelectorAll('Song')).slice(-5).reverse();
    const listContainer = document.getElementById('playlist-items');
    const mainContainer = document.getElementById('playlist-container');

    if (songs.length > 0 && listContainer) {
      mainContainer.hidden = false;
      listContainer.innerHTML = '';
      songs.forEach((song) => {
        const title = song.getAttribute('title');
        const artist = song.querySelector('Artist')?.getAttribute('name');
        const startTime = song.querySelector('Info')?.getAttribute('StartTime')?.substring(0, 5) || '';

        if (title && artist) {
          const item = document.createElement('div');
          item.className = 'playlist-item';
          item.innerHTML = `
            <span class="playlist-time">${startTime}</span>
            <div class="playlist-meta">
              <span class="playlist-artist">${escapeHtml(artist)}</span>
              <span class="playlist-song">${escapeHtml(title)}</span>
            </div>
          `;
          listContainer.appendChild(item);
        }
      });
    }
  }

  async function fetchNext(proxyBase, timestamp) {
    const targetUrl = `${CONFIG.urls.metadataBase}/AirPlayNext.xml?t=${timestamp}`;
    const response = await fetchWithRetry(targetUrl);
    if (!response) return;

    const str = await response.text();
    const xmlDoc = new DOMParser().parseFromString(str, 'text/xml');
    const nextSong = xmlDoc.querySelector('Event[status="coming up"] Song');

    if (nextSong) {
      const title = nextSong.getAttribute('title');
      const artist = nextSong.querySelector('Artist')?.getAttribute('name');
      const container = document.getElementById('next-up-container');
      if (title && artist && container) {
        container.hidden = false;
        document.getElementById('next-artist').textContent = artist;
        document.getElementById('next-song').textContent = title;
      }
    }
  }

  // Start polling immediately
  startMetadataUpdates()

  // Cleanup on page unload
  window.addEventListener('beforeunload', stopMetadataUpdates)
}

// ===========================================
// DATE DISPLAY
// ===========================================
function initDateDisplay() {
  const dateEl = document.querySelector('.current-date')
  if (!dateEl) return

  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }

  const now = new Date()
  dateEl.textContent = now.toLocaleDateString('hr-HR', options)
}

// ===========================================
// SCROLL EFFECTS
// ===========================================
function initScrollEffects() {
  const nav = document.querySelector('.news-nav')
  if (!nav) return

  let scrollTimeout

  function handleScroll() {
    const scrolled = window.scrollY > 100
    nav.style.background = scrolled ? 'rgba(2, 6, 23, 0.95)' : 'rgba(15, 23, 42, 0.85)'
  }

  window.addEventListener(
    'scroll',
    () => {
      if (scrollTimeout) {
        cancelAnimationFrame(scrollTimeout)
      }
      scrollTimeout = requestAnimationFrame(handleScroll)
    },
    { passive: true }
  )
}

// ===========================================
// UTILITIES
// ===========================================
function openReaderMode(id) {
  const article = state.allArticles.find((a) => a.id === id)
  if (!article) return

  const modal = document.getElementById('news-reader-modal')
  if (!modal) return

  // Populate Elements
  const breadcrumbs = document.getElementById('reader-breadcrumbs')
  const meta = document.getElementById('reader-meta')
  const title = document.getElementById('reader-title')
  const heroImg = document.getElementById('reader-hero-img')
  const aiText = document.getElementById('reader-ai-text')
  const body = document.getElementById('reader-body')
  const aiSummaryBox = document.getElementById('reader-ai-summary')

  if (breadcrumbs) {
    breadcrumbs.innerHTML = `
      <a href="#" class="breadcrumb-home">Naslovnica</a>
      <span class="sep">/</span>
      <span class="current">${article.category}</span>
    `
    breadcrumbs.querySelector('.breadcrumb-home')?.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      closeModal(modal)
    })
  }

  if (meta) meta.textContent = `${article.date} · ${article.readTime || '4 min'} čitanja`
  if (title) title.textContent = article.title
  if (heroImg) heroImg.style.backgroundImage = `url('${article.image}')`

  if (aiSummaryBox) {
    if (article.category === 'OSMRTNICE') {
      aiSummaryBox.setAttribute('hidden', '')
    } else {
      aiSummaryBox.removeAttribute('hidden')
      if (aiText)
        aiText.textContent =
          article.aiSummary || 'Automatski sažetak članka trenutno nije dostupan.'
    }
  }

  if (body) {
    const isObituary = article.category === 'OSMRTNICE'
    body.innerHTML = `
      ${isObituary ? `<img src="${article.image}" class="obituary-full-img" alt="Osmrtnica">` : ''}
      ${article.body || `<p>${escapeHtml(article.snippet)}</p>`}
    `
  }

  // Handle sharing in modal
  modal.querySelectorAll('[data-share]').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation()
      shareArticle(btn.dataset.share)
    }
  })

  // Set opening timestamp to prevent accidental auto-close
  modal._openedAt = Date.now()
  openModal(modal)
}

function shareArticle(method) {
  const url = window.location.href
  const title = document.querySelector('.main-feature h2')?.textContent || 'Radio Rab'

  switch (method) {
    case 'copy':
      navigator.clipboard.writeText(url).then(() => {
        alert('Poveznica kopirana!')
      })
      break
    case 'twitter':
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          title
        )}&url=${encodeURIComponent(url)}`,
        '_blank'
      )
      break
    case 'facebook':
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        '_blank'
      )
      break
  }
}

/**
 * Initialize Back to Top Button
 */
function initBackToTop() {
  const btn = document.getElementById('back-to-top')
  if (!btn) return

  const showThreshold = 400

  const toggleVisibility = () => {
    if (window.scrollY > showThreshold) {
      btn.classList.add('visible')
    } else {
      btn.classList.remove('visible')
    }
  }

  window.addEventListener('scroll', toggleVisibility, { passive: true })
  toggleVisibility()

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })
}

function initMarketplace() {
  const container = document.querySelector('#market .demo-placeholder')
  if (!container) return

  const marketSection = document.getElementById('market')
  marketSection.innerHTML = `
        <div class="section-header">
            <h2>RAPSKA TRŽNICA</h2>
            <p>Najbolje od lokalnih proizvođača</p>
        </div>
        <div class="market-grid">
            ${(typeof MARKET_ITEMS !== 'undefined' ? MARKET_ITEMS : getMockMarketItems())
      .map(
        (item) => `
                <div class="market-card card-animate">
                    <div class="market-img" style="background-image: url('${escapeHtml(
          item.image
        )}')">
                        <span class="price-tag">${escapeHtml(item.price)}</span>
                    </div>
                    <div class="market-info">
                        <h3>${escapeHtml(item.title)}</h3>
                        <p class="seller">${escapeHtml(item.seller)}</p>
                        <button class="btn-market">Kontaktiraj</button>
                    </div>
                </div>
            `
      )
      .join('')}
        </div>
    `
}

function getMockMarketItems() {
  return [
    {
      title: 'Domaće Maslinovo Ulje',
      seller: 'OPG Kaštelan',
      price: '18 €/l',
      image: 'https://picsum.photos/seed/oil/400/300',
    },
    {
      title: 'Rapska Torta',
      seller: 'Vilma Slastice',
      price: '25 €',
      image: 'https://picsum.photos/seed/cake/400/300',
    },
    {
      title: 'Med od Kadulje',
      seller: 'Pčelarstvo Krstić',
      price: '12 €',
      image: 'https://picsum.photos/seed/honey/400/300',
    },
    {
      title: 'Ovčji Sir',
      seller: 'OPG Gvačić',
      price: '30 €/kg',
      image: 'https://picsum.photos/seed/cheese/400/300',
    },
    {
      title: 'Domace Tjestenine',
      seller: 'Pasta Rab',
      price: '8 €',
      image: 'https://picsum.photos/seed/pasta/400/300',
    },
    {
      title: 'Rapski Likeri',
      seller: 'Destilerija Rab',
      price: '22 €',
      image: 'https://picsum.photos/seed/liqueur/400/300',
    },
  ]
}

function initVideos() {
  const container = document.querySelector('#shorts .demo-placeholder')
  if (!container) return

  const videosSection = document.getElementById('shorts')
  videosSection.innerHTML = `
        <div class="section-header">
            <h2>VIDEO</h2>
            <p>Aktualni video sadržaji</p>
        </div>
        <div class="video-grid">
            ${getMockVideos()
      .map(
        (video) => `
                <div class="video-card card-animate">
                    <div class="video-thumb" style="background-image: url('${escapeHtml(
          video.thumbnail
        )}')">
                        <span class="video-duration">${escapeHtml(video.duration)}</span>
                        <div class="play-btn">▶</div>
                    </div>
                    <div class="video-info">
                        <h3>${escapeHtml(video.title)}</h3>
                        <p class="video-meta">${escapeHtml(video.views)} pregleda</p>
                    </div>
                </div>
            `
      )
      .join('')}
        </div>
    `
}

function getMockVideos() {
  return [
    {
      title: 'Festival Rapske Fjere 2024',
      duration: '3:45',
      views: '12K',
      thumbnail: 'https://picsum.photos/seed/fjere/400/225',
    },
    {
      title: 'Katedrala sv. Kristofora',
      duration: '2:30',
      views: '8.5K',
      thumbnail: 'https://picsum.photos/seed/katedrala/400/225',
    },
    {
      title: 'Rabski Korzo u proljece',
      duration: '4:15',
      views: '15K',
      thumbnail: 'https://picsum.photos/seed/korzo/400/225',
    },
  ]
}
