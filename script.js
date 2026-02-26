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

    // 1. Update Sidebar Widget (#sidebar-ferry-status) - ROUTE MODE
    const sidebar = document.getElementById('sidebar-ferry-status')
    if (sidebar) {
      let html = ''

      // -- ROUTE 1: Stinica-Mišnjak (Main) --
      const stinicaMisnjakShips = ['BARBAT', 'ČETIRI ZVONIKA', 'SVETI MARIN']
      const latestMainMove = cimisData?.visits?.find(v => {
        const vesselName = v['Pomorski objekt'];
        return vesselName && stinicaMisnjakShips.includes(vesselName.toUpperCase());
      })

      let mainDetail = 'Na vezu'
      let mainClass = 'val-green'

      if (latestMainMove) {
        const status = latestMainMove['Status']
        const port = latestMainMove['Luka']
        const time = (status === 'Otišao' ? latestMainMove['Odlazak'] : latestMainMove['Dolazak'])?.split(' ')[1] || ''

        if (status === 'Otišao') {
          const dest = (port === 'Stinica') ? 'Mišnjak' : 'Stinica'
          mainDetail = `${port} (${time}) ➔ ${dest}`
          mainClass = 'val-blue'
        } else {
          mainDetail = `${port} (${time}) • Privezan`
        }
      }

      // Live speed injection
      if (aisData && aisData.name && stinicaMisnjakShips.includes(aisData.name.toUpperCase()) && aisData.speed > 1) {
        mainDetail = `U plovidbi (${aisData.speed.toFixed(1)} kn)`
        mainClass = 'val-blue'
      }

      html += `
        <div class="live-row">
          <span class="label">Stinica–Mišnjak</span>
          <span class="value ${mainClass}">${mainDetail}</span>
        </div>
      `

      // -- ROUTE 2: Valbiska-Lopar --
      const loparShips = ['ILOVIK', 'KRK']
      const latestLoparMove = cimisData?.visits?.find(v => {
        const vName = v['Pomorski objekt'];
        return vName && loparShips.includes(vName.toUpperCase());
      })

      let loparDetail = 'Nema podataka'
      let loparClass = 'val-dim'

      if (latestLoparMove) {
        const status = latestLoparMove['Status']
        const port = latestLoparMove['Luka']
        const time = (status === 'Otišao' ? latestLoparMove['Odlazak'] : latestLoparMove['Dolazak'])?.split(' ')[1] || ''
        const vessel = latestLoparMove['Pomorski objekt']
        loparDetail = `${vessel}: ${status === 'Otišao' ? 'Isplovio' : 'Pristao'} (${time})`
        loparClass = status === 'Otišao' ? 'val-blue' : 'val-green'
      }

      html += `
        <div class="live-row">
          <span class="label">Valbiska–Lopar</span>
          <span class="value ${loparClass}">${loparDetail}</span>
        </div>
      `

      // -- Magistrala (D8) --
      html += `
        <div class="live-row">
          <span class="label">Magistrala (D8)</span>
          <span class="value val-green" id="d8-status">Otvoreno</span>
        </div>
      `

      sidebar.innerHTML = html
    }

    // 2. Update Unified Map Overlay (#unified-ferry-overlay)
    const mapOverlay = document.getElementById('unified-ferry-overlay')
    if (mapOverlay) {
      let mapHtml = ''

      if (aisData && aisData.name) {
        const ageMinutes = Math.round((new Date() - new Date(aisData.timestamp)) / 60000)
        mapHtml += `
          <div class="map-ais-section" style="margin-bottom: 0.8rem; padding-bottom: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <div style="margin-bottom: 0.4rem; display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--accent); font-weight: 800; font-size: 0.8rem; letter-spacing: 0.05em;">${aisData.name}</span>
              <span style="font-size: 0.65rem; color: ${ageMinutes < 20 ? 'var(--success)' : 'orange'}; font-weight: 700;">
                ${ageMinutes < 1 ? 'LIVE' : ageMinutes + ' min'}
              </span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; font-size: 0.8rem;">
              <div>Brzina: <strong>${(aisData.speed || 0).toFixed(1)} kn</strong></div>
              <div>Kurs: <strong>${(aisData.course || 0).toFixed(0)}°</strong></div>
              <div style="grid-column: span 2;">Status: <strong style="color: #fff;">${aisData.status || 'U plovidbi'}</strong></div>
            </div>
          </div>
        `
      }

      if (cimisData && cimisData.visits) {
        const relevantShips = ['BARBAT', 'ČETIRI ZVONIKA', 'SVETI MARIN', 'ILOVIK', 'KRK']
        const visits = cimisData.visits
          .filter(v => {
            const vName = v['Pomorski objekt'];
            return vName && relevantShips.includes(vName.toUpperCase());
          })
          .slice(0, 3)

        mapHtml += `
          <h5 style="font-size: 0.65rem; color: var(--text-muted); margin-bottom: 0.5rem; letter-spacing: 0.05em; text-transform: uppercase;">Zadnji prolazi</h5>
          <div style="display: grid; gap: 0.4rem;">
            ${visits.map(v => `
              <div style="font-size: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                <div style="line-height: 1.2;">
                  <div style="font-weight: 600; color: #fff;">${v['Pomorski objekt']}</div>
                  <div style="font-size: 0.65rem; color: var(--text-muted);">${v['Luka']} • ${v['Dolazak'].split(' ')[1]}</div>
                </div>
                <span style="font-size: 0.65rem; font-weight: 800; color: ${v['Status'] === 'Otišao' ? 'var(--warning)' : 'var(--success)'};">
                  ${v['Status'].toUpperCase()}
                </span>
              </div>
            `).join('')}
          </div>
        `
      }

      mapOverlay.innerHTML = mapHtml || '<p style="font-size:0.75rem; opacity:0.5;">Učitavanje...</p>'
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
