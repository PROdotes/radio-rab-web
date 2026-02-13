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
  // Initialize AISStream WebSocket if enabled
  if (window.LOCAL_CONFIG && window.LOCAL_CONFIG.ENABLE_REAL_AIS && window.AISStreamClient) {
    const apiKey = window.LOCAL_CONFIG.AISSTREAM_API_KEY
    const mmsi = window.LOCAL_CONFIG.FERRY_MMSI

    if (apiKey && mmsi) {
      console.log('🚢 Initializing AISStream.io real-time tracking...')
      window.aisStreamClient = new window.AISStreamClient(apiKey, mmsi)
      window.aisStreamClient.connect()

      window.aisStreamClient.onData((data) => {
        console.log('✓ Live AIS update received:', data)
      })
    }
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
