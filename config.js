/**
 * Radio Rab News Portal — Configuration & Utilities
 * Extracted from script.js for better organization
 */
/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
/* global L */

const CONFIG = {
  itemsPerBatch: 9,
  scrollThreshold: 200,
  animationDelay: 80,
  loadDelay: 300,
  debug: false,
  map: {
    enableClustering: true,
    logProximityWarnings: true,
    proximityBlocking: false,
  },
  urls: {
    radioStream: 'https://de4.streamingpulse.com/stream/radiorab',
    radioStreamDirect: 'https://de4.streamingpulse.com/stream/radiorab',
    metadataBase: 'https://radio-rab.hr',
    corsProxy: 'https://corsproxy.io/?url=',
    mapTiles: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    npt: {
      dataUrl: 'data/traffic.json',
      coastalUrl: 'data/traffic-coastal.json',
      globalUrl: 'data/traffic-global.json',
    },
    meteo: {
      today: 'https://meteo.hr/upozorenja/cap_hr_today.xml',
      tomorrow: 'https://meteo.hr/upozorenja/cap_hr_tomorrow.xml',
      dayAfterTomorrow: 'https://meteo.hr/upozorenja/cap_hr_day_after_tomorrow.xml',
      seaTemp: 'https://vrijeme.hr/more_n.xml',
      seaQuality: 'data/sea-quality.json',
    },
  },
  ferry: {
    misnjakCoords: [44.7086, 14.8647],
    stinicaCoords: [44.7214, 14.8911],
    tripDurationMins: 15,
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
    isSuspended: false,
  },
  nptRefreshInterval: 300000,
  stationNames: {
    401: 'Senj',
    400: 'Pag (Most)',
    402: 'Bakar',
    403: 'Krk (Most)',
    404: 'Pula',
    405: 'Rijeka',
  },
}

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

function logProximitySkip(payload) {
  try {
    if (CONFIG.map && CONFIG.map.logProximityWarnings) {
      debugWarn && debugWarn('PROXIMITY-SKIP:', payload)
      debugWarn && debugWarn(new Error('PROXIMITY-SKIP stack').stack)
    }
  } catch (e) {
    /* ignore */
  }
}

function debugError(...args) {
  if (CONFIG.debug) {
    console.error(...args)
  }
}

function debounce(fn, wait) {
  let timeoutId = null
  return function (...args) {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), wait)
  }
}
