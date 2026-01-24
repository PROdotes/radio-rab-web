/**
 * Radio Rab News Portal — Main Application
 * Version: 2.0.0
 */
/* global L */

// ===========================================
// CONFIGURATION
// ===========================================
const CONFIG = {
  itemsPerBatch: 9,
  scrollThreshold: 200,
  animationDelay: 80,
  loadDelay: 300,
  debug: false, // Set to true to enable console logging

  // URLs - centralized for easy maintenance
  urls: {
    radioStream: 'http://de4.streamingpulse.com:7014/stream', // Official domain
    radioStreamDirect: 'http://de4.streamingpulse.com:7014/stream', // Direct HTTP failsafe
    metadataBase: 'https://radio-rab.hr',
    corsProxy: 'https://corsproxy.io/?url=',
    mapTiles: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    npt: {
      dataUrl: 'data/traffic.json',
      coastalUrl: 'data/traffic-coastal.json',
      globalUrl: 'data/traffic-global.json',
    },
  },

  // Ferry settings (Mišnjak-Stinica is manual, Rapska Plovidba)
  ferry: {
    misnjakCoords: [44.7086, 14.8647],
    stinicaCoords: [44.7214, 14.8911],
    tripDurationMins: 15,
    // Manual schedule (Update once a year)
    schedule: [
      '05:30',
      '07:00',
      '08:30',
      '10:00',
      '11:30',
      '13:00',
      '14:30',
      '16:00',
      '17:30',
      '19:00',
      '20:30',
      '22:00',
    ],
    // Manual override for Radio Staff (set to true during Bura/Storm)
    isSuspended: false,
  },

  // Refresh settings
  nptRefreshInterval: 300000, // 5 minutes

  // Station Name Mapping
  stationNames: {
    401: 'Senj',
    400: 'Pag (Most)',
    402: 'Bakar',
    403: 'Krk (Most)',
    404: 'Pula',
    405: 'Rijeka',
  },
}

// Debug logging utility
function debugLog(...args) {
  if (CONFIG.debug) {
    console.log(...args)
  }
}

function debugWarn(...args) {
  if (CONFIG.debug) {
    console.warn(...args)
  }
}

function debugError(...args) {
  if (CONFIG.debug) {
    console.error(...args)
  }
}

// ===========================================
// STATE
// ===========================================
const state = {
  currentVisibleCount: 0,
  activeCategory: 'all',
  isLoading: false,
  observer: null,
  mapInstance: null,
  ferryInterval: null, // Track ferry simulation interval for cleanup
  metadataTimeout: null, // Track metadata polling timeout for cleanup
  nptRefreshInterval: null, // Timer for refreshing live data
  nptAlerts: [], // Store live road traffic alerts
  manualOverrides: {
    ferrySuspended: false,
    d8Restricted: false,
  },
}

// ===========================================
// INITIALIZATION
// ===========================================
document.addEventListener('DOMContentLoaded', init)

function init() {
  // Initialize components based on page content
  if (document.getElementById('primary-feature-container')) {
    initNewsFeed()
  }

  initNavigation()
  initModal()
  initRadioPlayer()
  initDateDisplay()
  initScrollEffects()
  initMarketplace()
  initVideos()
  initMap()
  initGlobalEventListeners()
  initNPT()
  initAdminPortal()
}

/**
 * Initialize NPT (National Access Point) Integration
 */
async function initNPT() {
  debugLog('NPT System: Initializing...')

  let data = null

  // 1. Try Global Variable (Local file protocol support)
  if (typeof NPT_DATA !== 'undefined') {
    debugLog('NPT: Loading from window.NPT_DATA')
    data = NPT_DATA
  }
  // 2. Try Fetch (Production support)
  else {
    debugLog('NPT: Loading from fetch')
    try {
      const response = await fetch(CONFIG.urls.npt.dataUrl)
      if (response.ok) {
        data = await response.json()
      }
    } catch (e) {
      debugWarn('NPT: Fetch failed:', e)
    }
  }

  if (!data) {
    debugWarn('NPT: Could not load data')
    return
  }

  try {
    // Handle both legacy array-only and new object-format data
    // Handle both legacy array-only and new object-format data
    const alerts = Array.isArray(data) ? data : data.events || data.alerts || []
    const weather = Array.isArray(data) ? null : data.weather || null
    const islandWeather = Array.isArray(data) ? null : data.islandWeather || null
    const islandCounters = Array.isArray(data) ? null : data.islandCounters || data.counters || null // DATA UPDATE: Use islandCounters
    const allCounters = Array.isArray(data) ? null : data.counters || null
    const updatedAt = Array.isArray(data) ? null : data.updatedAt || null

    state.nptAlerts = alerts
    state.nptWeather = weather
    state.nptIslandWeather = islandWeather
    state.nptCounters = islandCounters // Prioritize filtered counters
    state.nptUpdatedAt = updatedAt

    // --- EXTERNAL WEATHER FALLBACK (Open-Meteo) ---
    // Since NPT often lacks Rab-specific sensors, we supplement with Open-Meteo for the island coordinates
    try {
      const externalRab = await fetchExternalWeather(44.7554, 14.761, 'Rab (Grad)')
      if (externalRab) {
        if (!state.nptIslandWeather) state.nptIslandWeather = []
        // Add or update Rab data
        const existingIdx = state.nptIslandWeather.findIndex((w) => w.id === externalRab.id)
        if (existingIdx >= 0) state.nptIslandWeather[existingIdx] = externalRab
        else state.nptIslandWeather.unshift(externalRab) // Put Rab at top
      }
    } catch (err) {
      debugWarn('Weather: External fallback failed', err)
    }

    debugLog(
      `NPT: Loaded ${alerts.length} alerts, ${state.nptIslandWeather?.length || 0
      } island weather stations, Updated: ${updatedAt}`
    )

    updateNewsTickerWithNPT(alerts)
    updateTrafficAlerts(alerts, updatedAt)
    if (state.nptIslandWeather) updateWeatherWithNPT(state.nptIslandWeather)

    // Update Sync Status UI
    updateSyncStatus(updatedAt)

    // Update Map Visualization
    updateMapVisualization()

    // Add Custom Controls
    addMapControls()

    // Scope Filter Change
    if (!state.nptRefreshInterval) {
      state.nptRefreshInterval = setInterval(initNPT, CONFIG.nptRefreshInterval)
      debugLog(`NPT: Auto-refresh enabled (every ${CONFIG.nptRefreshInterval / 1000}s)`)
    }
  } catch (e) {
    debugWarn('NPT: Error processing data:', e)
    updateSyncStatus(null, true)
  }
}

/**
 * Update UI with Sync Status
 */
function updateSyncStatus(timestamp, isError = false) {
  const syncDot = document.getElementById('npt-sync-dot')
  const syncText = document.getElementById('npt-sync-text')
  const adminStatus = document.getElementById('admin-sync-status')

  if (!syncDot || !syncText) return

  if (isError) {
    syncDot.style.background = 'var(--error)'
    syncText.textContent = 'Veza prekinuta'
    if (adminStatus) adminStatus.textContent = 'Greška pri sinkronizaciji'
    return
  }

  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' })
    : '---'
  syncDot.style.background = 'var(--success)'
  syncText.textContent = `Sinkronizirano u ${time}`
  if (adminStatus) adminStatus.textContent = `Podaci od ${time}`
}

/**
 * Fetch weather from Open-Meteo (No API Key Required)
 */
async function fetchExternalWeather(lat, lng, name) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=auto`
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const data = await response.json()
    const current = data.current

    return {
      id: `EXT:${name.replace(/\s+/g, '_')}`,
      name: name,
      lat: lat,
      lng: lng,
      temp: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      windGust: current.wind_gusts_10m,
      windDir: current.wind_direction_10m,
      source: 'Open-Meteo',
      distanceFromRab: 0, // It IS Rab
    }
  } catch (e) {
    return null
  }
}

function updateNewsTickerWithNPT(alerts) {
  const tickerContent = document.querySelector('.ticker-content')
  if (!tickerContent) return

  // Filter for island-critical alerts only
  const critical = alerts
    .filter((a) => {
      const details = (a.details || '').toLowerCase()
      const road = (a.road || '').toUpperCase()
      const rabRegex = /\b(rab|rapsk)[a-z]{0,3}\b/i

      // Only show Ferry, Otok Rab specifically, or the bridge/access roads
      return (
        rabRegex.test(details) ||
        details.includes('stinica') ||
        details.includes('mišnjak') ||
        road.includes('D105') ||
        (road.includes('D8') && (details.includes('senj') || details.includes('buri')))
      )
    })
    .slice(0, 3) // Limit to top 3 most important

  if (critical.length === 0) return

  // Clear and build clean ticker items
  const alertItems = critical
    .map(
      (a) => `
        <span class="ticker-item" style="color: var(--warning); font-weight: 800;">⚠️ ${a.road
        }: ${a.details.substring(0, 80)}${a.details.length > 80 ? '...' : ''}</span>
        <span class="ticker-separator">•</span>
    `
    )
    .join('')

  // Prepend to existing static items (which are baseline island info)
  tickerContent.innerHTML = alertItems + tickerContent.innerHTML
}

/**
 * Update the dedicated Traffic Alerts widget
 */
function updateTrafficAlerts(alerts, updatedAt) {
  const widget = document.getElementById('traffic-alerts-widget')
  const container = document.getElementById('alert-items-container')
  if (!widget || !container) return

  // Filter for Rab-relevant alerts
  const relevant = alerts.filter((a) => {
    const details = (a.details || '').toLowerCase()
    const road = (a.road || '').toUpperCase()
    const lat = parseFloat(a.lat)
    const lng = parseFloat(a.lng)

    // Regex for island specific mentions
    const rabRegex = /\b(rab|rapsk)[a-z]{0,3}\b/i
    const hasRabKeyword = rabRegex.test(details)
    const hasFerryKeyword =
      details.includes('stinica') ||
      details.includes('mišnjak') ||
      details.includes('trajekt') ||
      details.includes('jadrolinija')

    // 1. Mandatory Include: Island Road or Keywords
    if (hasRabKeyword || hasFerryKeyword || road.includes('D105')) return true

    // 2. Geographic Filtering (High precision)
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      const dist = getDistanceFromLatLonInKm(44.7554, 14.761, lat, lng)

      // Automatic include if very close (< 35km - local island access)
      if (dist < 35) return true

      // Secondary include for major access roads only if nearby (< 70km)
      // BUT: strictly only for high-impact events (accidents, closures, wind)
      const isAccessRoad = road.includes('D8') || road.includes('A1') || road.includes('A6') || road.includes('A7') || road.includes('D23')
      if (isAccessRoad && dist < 70) {
        const text = details.toLowerCase()
        const isUrgent =
          text.includes('nesreć') ||
          text.includes('sudar') ||
          text.includes('zatvoren') ||
          text.includes('prekid') ||
          text.includes('bura') ||
          text.includes('vjetar')

        return isUrgent
      }
    }

    return false // If it reached here, it's not relevant
  })

  if (relevant.length === 0) {
    widget.style.display = 'none'
    return
  }

  widget.style.display = 'block'

  // Show max 3 alerts initially, with expand option
  const maxVisible = 3
  const hasMore = relevant.length > maxVisible

  const renderAlert = (a, isHidden = false) => {
    const type = getAlertType(a)
    const icon = getAlertIcon(type)
    const timeStr = a.timestamp
      ? new Date(a.timestamp).toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' })
      : ''

    return `
            <div class="alert-card alert-${type}${isHidden ? ' alert-hidden' : ''
      }" title="Klikni za više">
                <div class="alert-icon">${icon}</div>
                <div class="alert-info-wrapper">
                    <span class="alert-road">${escapeHtml(a.road || 'Obavijest')}</span>
                    <p class="alert-text">${escapeHtml(a.details)}</p>
                    ${timeStr ? `<span class="alert-time">${timeStr}</span>` : ''}
                </div>
            </div>
        `
  }

  const visibleAlerts = relevant
    .slice(0, maxVisible)
    .map((a) => renderAlert(a))
    .join('')
  const hiddenAlerts = relevant
    .slice(maxVisible)
    .map((a) => renderAlert(a, true))
    .join('')

  container.innerHTML = visibleAlerts + hiddenAlerts

  // Click to expand individual alert text
  container.querySelectorAll('.alert-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.alert-expand-btn')) return
      card.classList.toggle('expanded')
    })
  })

  // Add expand button if more alerts hidden
  if (hasMore) {
    const expandBtn = document.createElement('button')
    expandBtn.className = 'alert-expand-btn'
    expandBtn.innerHTML = `+ još ${relevant.length - maxVisible}`
    expandBtn.addEventListener('click', () => {
      const isExpanded = widget.classList.toggle('alerts-expanded')
      expandBtn.innerHTML = isExpanded ? 'Sakrij' : `+ još ${relevant.length - maxVisible}`
    })
    container.appendChild(expandBtn)
  }

  // Add Updated At footer
  if (updatedAt) {
    let footer = widget.querySelector('.widget-footer-time')
    if (!footer) {
      footer = document.createElement('div')
      footer.className = 'widget-footer-time'
      footer.style.cssText =
        'font-size: 0.7rem; color: var(--text-muted); margin-top: 10px; text-align: right; border-top: 1px solid var(--border); padding-top: 5px;'
      widget.appendChild(footer)
    }
    const time = new Date(updatedAt).toLocaleTimeString('hr-HR', {
      hour: '2-digit',
      minute: '2-digit',
    })
    footer.innerText = `Ažurirano: ${time}`
  }
}

function getAlertType(alert) {
  // Parse text content for keywords first (NPT often marks everything as "info")
  const text = (alert.details || '').toLowerCase()

  if (text.includes('vjetar') || text.includes('bura') || text.includes('wind')) return 'wind'
  if (text.includes('nezgod') || text.includes('accident') || text.includes('sudar'))
    return 'accident'
  if (text.includes('zatvoren') || text.includes('closed') || text.includes('obustav'))
    return 'closure'
  if (
    text.includes('radov') ||
    text.includes('oštećenj') ||
    text.includes('kolotrag') ||
    text.includes('održavan')
  )
    return 'roadworks'
  if (text.includes('kvar') || text.includes('vozilo u kvaru')) return 'accident'

  // Fall back to explicit type field if no keywords matched
  if (alert.type) {
    const type = alert.type.toLowerCase()
    if (type === 'wind' || type === 'weather') return 'wind'
    if (type === 'roadworks' || type === 'maintenance') return 'roadworks'
    if (type === 'accident') return 'accident'
    if (type === 'closure') return 'closure'
  }

  return 'info'
}

function getAlertIcon(type) {
  switch (type) {
    case 'wind':
      return '💨'
    case 'roadworks':
      return '🚧'
    case 'accident':
      return '💥'
    case 'closure':
      return '🚫'
    case 'info':
      return 'ℹ️'
    default:
      return '⚠️'
  }
}

function updateWeatherWithNPT(weather) {
  if (!weather || weather.length === 0) return

  // Use Island Weather (Local) instead of global
  // Log strongest wind in 75km radius for Ferry/Bridge decisions
  if (!weather || weather.length === 0) return

  // Sort by wind gust desc
  const sorted = [...weather].sort(
    (a, b) => (parseFloat(b.windGust) || 0) - (parseFloat(a.windGust) || 0)
  )

  // Find Senj or Stinica if possible, otherwise max
  // 401 = Senj. If available, it's the gold standard for Ferry.
  // For the UI display, we prefer "Rab (Grad)" if available, otherwise strongest
  const rabDisplay = weather.find((s) => s.id === 'EXT:Rab_(Grad)')
  const displayWind = rabDisplay || maxWind

  const gustVal = parseFloat(maxWind.windGust) || 0
  const displayGust = parseFloat(displayWind.windGust) || 0
  const stationName =
    CONFIG.stationNames[maxWind.id] || maxWind.name || maxWind.id || 'Lokacija nepoznata'

  debugLog(
    `Weather: Current max ${gustVal} km/h (Senj/Max), Displaying ${displayGust} km/h (${displayWind.name})`
  )

  // LOGIC: If gust > 80 km/h at the most critical station (Senj/Max), flag potential service break
  const isHighWind = gustVal > 80

  // Update the "More i Vrijeme" widget if it exists
  const windValueEl = document.querySelector('[data-weather="wind"] .weather-value')
  if (windValueEl) {
    windValueEl.textContent = `Vjetar ${Math.round(displayGust)} km/h`
    if (displayWind.id.startsWith('EXT'))
      windValueEl.title = `Lokacija: ${displayWind.name} (Open-Meteo)`

    if (isHighWind) windValueEl.classList.add('val-red')
    else windValueEl.classList.remove('val-red')
  }

  // Sync with Sidebar Status
  const d8StatusEl = document.getElementById('d8-status')
  if (d8StatusEl && isHighWind && !state.manualOverrides.d8Restricted) {
    d8StatusEl.innerHTML = `⚠️ Otežano zbog vjetra`
    d8StatusEl.className = 'value val-yellow'
  }

  const ferryStatusEl = document.querySelector('[data-live="ferry-misnjak"] .value')
  if (ferryStatusEl && isHighWind && !state.manualOverrides.ferrySuspended) {
    ferryStatusEl.textContent = `⚠️ Moguć prekid (Vjetar)`
    ferryStatusEl.className = 'value val-yellow'
  }

  // Add auto-generated wind alert if high wind detected and no existing wind alert
  if (
    isHighWind &&
    !state.nptAlerts.some(
      (a) => a.details.toLowerCase().includes('vjetar') || a.details.toLowerCase().includes('bura')
    )
  ) {
    debugLog('Weather: High wind detected, generating auto-alert')
  }
}

/**
 * Admin Portal Logic
 */
function initAdminPortal() {
  const modal = document.getElementById('admin-modal')
  const btn = document.getElementById('staff-portal-btn')
  const close = document.getElementById('admin-close')
  const ferryToggle = document.getElementById('ferry-override-toggle')
  const d8Toggle = document.getElementById('d8-override-toggle')

  if (!modal) return

  const toggleModal = () => {
    const isHidden = modal.hasAttribute('hidden')
    if (isHidden) {
      modal.removeAttribute('hidden')
      // Sync toggles with current state
      if (ferryToggle) ferryToggle.checked = state.manualOverrides.ferrySuspended
      if (d8Toggle) d8Toggle.checked = state.manualOverrides.d8Restricted
    } else {
      modal.setAttribute('hidden', '')
    }
  }

  // Hidden Shortcut: Alt + Shift + A
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && e.key === 'A') {
      e.preventDefault()
      toggleModal()
    }
  })

  // Footer Link
  btn?.addEventListener('click', (e) => {
    e.preventDefault()
    toggleModal()
  })

  close?.addEventListener('click', toggleModal)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) toggleModal()
  })

  // Handle Manual Overrides
  ferryToggle?.addEventListener('change', (e) => {
    state.manualOverrides.ferrySuspended = e.target.checked
    debugLog('Admin: Ferry suspension set to', e.target.checked)
    // Force UI update
    if (state.nptIslandWeather) updateWeatherWithNPT(state.nptIslandWeather)

    // Manual override feedback in sidebar
    const ferryStatusEl = document.querySelector('[data-live="ferry-misnjak"] .value')
    if (ferryStatusEl) {
      if (e.target.checked) {
        ferryStatusEl.textContent = '🚫 PREKID (Admin)'
        ferryStatusEl.className = 'value val-red'
      } else {
        initNPT() // Refresh from data
      }
    }
  })

  d8Toggle?.addEventListener('change', (e) => {
    state.manualOverrides.d8Restricted = e.target.checked
    debugLog('Admin: D8 restriction set to', e.target.checked)
    if (state.nptIslandWeather) updateWeatherWithNPT(state.nptIslandWeather)

    const d8StatusEl = document.getElementById('d8-status')
    if (d8StatusEl) {
      if (e.target.checked) {
        d8StatusEl.innerHTML = '⚠️ Zabrana I. skupina (Admin)'
        d8StatusEl.className = 'value val-yellow'
      } else {
        initNPT()
      }
    }
  })
}

// ===========================================
// GLOBAL EVENT LISTENERS
// ===========================================
function initGlobalEventListeners() {
  // Reader mode exit button
  document.getElementById('reader-exit-btn')?.addEventListener('click', toggleReaderMode)

  // Newsletter form
  const newsletterForm = document.getElementById('newsletter-form')
  newsletterForm?.addEventListener('submit', (e) => {
    e.preventDefault()
    const btn = newsletterForm.querySelector('button')
    const input = newsletterForm.querySelector('input')
    const originalText = btn.textContent

    btn.textContent = 'Hvala!'
    btn.disabled = true
    input.disabled = true

    setTimeout(() => {
      btn.textContent = originalText
      btn.disabled = false
      input.disabled = false
      input.value = ''
    }, 2000)
  })
}

// ===========================================
// MARKETPLACE
// ===========================================
function initMarketplace() {
  const container = document.querySelector('#market .demo-placeholder')
  if (!container) return // Already initialized or missing

  // Replace placeholder with grid
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
      title: 'Suhe Smokve',
      seller: 'Domaća Radinost',
      price: '8 €',
      image: 'https://picsum.photos/seed/figs/400/300',
    },
    {
      title: 'Eko Povrće Košarica',
      seller: 'Vrtovi Raba',
      price: '15 €',
      image: 'https://picsum.photos/seed/veg/400/300',
    },
  ]
}

// ===========================================
// VIDEO / SHORTS
// ===========================================
function initVideos() {
  const container = document.querySelector('#shorts .demo-placeholder')
  if (!container) return

  const shortsSection = document.getElementById('shorts')
  shortsSection.innerHTML = `
        <div class="section-header">
            <h2>VIDEO VIJESTI</h2>
            <p>Aktualno, kratko i jasno</p>
        </div>
        <div class="video-grid">
             ${(typeof VIDEO_ITEMS !== 'undefined' ? VIDEO_ITEMS : getMockVideos())
      .map(
        (video) => `
                <div class="video-card card-animate">
                    <div class="video-thumb" style="background-image: url('${escapeHtml(
          video.image
        )}')">
                        <div class="play-overlay">▶</div>
                        <span class="video-duration">${escapeHtml(video.duration)}</span>
                    </div>
                    <div class="video-info">
                        <h3>${escapeHtml(video.title)}</h3>
                        <span class="video-views">${escapeHtml(video.views)} pregleda</span>
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
      title: 'Nevera pogodila luku Rab',
      duration: '0:45',
      views: '1.2k',
      image: 'https://picsum.photos/seed/storm/300/500',
    },
    {
      title: 'Svečano otvorenje Fjere',
      duration: '1:20',
      views: '3.5k',
      image: 'https://picsum.photos/seed/fjera/300/500',
    },
    {
      title: 'Novi trajekt "Otok Rab"',
      duration: '0:55',
      views: '800',
      image: 'https://picsum.photos/seed/ferry/300/500',
    },
    {
      title: 'Intervju: Gradonačelnik',
      duration: '2:15',
      views: '2.1k',
      image: 'https://picsum.photos/seed/mayor/300/500',
    },
    {
      title: 'Sportski vikend: Sažetak',
      duration: '1:05',
      views: '950',
      image: 'https://picsum.photos/seed/sport/300/500',
    },
  ]
}

// ===========================================
// NEWS FEED
// ===========================================
function initNewsFeed() {
  renderHero(HERO_ARTICLE)
  loadMoreArticles()
  initInfiniteScroll()
  initFilters()
}

function renderHero(article) {
  const container = document.getElementById('primary-feature-container')
  if (!container || !article) return

  container.innerHTML = `
        <article class="main-feature card-animate" style="--delay: 1; display: flex; flex-direction: column; height: 100%; border-radius: var(--radius); overflow: hidden;">
            <div class="feature-img-container" style="flex-grow: 1; min-height: 440px; position: relative; overflow: hidden;">
                <span class="category-pill" style="position: absolute; top: 1.5rem; left: 1.5rem; z-index: 10; margin: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">${escapeHtml(article.category)}</span>
                <div class="feature-img" style="background-image: url('${escapeHtml(
    article.image
  )}'); height: 100%; width: 100%; background-size: cover; background-position: center; transition: transform 0.8s var(--ease-out);" role="img" aria-label="${escapeHtml(article.title)}"></div>
            </div>
            <div class="feature-content" style="padding: 2.5rem; background: var(--bg-card); border-top: 1px solid var(--border);">
                <div class="flex-between" style="margin-bottom: 0.5rem;">
                    <span class="meta-info" style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">${escapeHtml(article.date)} · ${escapeHtml(article.readTime)} čit.</span>
                </div>
                <h2 style="font-size: 2.5rem; margin-bottom: 1rem; font-weight: 900; line-height: 1.1; color: #fff;">${escapeHtml(article.title)}</h2>
                <p style="color: var(--text-dim); margin-bottom: 1.5rem; line-height: 1.7; font-size: 1.1rem;">${escapeHtml(article.snippet)}</p>
                
                <div class="editorial-ai" style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); padding: 1.25rem; border-radius: var(--radius-sm); margin-bottom: 1.5rem;">
                    <p class="ai-label" style="font-size: 0.65rem; font-weight: 800; color: var(--primary); letter-spacing: 0.1em; margin-bottom: 0.5rem;">AI SAŽETAK</p>
                    <p style="font-size: 0.95rem; color: #cbd5e1; margin-bottom: 0; line-height: 1.6;">${escapeHtml(article.aiSummary || 'Automatski sažetak članka trenutno nije dostupan.')}</p>
                </div>

                <div class="article-actions" style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                    <button class="action-btn" id="reader-mode-btn" style="background: var(--primary); color: #fff; border: none; padding: 0.6rem 1.25rem; border-radius: var(--radius-pill); font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span class="icon">📖</span> <span class="label">Pročitaj članak</span>
                    </button>
                    <div class="share-group" style="display: flex; gap: 0.5rem;">
                        <button class="action-btn icon-only" data-share="copy" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border); padding: 0.5rem; border-radius: 50%; color: var(--text-dim);">🔗</button>
                        <button class="action-btn icon-only" data-share="twitter" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border); padding: 0.5rem; border-radius: 50%; color: var(--text-dim);">𝕏</button>
                        <button class="action-btn icon-only" data-share="facebook" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border); padding: 0.5rem; border-radius: 50%; color: var(--text-dim);">f</button>
                    </div>
                </div>
            </div>
        </article>
    `

  // Attach event listeners instead of inline onclick
  container.querySelector('#reader-mode-btn')?.addEventListener('click', toggleReaderMode)
  container.querySelectorAll('[data-share]').forEach((btn) => {
    btn.addEventListener('click', () => shareArticle(btn.dataset.share))
  })
}

function loadMoreArticles() {
  const grid = document.getElementById('news-grid')
  if (!grid || state.isLoading) return

  const filteredArticles = getFilteredArticles()
  const nextBatch = filteredArticles.slice(
    state.currentVisibleCount,
    state.currentVisibleCount + CONFIG.itemsPerBatch
  )

  if (nextBatch.length === 0) {
    hideLoader()
    return
  }

  state.isLoading = true

  // Simulate network delay for demo
  setTimeout(() => {
    const fragment = document.createDocumentFragment()

    nextBatch.forEach((article, index) => {
      const card = createNewsCard(article, index)
      fragment.appendChild(card)
    })

    grid.appendChild(fragment)
    state.currentVisibleCount += nextBatch.length
    state.isLoading = false

    // Check if more articles available
    if (state.currentVisibleCount >= filteredArticles.length) {
      hideLoader()
    }
  }, CONFIG.loadDelay)
}

function createNewsCard(article, index) {
  const card = document.createElement('article')
  card.className = 'small-news-card card-animate'
  card.style.setProperty('--delay', (index % 3) + 1)
  card.setAttribute('data-category', article.category)

  card.innerHTML = `
        <div class="feature-img-container small-img-container">
            <span class="category-pill" style="position: absolute; top: 1rem; left: 1rem; z-index: 2; margin: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-size: 0.6rem;">${escapeHtml(article.category)}</span>
            <div class="feature-img" style="background-image: url('${escapeHtml(
    article.image
  )}');" role="img" aria-label="${escapeHtml(article.title)}"></div>
        </div>
        <div class="feature-content" style="padding: 1.25rem;">
            <h3 style="font-size: 1.15rem; line-height: 1.3; font-weight: 800; margin-bottom: 0.75rem; color: #fff;">${escapeHtml(article.title)}</h3>
            <p style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: 1.5rem; line-clamp: 3; -webkit-line-clamp: 3; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(article.snippet)}</p>
            <div class="meta-info flex-between" style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">
                <span>${escapeHtml(article.author)}</span>
                <span>${escapeHtml(article.date)}</span>
            </div>
        </div>
    `

  return card
}

function getFilteredArticles() {
  if (state.activeCategory === 'all') {
    return ALL_ARTICLES
  }
  return ALL_ARTICLES.filter((a) => a.category === state.activeCategory)
}

// ===========================================
// FERRY MAP & SIMULATION
// ===========================================

function initMap() {
  const mapEl = document.getElementById('leaflet-map')
  if (!mapEl || state.mapInstance) return // Don't re-init if already exists

  // Wait for Leaflet to load
  if (typeof L === 'undefined') {
    setTimeout(initMap, 500)
    return
  }

  // Init Map centered on Rab-Mainland channel
  state.mapInstance = L.map('leaflet-map').setView([44.715, 14.878], 11)

  L.tileLayer(CONFIG.urls.mapTiles, {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(state.mapInstance)

  // Create Layer Groups
  state.layers = {
    ferry: L.layerGroup().addTo(state.mapInstance),
    markers: L.layerGroup().addTo(state.mapInstance), // Unified marker layer
  }

  // --- CUSTOM FILTER CONTROL ---
  const FilterControl = L.Control.extend({
    onAdd: function (map) {
      const div = L.DomUtil.create('div', 'map-filters glass')
      div.style.padding = '1rem'
      div.style.background = 'rgba(15, 23, 42, 0.8)'
      div.style.backdropFilter = 'blur(12px)'
      div.style.borderRadius = '12px'
      div.style.border = '1px solid rgba(255, 255, 255, 0.1)'
      div.style.color = 'white'
      div.style.minWidth = '200px'

      div.innerHTML = `
                <h5 style="margin: 0 0 0.5rem 0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent);">Slojevi</h5>
                <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" name="layer-type" value="roadwork" checked> 
                        <span>🚧 Radovi & Alerti</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" name="layer-type" value="weather" checked> 
                        <span>☀️ Vrijeme</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" name="layer-type" value="counters" checked> 
                        <span>🚗 Brojači prometa</span>
                    </label>
                </div>
                
                <h5 style="margin: 0 0 0.5rem 0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent); border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.5rem;">Područje</h5>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="radio" name="region-scope" value="local"> 
                        <span>🏝️ Lokalno (Otok)</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="radio" name="region-scope" value="regional" checked> 
                        <span>📍 Regija (75km)</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="radio" name="region-scope" value="full"> 
                        <span>🇭🇷 Obala & RH</span>
                    </label>
                </div>
            `

      // Prevent map clicks
      L.DomEvent.disableClickPropagation(div)

      // Add Listeners
      div.querySelectorAll('input').forEach((input) => {
        input.addEventListener('change', () => {
          updateMapVisualization()

          // Handle Lazy Loading
          const scope = document.querySelector('input[name="region-scope"]:checked').value
          if (scope === 'full') {
            loadCoastalData()
            loadGlobalData()
          }
        })
      })

      return div
    },
  })

  // Add Control
  new FilterControl({ position: 'topright' }).addTo(state.mapInstance)

  // Ports (from config)
  const misnjak = CONFIG.ferry.misnjakCoords
  const stinica = CONFIG.ferry.stinicaCoords

  // Custom Premium Markers for Ports
  const portIcon = (label) =>
    L.divIcon({
      className: 'custom-port-marker',
      html: `
            <div class="port-marker-pin"></div>
            <div class="port-marker-label">${escapeHtml(label)}</div>
        `,
      iconSize: [120, 40],
      iconAnchor: [10, 10],
    })

  L.marker(misnjak, { icon: portIcon('MIŠNJAK') }).addTo(state.layers.ferry)
  L.marker(stinica, { icon: portIcon('STINICA') }).addTo(state.layers.ferry)

  // Route Line
  L.polyline([misnjak, stinica], {
    color: 'var(--primary)',
    weight: 3,
    opacity: 0.5,
    dashArray: '10, 10',
  }).addTo(state.layers.ferry)

  // Ferry Icon
  const ferryIcon = L.divIcon({
    className: 'ferry-icon-marker',
    html: '<div style="font-size: 24px; filter: drop-shadow(0 0 5px rgba(255,255,255,0.5));">⛴️</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })

  const ferryMarker = L.marker(misnjak, { icon: ferryIcon })
    .bindPopup('<div id="ferry-status" style="min-width: 200px;">Učitavanje AIS podataka...</div>')
    .addTo(state.layers.ferry)

  // Ghost AIS Ferry (Semi-transparent)
  const aisIcon = L.divIcon({
    className: 'ferry-icon-marker ais-ghost',
    html: '<div style="font-size: 24px; opacity: 0.5; filter: grayscale(1);">⛴️</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })

  const aisMarker = L.marker(misnjak, { icon: aisIcon }).addTo(state.layers.ferry)

  // Start Simulation Loop
  startFerrySimulation(ferryMarker, misnjak, stinica, aisMarker)

  // Add Centre/Locate Controls
  addMapControls()

  // Initial Render
  updateMapVisualization()
} // end initMap

function updateMapVisualization() {
  if (!state.mapInstance || !state.layers.markers) return

  const layerGroup = state.layers.markers
  layerGroup.clearLayers()

  // Get Filter States
  const showRoadwork = document.querySelector('input[value="roadwork"]')?.checked ?? true
  const showWeather = document.querySelector('input[value="weather"]')?.checked ?? true
  const showCounters = document.querySelector('input[value="counters"]')?.checked ?? true

  const scope = document.querySelector('input[name="region-scope"]:checked')?.value || 'regional'

  const rabCoords = { lat: 44.76, lng: 14.76 }

  // Helper: Check Distance
  const isWithinScope = (lat, lng, itemDist) => {
    if (!lat || !lng) return false

    // Use pre-calculated distance if available, otherwise calc
    let dist = itemDist
    if (dist === undefined || dist === null) {
      dist = getDistanceFromLatLonInKm(rabCoords.lat, rabCoords.lng, lat, lng)
    }

    if (scope === 'local') return dist <= 20 // 20km strict local
    if (scope === 'regional') return dist <= 75 // 75km regional
    return true // Full
  }

  // 1. RENDER ALERTS (Roadwork / Events)
  if (showRoadwork && state.nptAlerts) {
    // Deduplicate by ID
    const uniqueAlertsMap = new Map()
    state.nptAlerts.forEach((a) => uniqueAlertsMap.set(a.id, a))
    const uniqueAlerts = Array.from(uniqueAlertsMap.values())

    uniqueAlerts.forEach((alert) => {
      if (isWithinScope(alert.lat, alert.lng)) {
        // Create Marker
        const type = getAlertType(alert)
        const icon = L.divIcon({
          className: 'custom-map-marker marker-' + type,
          html: `<div class="marker-pin">${getAlertIcon(type)}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        })

        L.marker([alert.lat, alert.lng], { icon: icon })
          .bindPopup(`<strong>${type.toUpperCase()}</strong><br>${alert.details}`)
          .addTo(layerGroup)
      }
    })
  }

  // 2. RENDER WEATHER
  if (showWeather) {
    // Collect all available weather data
    let rawWeather = [...(state.nptIslandWeather || [])]
    if (state.coastalLoaded && state.coastalWeather) rawWeather.push(...state.coastalWeather)
    if (state.globalLoaded && state.globalWeather) rawWeather.push(...state.globalWeather)

    // Deduplicate by ID
    const uniqueWeatherMap = new Map()
    rawWeather.forEach((w) => uniqueWeatherMap.set(w.id, w))
    const allWeather = Array.from(uniqueWeatherMap.values())

    allWeather.forEach((w) => {
      if (isWithinScope(w.lat, w.lng, w.distanceFromRab)) {
        const temp = w.temp ? `${Math.round(w.temp)}°C` : ''
        const wind = w.windGust ? `💨 ${Math.round(w.windGust)}` : ''

        const html = `<div class="weather-pin">
                    ${temp ? `<span class="pin-temp">${temp}</span>` : ''}
                    ${wind ? `<span class="pin-wind">${wind}</span>` : ''}
                </div>`

        const icon = L.divIcon({
          className: 'custom-weather-marker',
          html: html,
          iconSize: [50, 20],
          iconAnchor: [25, 10],
        })

        L.marker([w.lat, w.lng], { icon: icon, zIndexOffset: -100 }) // Lower z-index
          .bindPopup(
            `<strong>${w.id}</strong><br>Temp: ${w.temp}°C<br>Vjetar: ${w.windSpeed} km/h (Udari ${w.windGust})`
          )
          .addTo(layerGroup)
      }
    })
  }

  // 3. RENDER COUNTERS
  if (showCounters) {
    let rawCounters = [...(state.nptCounters || [])]
    if (state.coastalLoaded && state.coastalCounters) rawCounters.push(...state.coastalCounters)
    if (state.globalLoaded && state.globalCounters) rawCounters.push(...state.globalCounters)

    // Deduplicate by ID
    const uniqueCountersMap = new Map()
    rawCounters.forEach((c) => uniqueCountersMap.set(c.id, c))
    const uniqueCounters = Array.from(uniqueCountersMap.values())

    // Group by location to handle two-way counters
    const groupedByLoc = {}
    uniqueCounters.forEach((c) => {
      if (!isWithinScope(c.lat, c.lng, c.distanceFromRab)) return
      const key = `${parseFloat(c.lat).toFixed(5)},${parseFloat(c.lng).toFixed(5)}`
      if (!groupedByLoc[key]) groupedByLoc[key] = []
      groupedByLoc[key].push(c)
    })

    Object.values(groupedByLoc).forEach((group) => {
      const first = group[0]
      const count = group.length

      // Use logic to show main flow or sum
      let displayFlow = first.flow
      let popupContent = `<strong>${first.name}</strong>`

      if (count > 1) {
        // Multi-direction site
        const totalFlow = group.reduce((sum, c) => sum + (parseInt(c.flow) || 0), 0)
        displayFlow = totalFlow
        popupContent = `<strong>Multi-smjerno brojanje</strong><br>`
        group.forEach((c) => {
          popupContent += `<hr><strong>${c.name}</strong><br>Protok: ${c.flow} voz/h<br>Brzina: ${c.speed} km/h`
        })
      } else {
        popupContent += `<br>Protok: ${first.flow} voz/h<br>Brzina: ${first.speed} km/h`
      }

      const icon = L.divIcon({
        className: 'custom-counter-marker',
        html: `<div class="counter-pin">🚗 ${displayFlow}</div>`,
        iconSize: [60, 20],
        iconAnchor: [30, 10],
      })

      L.marker([first.lat, first.lng], { icon: icon, zIndexOffset: -200 })
        .bindPopup(popupContent)
        .addTo(layerGroup)
    })
  }
}

// Haversine Algo
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371 // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1) // deg2rad below
  var dLon = deg2rad(lon2 - lon1)
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  var d = R * c // Distance in km
  return d
}

function deg2rad(deg) {
  return deg * (Math.PI / 180)
}

// Lazy Load Functions
async function loadCoastalData() {
  if (state.coastalLoaded) return
  state.coastalLoaded = true
  debugLog('Map: Lazy loading coastal data...')

  // Check for local file protocol to avoid CORS errors
  if (window.location.protocol === 'file:') {
    debugLog('Map: Using local JS fallback for Coastal (File Protocol)')
    try {
      await loadScript('data/traffic-coastal.js')
      if (typeof NPT_COASTAL !== 'undefined') {
        state.coastalWeather = NPT_COASTAL.weather
        state.coastalCounters = NPT_COASTAL.counters
        updateMapVisualization()
      }
    } catch (err) {
      debugError('Map: Local fallback failed', err)
    }
    return
  }

  try {
    const response = await fetch(CONFIG.urls.npt.coastalUrl)
    if (response.ok) {
      const data = await response.json()
      state.coastalWeather = data.weather
      state.coastalCounters = data.counters
      updateMapVisualization()
    }
  } catch (e) {
    debugWarn('Map: Fetch failed, trying local Coastal JS fallback...', e)
    try {
      await loadScript('data/traffic-coastal.js')
      if (typeof NPT_COASTAL !== 'undefined') {
        state.coastalWeather = NPT_COASTAL.weather
        state.coastalCounters = NPT_COASTAL.counters
        updateMapVisualization()
      }
    } catch (err) {
      debugError('Map: Fallback failed', err)
    }
  }
}

async function loadGlobalData() {
  if (state.globalLoaded) return
  state.globalLoaded = true
  debugLog('Map: Lazy loading global data...')

  // Check for local file protocol to avoid CORS errors
  if (window.location.protocol === 'file:') {
    debugLog('Map: Using local JS fallback for Global (File Protocol)')
    try {
      await loadScript('data/traffic-global.js')
      if (typeof NPT_GLOBAL !== 'undefined') {
        state.globalWeather = NPT_GLOBAL.weather
        state.globalCounters = NPT_GLOBAL.counters
        updateMapVisualization()
      }
    } catch (err) {
      debugError('Map: Local fallback failed', err)
    }
    return
  }

  try {
    const response = await fetch(CONFIG.urls.npt.globalUrl)
    if (response.ok) {
      const data = await response.json()
      state.globalWeather = data.weather
      state.globalCounters = data.counters
      updateMapVisualization()
    }
  } catch (e) {
    debugWarn('Map: Fetch failed, trying local Global JS fallback...', e)
    try {
      await loadScript('data/traffic-global.js')
      if (typeof NPT_GLOBAL !== 'undefined') {
        state.globalWeather = NPT_GLOBAL.weather
        state.globalCounters = NPT_GLOBAL.counters
        updateMapVisualization()
      }
    } catch (err) {
      debugError('Map: Fallback failed', err)
    }
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

function renderLazyLayer(data, layerGroup) {
  // Deprecated by granular logic above
}

function startFerrySimulation(marker, startPos, endPos, aisMarker = null) {
  // Clear any existing interval to prevent memory leaks
  if (state.ferryInterval) {
    clearInterval(state.ferryInterval)
  }

  const durationMins = CONFIG.ferry.tripDurationMins

  function update() {
    const now = new Date()
    const nowTime = now.getHours() * 60 + now.getMinutes()
    const minutes = now.getMinutes() + now.getSeconds() / 60

    let progress = 0 // 0 = Misnjak, 1 = Stinica
    let statusText = 'Na vezu'
    let isMoving = false

    // --- MANUAL OVERRIDE CHECK ---
    if (state.manualOverrides.ferrySuspended) {
      statusText = 'LINIJA U PREKIDU (Bura)'
      const statusElements = [
        document.getElementById('ferry-status'),
        document.getElementById('ferry-status-v2'),
      ]

      statusElements.forEach((statusEl) => {
        if (statusEl) {
          statusEl.innerHTML = `
                      <div style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                          <div class="pulse-dot" style="background: var(--error)"></div>
                          <div style="font-weight:bold; color: var(--error); font-size: 1.1rem;">
                              ⚠️ LINIJA U PREKIDU
                          </div>
                      </div>
                      <p style="color: var(--text-dim); font-size: 0.9rem;">Zbog nepovoljnih vremenskih uvjeta (bura), trajektna linija Mišnjak-Stinica je privremeno obustavljena.</p>
                  `
        }
      })

      const sidebarFerryRow = document.querySelector('.live-row:nth-child(1) .value')
      if (sidebarFerryRow) {
        sidebarFerryRow.innerHTML = 'U PREKIDU'
        sidebarFerryRow.className = 'value val-red'
      }
      return // Skip position updates
    }

    // Logic:
    // 00 to 15 -> Misnjak to Stinica
    // 30 to 45 -> Stinica to Misnjak

    if (minutes >= 0 && minutes < durationMins) {
      // Outbound (Rab -> Kopno)
      progress = minutes / durationMins
      statusText = `Isplovio iz Mišnjaka (${Math.round(progress * 100)}%)`
      isMoving = true
    } else if (minutes >= 30 && minutes < 30 + durationMins) {
      // Inbound (Kopno -> Rab)
      progress = 1 - (minutes - 30) / durationMins // Reverse direction
      statusText = `Plovidba prema Rabu (${Math.round((1 - progress) * 100)}%)`
      isMoving = true
    } else if (minutes >= durationMins && minutes < 30) {
      // Waiting at Stinica
      progress = 1
      statusText = 'Luka Stinica (Ukrcaj/Iskrcaj)'
    } else {
      // Waiting at Misnjak
      progress = 0
      statusText = 'Luka Mišnjak (Ukrcaj/Iskrcaj)'
    }

    // LERP Position (Scheduled)
    const lat = startPos[0] + (endPos[0] - startPos[0]) * progress
    const lng = startPos[1] + (endPos[1] - startPos[1]) * progress

    marker.setLatLng([lat, lng])

    // --- AIS "GHOST" POSITION ---
    if (aisMarker) {
      const aisOffsetMins = 2 // Mock delay
      const aisTime = new Date(now.getTime() - aisOffsetMins * 60000)
      const aisMinutes = aisTime.getMinutes() + aisTime.getSeconds() / 60
      let aisProgress = 0

      if (aisMinutes >= 0 && aisMinutes < durationMins) {
        aisProgress = aisMinutes / durationMins
      } else if (aisMinutes >= 30 && aisMinutes < 30 + durationMins) {
        aisProgress = 1 - (aisMinutes - 30) / durationMins
      } else if (aisMinutes >= durationMins && aisMinutes < 30) {
        aisProgress = 1
      } else {
        aisProgress = 0
      }

      const aisLat = startPos[0] + (endPos[0] - startPos[0]) * aisProgress
      const aisLng = startPos[1] + (endPos[1] - startPos[1]) * aisProgress
      aisMarker.setLatLng([aisLat, aisLng])
    }

    // Helper to get times
    const getDepartures = () => {
      const schedule = CONFIG.ferry.schedule

      const times = schedule.map((s) => {
        const [h, m] = s.split(':').map(Number)
        return h * 60 + m
      })

      // Find last departure
      let lastIdx = -1
      for (let i = times.length - 1; i >= 0; i--) {
        if (times[i] <= nowTime) {
          lastIdx = i
          break
        }
      }

      const format = (idx) => {
        if (idx < 0) return '--:--'
        if (idx >= schedule.length) return schedule[idx % schedule.length]
        return schedule[idx]
      }

      return {
        last: format(lastIdx),
        next: format(lastIdx + 1),
        after: format(lastIdx + 2),
      }
    }

    const depMisnjak = getDepartures()
    const depStinica = getDepartures()

    // --- AIS "SMART DELAY" LOGIC ---
    // Simulate a slight AIS-detected offset for demo
    const aisOffsetMins = 2 // Mocking that ferry is currently 2 mins behind
    let aisStatusMsg = isMoving ? statusText : 'Na vezu'

    if (aisOffsetMins >= 1 && aisOffsetMins < 5) {
      aisStatusMsg = `Kasni ~${aisOffsetMins} min`
    } else if (aisOffsetMins >= 5) {
      aisStatusMsg = `Moguć prekid linije! (AIS)`
    }

    const statusElements = [
      document.getElementById('ferry-status'),
      document.getElementById('ferry-status-v2'),
    ]

    statusElements.forEach((statusEl) => {
      if (statusEl) {
        statusEl.innerHTML = `
                <div style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <div class="pulse-dot" style="background: ${aisOffsetMins >= 5 ? 'var(--error)' : aisOffsetMins >= 1 ? 'var(--warning)' : 'var(--success)'
          }"></div>
                    <div style="font-weight:bold; color: var(--text-main); font-size: 1rem;">
                        AIS: ${escapeHtml(aisStatusMsg)}
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; font-size: 0.85rem;">
                    <div>
                        <div style="color: var(--primary); font-weight: 700; border-bottom: 1px solid var(--border); margin-bottom: 0.5rem; padding-bottom: 0.2rem;">MIŠNJAK →</div>
                        <div style="opacity: 0.6; text-decoration: line-through;">Zadnji: ${depMisnjak.last}</div>
                        <div style="font-weight: bold; margin: 0.2rem 0; font-size: 1rem;">Sljedeći: ${depMisnjak.next}</div>
                        <div style="opacity: 0.8;">Nakon toga: ${depMisnjak.after}</div>
                    </div>
                    <div>
                        <div style="color: var(--primary); font-weight: 700; border-bottom: 1px solid var(--border); margin-bottom: 0.5rem; padding-bottom: 0.2rem;">STINICA →</div>
                        <div style="opacity: 0.6; text-decoration: line-through;">Zadnji: ${depStinica.last}</div>
                        <div style="font-weight: bold; margin: 0.2rem 0; font-size: 1rem;">Sljedeći: ${depStinica.next}</div>
                        <div style="opacity: 0.8;">Nakon toga: ${depStinica.after}</div>
                    </div>
                </div>
                
                <div style="margin-top: 1rem; font-size: 0.75rem; color: var(--text-muted); font-style: italic;">
                    * AIS podaci uživo s radio antene. Osvježeno: ${now.toLocaleTimeString('hr-HR')}
                </div>
            `
      }
    })

    // --- SIDEBAR SYNC ---
    // Update the sidebar widget if it exists on the page
    const sidebarFerryRow = document.querySelector('.live-row:nth-child(1) .value')
    if (sidebarFerryRow) {
      if (aisOffsetMins >= 1) {
        sidebarFerryRow.innerHTML = `Kasni ~${aisOffsetMins} min`
        sidebarFerryRow.className = 'value val-yellow'
      } else {
        sidebarFerryRow.innerHTML = `Sljedeći: <span style="color: #fff">${depStinica.next}</span>`
        sidebarFerryRow.className = 'value val-green'
      }
    }

    const sidebarLoparRow = document.querySelector('.live-row:nth-child(2) .value')
    if (sidebarLoparRow) {
      // Lopar schedule is less frequent
      const loparNext =
        ['06:00', '09:45', '13:30', '17:15', '21:00'].find((t) => {
          const [h, m] = t.split(':').map(Number)
          return h * 60 + m > nowTime
        }) || '06:00'
      sidebarLoparRow.innerHTML = `Sljedeći: <span style="color: #fff">${loparNext}</span>`
    }

    // --- D8 (MAGISTRALA) SYNC ---
    const d8StatusEl = document.getElementById('d8-status')
    if (d8StatusEl) {
      if (state.manualOverrides.d8Restricted) {
        d8StatusEl.innerHTML = `⚠️ Zatvoreno za I. skupinu`
        d8StatusEl.className = 'value val-yellow'
      } else if (aisOffsetMins >= 5) {
        d8StatusEl.innerHTML = `⚠️ Zatvoreno za I. skupinu`
        d8StatusEl.className = 'value val-yellow'
      } else {
        d8StatusEl.innerHTML = `Otvoreno za sve`
        d8StatusEl.className = 'value val-green'
      }
    }
  }

  state.ferryInterval = setInterval(update, 1000)
  update() // First run
}

function stopFerrySimulation() {
  if (state.ferryInterval) {
    clearInterval(state.ferryInterval)
    state.ferryInterval = null
  }
}
function initInfiniteScroll() {
  const grid = document.getElementById('news-grid')
  if (!grid) return

  // Create sentinel element
  const sentinel = document.createElement('div')
  sentinel.id = 'scroll-sentinel'
  sentinel.innerHTML = '<div class="loader"></div>'
  grid.parentNode.appendChild(sentinel)

  // Intersection Observer for infinite scroll
  state.observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !state.isLoading) {
          const filteredArticles = getFilteredArticles()
          if (state.currentVisibleCount < filteredArticles.length) {
            loadMoreArticles()
          }
        }
      })
    },
    { rootMargin: `${CONFIG.scrollThreshold}px` }
  )

  state.observer.observe(sentinel)
}

function hideLoader() {
  const sentinel = document.getElementById('scroll-sentinel')
  if (sentinel) {
    sentinel.style.display = 'none'
  }
}

function showLoader() {
  const sentinel = document.getElementById('scroll-sentinel')
  if (sentinel) {
    sentinel.style.display = 'flex'
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
  const openBtn = document.getElementById('reporter-btn')
  const closeBtn = modal?.querySelector('.modal-close')

  if (!modal) return

  openBtn?.addEventListener('click', () => openModal(modal))
  closeBtn?.addEventListener('click', () => closeModal(modal))

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal(modal)
    }
  })

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) {
      closeModal(modal)
    }
  })

  // Form Submission (Demo)
  const form = modal.querySelector('form')
  form?.addEventListener('submit', (e) => {
    e.preventDefault()
    const btn = form.querySelector('.submit-btn')
    const originalText = btn.textContent

    // Loading state
    btn.textContent = 'Šaljem...'
    btn.disabled = true

    setTimeout(() => {
      // Success state
      btn.textContent = 'Hvala! Poslano.'
      btn.style.background = 'var(--success)'

      setTimeout(() => {
        closeModal(modal)
        form.reset()
        // Reset button after close
        setTimeout(() => {
          btn.textContent = originalText
          btn.disabled = false
          btn.style.background = ''
        }, 300)
      }, 1000)
    }, 1500)
  })
}

function openModal(modal) {
  modal.hidden = false
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
    linkBox.innerHTML = `⚠️ Blokiran HTTPS od strane preglednika.<br><a href="${CONFIG.urls.radioStreamDirect}" target="_blank" style="color: var(--primary); text-decoration: underline;">Kliknite ovdje za slušanje u novom TAB-u</a>`
    container.appendChild(linkBox)
  }

  async function fetchMetadata() {
    const proxyBase = CONFIG.urls.corsProxy
    const timestamp = Date.now()
    let nextDelay = 15000 // Default fallback

    debugLog('Radio: Fetching metadata...')

    try {
      // Fetch all three in parallel for faster initial load
      const [expireTime] = await Promise.all([
        fetchCurrentSong(proxyBase, timestamp),
        fetchHistory(proxyBase, timestamp),
        fetchNext(proxyBase, timestamp),
      ])

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
    const response = await fetch(
      proxyBase + encodeURIComponent(`${CONFIG.urls.metadataBase}/NowOnAir.xml?t=${timestamp}`)
    )
    if (!response.ok) return null
    const str = await response.text()
    const xmlDoc = new DOMParser().parseFromString(str, 'text/xml')

    // Target the active event - Song is child of Event, Artist/Expire are children of Song
    const event = xmlDoc.querySelector('Event[status="happening"]')
    const songEl = event?.querySelector('Song')
    const artist = songEl?.querySelector('Artist')?.getAttribute('name')
    const songTitle = songEl?.getAttribute('title')
    const expireTime = songEl?.querySelector('Expire')?.getAttribute('Time')

    if (artist && songTitle) {
      updateSongTitle(`${artist} - ${songTitle}`)
      const nowPlayingLabel = document.querySelector('.now-playing')
      if (nowPlayingLabel) {
        // Visual feedback for live status
        nowPlayingLabel.textContent = '🎵 UŽIVO'
        nowPlayingLabel.style.color = 'var(--primary)'
        nowPlayingLabel.style.fontWeight = 'bold'
      }
    }

    return expireTime
  }

  async function fetchHistory(proxyBase, timestamp) {
    const response = await fetch(
      proxyBase +
      encodeURIComponent(`${CONFIG.urls.metadataBase}/AirPlayHistory.xml?t=${timestamp}`)
    )
    if (!response.ok) return
    const str = await response.text()
    const xmlDoc = new DOMParser().parseFromString(str, 'text/xml')

    // Items are in chronological order, so we take the last few for "most recent"
    // But typically history file has oldest at top? Let's check structure.
    // Based on typical log: appending. So last items are newest?
    // Let's take the last 5 items and reverse them so newest is at top.
    const allSongs = Array.from(xmlDoc.querySelectorAll('Song'))
    const songs = allSongs.slice(-5).reverse()

    const listContainer = document.getElementById('playlist-items')
    const mainContainer = document.getElementById('playlist-container')

    if (songs.length > 0 && listContainer) {
      mainContainer.hidden = false
      listContainer.innerHTML = ''

      songs.forEach((song) => {
        const title = song.getAttribute('title')
        const artist = song.querySelector('Artist')?.getAttribute('name')
        const info = song.querySelector('Info')
        const startTime = info?.getAttribute('StartTime')?.substring(0, 5) || '' // HH:MM

        if (title && artist) {
          const item = document.createElement('div')
          item.className = 'playlist-item'
          item.innerHTML = `
                        <span class="playlist-time">${startTime}</span>
                        <div class="playlist-meta">
                            <span class="playlist-artist">${escapeHtml(artist)}</span>
                            <span class="playlist-song">${escapeHtml(title)}</span>
                        </div>
                    `
          listContainer.appendChild(item)
        }
      })
    }
  }

  async function fetchNext(proxyBase, timestamp) {
    const response = await fetch(
      proxyBase + encodeURIComponent(`${CONFIG.urls.metadataBase}/AirPlayNext.xml?t=${timestamp}`)
    )
    if (!response.ok) return
    const str = await response.text()
    const xmlDoc = new DOMParser().parseFromString(str, 'text/xml')

    const nextSong = xmlDoc.querySelector('Event[status="coming up"] Song')

    if (nextSong) {
      const title = nextSong.getAttribute('title')
      const artist = nextSong.querySelector('Artist')?.getAttribute('name')
      const container = document.getElementById('next-up-container')

      if (title && artist && container) {
        container.hidden = false
        document.getElementById('next-artist').textContent = artist
        document.getElementById('next-song').textContent = title
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
function escapeHtml(text) {
  if (!text) return ''

  // First decode any existing entities (e.g. &amp; -> &)
  const textarea = document.createElement('textarea')
  textarea.innerHTML = text
  const decoded = textarea.value

  // Then re-escape critical characters for display
  const div = document.createElement('div')
  div.textContent = decoded
  return div.innerHTML
}

// ===========================================
// READER MODE & SHARING
// ===========================================
function toggleReaderMode() {
  document.body.classList.toggle('reader-mode-active')

  // Smooth scroll to top of article if we just entered reader mode
  if (document.body.classList.contains('reader-mode-active')) {
    const article = document.querySelector('.main-feature')
    if (article) article.scrollIntoView({ behavior: 'smooth' })
  }
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
 * Updates the Leaflet map with NPT data
 */
function updateMapWithNPT(alerts, weather, counters, islandWeather) {
  if (!state.mapInstance || !state.layers) return

  // Clear previous markers
  state.layers.traffic.clearLayers()
  state.layers.weather.clearLayers()
  state.layers.islandWeather.clearLayers()
  state.layers.counters.clearLayers()

  // --- PLOT ALERTS ---
  alerts.forEach((alert) => {
    if (!alert.lat || !alert.lng) return

    const type = getAlertType(alert)
    let color = '#3b82f6' // Default Blue
    let iconChar = '⚠️'

    if (type === 'accident') {
      color = '#ef4444'
      iconChar = '💥'
    } else if (type === 'roadworks') {
      color = '#f97316'
      iconChar = '🚧'
    } else if (type === 'wind') {
      color = '#06b6d4'
      iconChar = '💨'
    } else if (type === 'closure') {
      color = '#dc2626'
      iconChar = '⛔'
    } else if (type === 'info') {
      color = '#3b82f6'
      iconChar = 'ℹ️'
    }

    // Type Translations
    const typeTranslations = {
      accident: 'PROMETNA NESREĆA',
      roadworks: 'RADOVI NA CESTI',
      roadwork: 'RADOVI NA CESTI',
      maintenance: 'ODRŽAVANJE',
      hazard: 'OPASNOST NA CESTI',
      wind: 'JAK VJETAR',
      fog: 'MAGLA',
      closure: 'ZATVORENA CESTA',
      info: 'INFORMACIJA',
      congestion: 'GUŽVA',
      other: 'OBAVIJEST',
    }

    const displayType = typeTranslations[type] || type.toUpperCase()

    const markerIcon = L.divIcon({
      className: 'custom-map-icon',
      html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); font-size: 14px;">${iconChar}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    })

    // Add to map
    L.marker([alert.lat, alert.lng], { icon: markerIcon })
      .bindPopup(
        `
                <div style="min-width: 250px; font-family: var(--font-main); color: #f1f5f9;">
                    <h4 style="margin: 0 0 5px 0; color: ${color}; font-size: 1rem;">${iconChar} ${displayType}</h4>
                    <div style="font-weight: bold; margin-bottom: 5px; color: #f8fafc; font-size: 1rem;">${escapeHtml(
          alert.road
        )}</div>
                    <div style="font-size: 0.9em; line-height: 1.4; color: #e2e8f0; white-space: pre-wrap;">${escapeHtml(
          alert.details
        )}</div>
                    
                    ${alert.validFrom
          ? `
                        <div style="font-size: 0.85em; color: #cbd5e1; margin-top: 8px; border-top: 1px solid #334155; padding-top: 5px;">
                            📅 <strong>Trajanje:</strong><br>
                            ${new Date(alert.validFrom).toLocaleDateString('hr-HR')} - ${new Date(
            alert.validUntil
          ).toLocaleDateString('hr-HR')}
                        </div>
                    `
          : ''
        }

                    <div style="font-size: 0.8em; color: #94a3b8; margin-top: 5px;">
                        Ažurirano: ${alert.timestamp
          ? new Date(alert.timestamp).toLocaleTimeString('hr-HR', {
            hour: '2-digit',
            minute: '2-digit',
          })
          : ''
        }
                    </div>
                </div>
            `
      )
      .addTo(state.layers.traffic)
  })

  // --- PLOT WEATHER STATIONS (High Wind Only, excludes island stations) ---
  // Build set of island station IDs to avoid duplicates
  const islandStationIds = new Set((islandWeather || []).map((s) => s.id))

  if (weather) {
    weather.forEach((station) => {
      if (!station.lat || !station.lng) return

      const windGust = parseFloat(station.windGust) || 0

      // Only show high wind (>70 km/h) and skip stations already in island layer
      if (windGust <= 70) return
      if (islandStationIds.has(station.id)) return

      const lat = parseFloat(station.lat)
      const lng = parseFloat(station.lng)

      const windText = `${Math.round(windGust)}`
      const tempText = station.temp ? `${Math.round(parseFloat(station.temp))}°` : ''
      const isDanger = windGust > 80

      // Orange for strong wind, Red for dangerous
      const bgColor = isDanger ? '#dc2626' : '#f97316'

      const stationIcon = L.divIcon({
        className: 'weather-station-icon',
        html: `
                    <div style="background-color: ${bgColor}; padding: 2px 6px; border-radius: 12px; color: white; font-weight: bold; font-size: 10px; border: 1px solid white; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: flex; gap: 3px; align-items: center; opacity: 0.9;">
                        ${windText ? `<span>💨 ${windText}</span>` : ''}
                        ${tempText ? `<span>🌡️ ${tempText}</span>` : ''}
                    </div>
                `,
        iconSize: [50, 20],
        iconAnchor: [25, 10],
      })

      L.marker([lat, lng], { icon: stationIcon, zIndexOffset: -1000 }) // Put WAY behind traffic
        .bindPopup(
          `
                    <div style="text-align: center; color: #f1f5f9; min-width: 150px;">
                        <strong style="color: #60a5fa;">${CONFIG.stationNames[station.id] || station.id
          }</strong><br>
                        <div style="font-size: 1.2rem; margin: 5px 0; font-weight: bold;">${station.temp ? Math.round(parseFloat(station.temp)) + '°C' : '--'
          }</div>
                        Vjetar: <strong>${station.windSpeed || 0} km/h</strong><br>
                        Udari: <strong style="color: ${windGust > 80 ? '#f87171' : '#f1f5f9'
          }">${Math.round(windGust)} km/h</strong><br>
                        Smjer: ${getWindArrow(station.windDir)} (${station.windDir || '--'}°)<br>
                        ${station.roadTemp
            ? `<span style="color: ${parseFloat(station.roadTemp) < 0 ? '#f87171' : '#94a3b8'
            }">Cesta: ${station.roadTemp}°C</span>`
            : ''
          }
                    </div>
                `
        )
        .addTo(state.layers.weather)
    })
  }

  // --- PLOT TRAFFIC COUNTERS ---
  if (counters) {
    counters.forEach((counter) => {
      if (!counter.lat || !counter.lng) return

      // Optional filtering: Only show if relevant area?
      // For now, show all but style them discreetly.

      // Style based on speed or flow
      const speed = counter.speed ? parseInt(counter.speed) : 0
      const flow = counter.flow ? parseInt(counter.flow) : 0
      const hasData = speed > 0 || flow > 0

      let color = '#64748b' // Gray for no data
      if (hasData) {
        color = '#818cf8' // Default Indigo
        if (speed > 80) color = '#22c55e' // Green (Fast)
        else if (speed > 0 && speed < 40) color = '#f97316' // Orange (Slow)
        if (speed === 0 && flow > 1000) color = '#ef4444' // Red (Jam?)
      }

      const counterIcon = L.divIcon({
        className: 'counter-icon',
        html: `<div style="width: 12px; height: 12px; background-color: ${color}; border-radius: 50%; border: 1px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      })

      L.marker([counter.lat, counter.lng], { icon: counterIcon, zIndexOffset: -2000 }) // Behind everything
        .bindPopup(
          `
                    <div style="text-align: center; color: #f1f5f9; font-size: 0.9rem; min-width: 150px;">
                        <strong style="color: #a78bfa;">📡 ${escapeHtml(counter.name)}</strong><br>
                        ${hasData
            ? `
                            Brzina: <strong style="color: ${color}; font-size: 1.1em;">${speed} km/h</strong><br>
                            Promet: <strong>${flow} voz/h</strong>
                        `
            : `<span style="color: #94a3b8; font-style: italic;">Nema podataka</span>`
          }
                    </div>
                `
        )
        .addTo(state.layers.counters)
    })
  }

  // --- PLOT ISLAND WEATHER (Rab region, pre-filtered by backend) ---
  if (islandWeather) {
    islandWeather.forEach((station) => {
      if (!station.lat || !station.lng) return

      const lat = parseFloat(station.lat)
      const lng = parseFloat(station.lng)
      const windGust = parseFloat(station.windGust) || 0
      const windSpeed = parseFloat(station.windSpeed) || 0
      const temp = station.temp != null ? parseFloat(station.temp) : null
      const distance = station.distanceFromRab || 0

      // Color coding based on conditions
      let bgColor = '#0ea5e9' // Sky blue (normal)
      if (windGust > 80) bgColor = '#dc2626' // Red (dangerous)
      else if (windGust > 50) bgColor = '#f97316' // Orange (strong wind)
      else if (windGust > 30) bgColor = '#eab308' // Yellow (moderate wind)

      // Create a more prominent marker for island weather
      const islandIcon = L.divIcon({
        className: 'island-weather-icon',
        html: `
                    <div style="
                        background: linear-gradient(135deg, ${bgColor}, ${bgColor}dd);
                        padding: 4px 8px;
                        border-radius: 8px;
                        color: white;
                        font-weight: bold;
                        font-size: 11px;
                        border: 2px solid white;
                        white-space: nowrap;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        display: flex;
                        gap: 6px;
                        align-items: center;
                    ">
                        ${temp != null ? `<span>🌡️${Math.round(temp)}°</span>` : ''}
                        ${windGust > 0 ? `<span>💨${Math.round(windGust)}</span>` : ''}
                    </div>
                `,
        iconSize: [80, 28],
        iconAnchor: [40, 14],
      })

      L.marker([lat, lng], { icon: islandIcon })
        .bindPopup(
          `
                    <div style="text-align: center; color: #f1f5f9; min-width: 180px;">
                        <strong style="color: #0ea5e9; font-size: 1.1rem;">🏝️ ${CONFIG.stationNames[station.id] || station.id
          }</strong>
                         ${distance < 5
            ? '<span style="color:#fbbf24; font-size:0.8em"> (Lokalno)</span>'
            : ''
          }<br>

                         <div style="display:flex; justify-content:center; align-items:center; gap: 10px; margin: 10px 0;">
                            <div style="text-align:center;">
                                <div style="font-size: 1.4rem; font-weight: bold;">${Math.round(
            windGust
          )}</div>
                                <div style="font-size: 0.7rem; color: #94a3b8;">UDARI km/h</div>
                            </div>
                            ${temp !== null
            ? `
                            <div style="text-align:center; border-left: 1px solid #475569; padding-left: 10px;">
                                <div style="font-size: 1.4rem; font-weight: bold;">${Math.round(
              temp
            )}°</div>
                                <div style="font-size: 0.7rem; color: #94a3b8;">ZRAK</div>
                            </div>`
            : ''
          }
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.9rem; text-align: left; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px;">
                            <div>💨 Vjetar:</div>
                            <div style="text-align: right;"><strong>${Math.round(
            windSpeed
          )} km/h</strong></div>
                            <div>🌬️ Udari:</div>
                            <div style="text-align: right; color: ${windGust > 80 ? '#f87171' : windGust > 50 ? '#fbbf24' : '#f1f5f9'
          };">
                                <strong>${Math.round(windGust)} km/h</strong>
                            </div>
                            <div>🧭 Smjer:</div>
                            <div style="text-align: right;">${getWindArrow(station.windDir)} ${station.windDir || '--'
          }°</div>
                            ${station.humidity != null
            ? `
                                <div>💧 Vlaga:</div>
                                <div style="text-align: right;">${station.humidity}%</div>
                            `
            : ''
          }
                            ${station.roadTemp
            ? `
                                <div>🛣️ Cesta:</div>
                                <div style="text-align: right; color: ${parseFloat(station.roadTemp) < 0 ? '#ef4444' : '#f1f5f9'
            };">${station.roadTemp}°C ${parseFloat(station.roadTemp) < 0 ? '❄️' : ''
            }</div>
                            `
            : ''
          }
                        </div>
                    </div>
                `
        )
        .addTo(state.layers.islandWeather)
    })
  }
}

function getWindArrow(azimuth) {
  if (azimuth === null || azimuth === undefined) return '•'
  const val = parseInt(azimuth)
  if (isNaN(val)) return '•'
  return `<span style="display:inline-block; transform: rotate(${val + 180
    }deg); font-weight:bold;">↑</span>`
}

/**
 * Custom Map Controls (Home / Locate)
 */
function addMapControls() {
  if (!state.mapInstance) return

  // Center on Rab Button
  const HomeControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function () {
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control custom-map-btn')
      container.innerHTML = '<a href="#" title="Centriraj na otok Rab" role="button">🏠</a>'
      container.style.backgroundColor = 'rgba(15, 23, 42, 0.9)'
      container.style.border = '1px solid var(--border)'
      container.style.borderRadius = '8px'
      container.style.marginTop = '10px'

      container.onclick = (e) => {
        e.preventDefault()
        state.mapInstance.setView([44.7554, 14.761], 12)
      }
      return container
    },
  })

  // Locate Me Button
  const LocateControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function () {
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control custom-map-btn')
      container.innerHTML = '<a href="#" title="Moja lokacija" role="button">📍</a>'
      container.style.backgroundColor = 'rgba(15, 23, 42, 0.9)'
      container.style.border = '1px solid var(--border)'
      container.style.borderRadius = '8px'

      container.onclick = (e) => {
        e.preventDefault()
        state.mapInstance.locate({ setView: true, maxZoom: 15 })
      }
      return container
    },
  })

  if (!state.mapInstance.homeControlAdded) {
    new HomeControl().addTo(state.mapInstance)
    new LocateControl().addTo(state.mapInstance)
    state.mapInstance.homeControlAdded = true
  }
}
