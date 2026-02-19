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

  const updateFerryFromSnapshot = async () => {
    try {
      const response = await fetch('data/ais-snapshot.json?t=' + Date.now()) // Bust cache
      if (!response.ok) throw new Error('No snapshot data')

      const data = await response.json()
      const lastUpdate = new Date(data.timestamp)
      const now = new Date()
      const ageMinutes = Math.round((now - lastUpdate) / 60000)

      // Update ferry marker position
      if (typeof state !== 'undefined' && state.ferryMarker && data.latitude && data.longitude) {
        state.ferryMarker.setLatLng([data.latitude, data.longitude])
      }

      // Update status display
      const statusEl = document.getElementById('ferry-status-v2')
      if (statusEl) {
        statusEl.innerHTML = `
            <div style="margin-bottom: 0.5rem;">
              <span style="color: var(--accent); font-weight: bold;">${data.name}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.85rem;">
              <div>Brzina: <strong>${(data.speed || 0).toFixed(1)} kn</strong></div>
              <div>Kurs: <strong>${(data.course || 0).toFixed(0)}°</strong></div>
              <div style="grid-column: span 2;">Status: <strong>${
                data.status || 'Active'
              }</strong></div>
            </div>
            <div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-dim); display: flex; align-items: center; gap: 0.5rem;">
              <span class="live-indicator" style="background-color: ${
                ageMinutes < 20 ? 'var(--accent)' : 'orange'
              }"></span> 
              ${ageMinutes < 1 ? 'UPRAVO SADA' : `PRIJE ${ageMinutes} MIN`}
            </div>
          `
      }
    } catch (err) {
      // Silent fail - likely just no snapshot yet or network blink
    }
  }

  // Initial fetch
  updateFerryFromSnapshot()

  // Poll every 60 seconds
  setInterval(updateFerryFromSnapshot, 60000)

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
