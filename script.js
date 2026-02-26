/**
 * Radio Rab News Portal — Entry Point
 * Main Application Orchestrator
 */
/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
/* global lucide, initNewsFeed, initNavigation, initHamburger, initModal, initNewsReaderModal, 
   initStickyOffsets, initFilterScrollHints, syncFilterHintPositions, initRadioPlayer, 
   initDateDisplay, initScrollEffects, initMarketplace, initVideos, initNPT, 
   initMeteoAlerts, initSeaTemperature, initSeaQuality, initSeaQualityModal, initAdminPortal, 
   initBackToTop, initLazyImages */

// CONFIG, debug functions, state, and utilities are in separate modules (config.js, utils.js)
// Feature modules: npt.js, map.js, ui.js, weather.js, ais.js, news.js, admin.js

let mapLoaded = false

document.addEventListener('DOMContentLoaded', init)

/**
 * Main Initialization function
 */
function init() {
  // Initialize AIS Tracking (Snapshot Strategy)
  debugLog('Initializing AIS Tracking (Snapshot Mode)...')

  const updateFerryUI = () => {
    const aisData = state.aisData
    const cimisData = state.cimisData

    // 1. Update Sidebar Widget (#sidebar-ferry-status) - Narrative Mode
    const sidebar = document.getElementById('sidebar-ferry-status')
    if (sidebar) {
      let html = ''

      const keyFerries = [
        { name: 'BARBAT', route: 'Stinica–Mišnjak', mmsi: '238838340' },
        { name: 'ČETIRI ZVONIKA', route: 'Stinica–Mišnjak', mmsi: '238805940' },
        { name: 'SVETI MARIN', route: 'Stinica–Mišnjak', mmsi: '238054940' },
        { name: 'ILOVIK', route: 'Valbiska–Lopar', mmsi: '238030540' },
        { name: 'KRK', route: 'Valbiska–Lopar', mmsi: '238123456' }, // Example MMSI
        { name: 'JELENA', route: 'Katamaran', mmsi: '238000000' }
      ]

      keyFerries.forEach(f => {
        // Find latest CIMIS move for this boat
        const latestMove = cimisData?.visits?.find(v => v['Pomorski objekt'] === f.name)

        if (latestMove) {
          const status = latestMove['Status']
          const port = latestMove['Luka']
          const time = status === 'Otišao' ? latestMove['Odlazak'] : latestMove['Dolazak']
          const shortTime = time ? time.split(' ')[1] : ''

          let narrative = ''
          let timeLabel = `u ${shortTime}`

          if (status === 'Otišao') {
            const dest = (port === 'Stinica') ? 'Mišnjaku' : (port === 'Mišnjak') ? 'Stinici' : (port === 'Valbiska') ? 'Loparu' : (port === 'Lopar') ? 'Valbiski' : 'odredištu'
            narrative = `Isplovio iz ${port}, plovi prema ${dest}`
          } else if (status === 'Došao' || status === 'U dolasku') {
            narrative = `Pristao u luku ${port}`
          }

          // Supplement with AIS if available for THIS specific boat
          if (aisData && aisData.name === f.name) {
            if (aisData.speed > 2) {
              const dest = (aisData.course > 180) ? 'kopnu (Stinica)' : 'otoku (Mišnjak)'
              narrative = `U plovidbi prema ${dest} (${aisData.speed.toFixed(1)} kn)`
            } else {
              narrative = `Trenutno u luci ${aisData.status || 'privezan'}`
            }
          }

          html += `
            <div class="narrative-row">
              <span class="narrative-vessel">${f.name}</span>
              <span class="narrative-status">${narrative}</span>
              <span class="narrative-time">${timeLabel}</span>
            </div>
          `
        }
      })

      // Always keep D8 status
      html += `
        <div class="narrative-row" style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
          <span class="narrative-vessel" style="color: #94a3b8;">Hrvatske Ceste</span>
          <span class="narrative-status" id="d8-status">Magistrala D8: Otvoreno za sve skupine</span>
        </div>
      `

      sidebar.innerHTML = html
    }

    // 2. Update Unified Map Overlay (#unified-ferry-overlay)
    const mapOverlay = document.getElementById('unified-ferry-overlay')
    if (mapOverlay) {
      let mapHtml = ''

      // AIS Part (Live info)
      if (aisData) {
        const ageMinutes = Math.round((new Date() - new Date(aisData.timestamp)) / 60000)
        mapHtml += `
          <div class="map-ais-section" style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <div style="margin-bottom: 0.5rem;">
              <span style="color: var(--accent); font-weight: bold; font-size: 0.9rem;">${aisData.name} (LIVE)</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.8rem;">
              <div>Brzina: <strong>${(aisData.speed || 0).toFixed(1)} kn</strong></div>
              <div>Kurs: <strong>${(aisData.course || 0).toFixed(0)}°</strong></div>
              <div style="grid-column: span 2;">Status: <strong>${aisData.status || 'Plovidba'}</strong></div>
            </div>
            <div style="margin-top: 0.5rem; font-size: 0.7rem; color: var(--text-dim);">
              Ažurirano prije ${ageMinutes} min
            </div>
          </div>
        `
      }

      // CIMIS Part (History)
      if (cimisData && cimisData.visits) {
        const visits = cimisData.visits.slice(0, 3)
        mapHtml += `
          <h5 style="font-size: 0.7rem; color: var(--text-dim); margin-bottom: 0.5rem; letter-spacing: 0.05em; text-transform: uppercase;">Zadnji prolazi</h5>
          <div style="display: grid; gap: 0.4rem;">
            ${visits.map(v => `
              <div style="font-size: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                <div style="line-height: 1.2;">
                  <div style="font-weight: 600;">${v['Pomorski objekt']}</div>
                  <div style="font-size: 0.65rem; opacity: 0.6;">${v['Luka']} • ${v['Dolazak'].split(' ')[1]}</div>
                </div>
                <span style="padding: 1px 4px; border-radius: 3px; background: ${v['Status'] === 'Otišao' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)'}; color: ${v['Status'] === 'Otišao' ? '#f87171' : '#4ade80'}; font-size: 0.6rem; font-weight: bold;">
                  ${v['Status']}
                </span>
              </div>
            `).join('')}
          </div>
        `
      }

      mapOverlay.innerHTML = mapHtml || '<p style="font-size:0.75rem; opacity:0.5;">Sinkronizacija...</p>'
    }
  }

  const syncFerryData = async () => {
    try {
      // Fetch AIS
      const aisRes = await fetch('data/ais-snapshot.json?t=' + Date.now())
      if (aisRes.ok) {
        state.aisData = await aisRes.json()
        if (state.ferryMarker && state.aisData.latitude) {
          state.ferryMarker.setLatLng([state.aisData.latitude, state.aisData.longitude])
        }
      }

      // Fetch CIMIS
      const cimisRes = await fetch('data/cimis-visits.json?t=' + Date.now())
      if (cimisRes.ok) {
        state.cimisData = await cimisRes.json()
      }

      updateFerryUI()
    } catch (err) {
      debugLog('Ferry Sync Error:', err)
      updateFerryUI()
    }
  }

  // Initial fetch
  syncFerryData()

  // Poll every 60 seconds
  setInterval(syncFerryData, 60000)

  // Initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons()
  }

  // Initialize components based on page content
  if (document.getElementById('primary-feature-container')) {
    initNewsFeed()
    initLazyImages()
  }

  // UI & Navigation
  initNavigation()
  initHamburger()
  initModal()
  initNewsReaderModal()
  initStickyOffsets()
  initFilterScrollHints()
  syncFilterHintPositions()
  initRadioPlayer()
  initDateDisplay()
  initScrollEffects()
  initBackToTop()

  // Dynamic Content Sections
  initMarketplace()
  initVideos()

  // Map & Data Systems - Lazy load map dependencies
  initMapLazy()
  initNPT()
  initMeteoAlerts()
  initSeaTemperature()
  initSeaQuality()
  initSeaQualityModal()

  // Admin Features
  initAdminPortal()
}

function initMapLazy() {
  const mapEl = document.getElementById('leaflet-map')
  if (!mapEl) return

  const loadMapDeps = () => {
    if (mapLoaded) return
    mapLoaded = true
    debugLog('Lazy loading map dependencies...')

    const loadScript = (src) => {
      return new Promise((resolve) => {
        const script = document.createElement('script')
        script.src = src
        script.onload = resolve
        document.head.appendChild(script)
      })
    }

    const loadStylesheet = (href) => {
      return new Promise((resolve) => {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = href
        link.onload = resolve
        document.head.appendChild(link)
      })
    }

    Promise.all([
      loadStylesheet('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'),
      loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'),
      loadScript('https://unpkg.com/supercluster@7.1.5/dist/supercluster.min.js'),
      loadScript('map.js'),
    ]).then(() => {
      debugLog('Map dependencies loaded, initializing map...')
      // Global L is now available, initMap will auto-run via its polling
      // Force immediate init since leaflet should now be defined
      if (typeof initMap === 'function') {
        initMap()
      }
    })
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadMapDeps()
            observer.disconnect()
          }
        })
      },
      { rootMargin: '200px' }
    )
    observer.observe(mapEl)
  } else {
    // Fallback for older browsers - load immediately
    loadMapDeps()
  }
}
