/**
 * Radio Rab News Portal — Entry Point
 * Main Application Orchestrator
 */
/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
/* global L, lucide, initNewsFeed, initNavigation, initHamburger, initModal, initNewsReaderModal, 
   initStickyOffsets, initFilterScrollHints, syncFilterHintPositions, initRadioPlayer, 
   initDateDisplay, initScrollEffects, initMarketplace, initVideos, initMap, initNPT, 
   initMeteoAlerts, initSeaTemperature, initSeaQuality, initSeaQualityModal, initAdminPortal, 
   initBackToTop */

// CONFIG, debug functions, state, and utilities are in separate modules (config.js, utils.js)
// Feature modules: npt.js, map.js, ui.js, weather.js, ais.js, news.js, admin.js

document.addEventListener('DOMContentLoaded', init)

/**
 * Main Initialization function
 */
function init() {
  // Initialize AISStream WebSocket or Fallback to Simulation
  const hasAisConfig = window.LOCAL_CONFIG && window.LOCAL_CONFIG.ENABLE_REAL_AIS && window.AISStreamClient;

  if (hasAisConfig) {
    const apiKey = window.LOCAL_CONFIG.AISSTREAM_API_KEY;
    const mmsi = window.LOCAL_CONFIG.FERRY_MMSI;

    if (apiKey && mmsi) {
      console.log('🚢 Initializing AISStream.io real-time tracking (v2.9.1)...');

      // Instantiate the client correctly
      window.aisStreamClient = new window.AISStreamClient(apiKey, mmsi);

      // Set up the data callback BEFORE connecting
      window.aisStreamClient.onData((data) => {
        // console.log('✓ Live AIS update received (masked):', { ...data, mmsi: '***' }); // Debug safely

        // Update ferry marker position on map if available
        if (typeof state !== 'undefined' && state.ferryMarker && data.latitude && data.longitude) {
          state.ferryMarker.setLatLng([data.latitude, data.longitude]);

          // Force update the popup content if it's open
          if (state.ferryMarker.isPopupOpen()) {
            // We can trigger a refresh here if needed, or let the next click handle it
          }
        }

        // Update status display
        const statusEl = document.getElementById('ferry-status-v2');
        if (statusEl) {
          statusEl.innerHTML = `
            <div style="margin-bottom: 0.5rem;">
              <span style="color: var(--accent); font-weight: bold;">${data.name}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.85rem;">
              <div>Brzina: <strong>${(data.speed || 0).toFixed(1)} kn</strong></div>
              <div>Kurs: <strong>${(data.course || 0).toFixed(0)}°</strong></div>
              <div style="grid-column: span 2;">Status: <strong>${data.status || '—'}</strong></div>
              <div style="grid-column: span 2;">Destinacija: <strong>${data.destination || '—'}</strong></div>
            </div>
            <div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-dim); display: flex; align-items: center; gap: 0.5rem;">
              <span class="live-indicator"></span> LIVE (${new Date().toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' })})
            </div>
          `;
        }
      });

      // Connect
      window.aisStreamClient.connect();

    } else {
      console.warn('🚢 AIS configuration missing API Key or MMSI. Falling back to simulation.');
    }
  } else {
    console.info('🚢 Using Simulated AIS data (Real AIS disabled or config missing).');
  }

  // Initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons()
  }

  // Initialize components based on page content
  if (document.getElementById('primary-feature-container')) {
    initNewsFeed()
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

  // Map & Data Systems
  initMap()
  initNPT()
  initMeteoAlerts()
  initSeaTemperature()
  initSeaQuality()
  initSeaQualityModal()

  // Admin Features
  initAdminPortal()
}
