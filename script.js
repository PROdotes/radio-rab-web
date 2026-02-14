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
  // Initialize AIS Tracking (Snapshot Strategy)
  // Default to true (Snapshot Strategy always active if data exists)
  const hasAisConfig = true

  if (hasAisConfig) {
    console.log('🚢 Initializing AIS Tracking (Snapshot Mode)...')

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
  } else {
    console.info('🚢 AIS Disabled or Simulated.')
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
