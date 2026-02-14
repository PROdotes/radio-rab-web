/**
 * Radio Rab News Portal — Utility Functions
 * Extracted from script.js
 */
/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
/* global L */

// Expose state globally so other modules can access it
window.state = {
  currentVisibleCount: 0,
  activeCategory: 'all',
  isLoading: false,
  observer: null,
  mapInstance: null,
  ferryInterval: null,
  metadataTimeout: null,
  nptRefreshInterval: null,
  nptAlerts: [],
  manualOverrides: {
    ferrySuspended: false,
    d8Restricted: false,
  },
  nptIslandCameras: [],
  coastalCameras: [],
  globalCameras: [],
  meteoAlerts: [],
  seaTemp: null,
  seaQualityPoints: [],
  allArticles: [],
  tickerBaseline: null,
  clusterMarkers: new Map(),
  _iconCache: new Map(),
  spiderfiedClusters: new Map(),
  // Weather module state
  nptWeather: null,
  nptIslandWeather: null,
  nptCounters: null,
  nptUpdatedAt: null,
  coastalLoaded: false,
}

// Alias for convenience in this file
const state = window.state

function pixelsToLatLng(map, pixels) {
  try {
    if (!map) return 0.005
    const center = map.getCenter()
    const pointC = map.latLngToLayerPoint(center)
    const pointX = L.point(pointC.x + pixels, pointC.y)
    const latlngX = map.layerPointToLatLng(pointX)
    return Math.abs(latlngX.lng - center.lng)
  } catch (e) {
    return 0.005
  }
}

function safeTryRemoveLayer(layer) {
  if (!layer) return
  if (layer._doNotRemove) {
    if (typeof layer._originalRemove === 'function') {
      try {
        layer._forceRemove = true
        layer._originalRemove()
        layer._forceRemove = false
        return
      } catch (err) {
        layer._forceRemove = false
        debugWarn && debugWarn('safeTryRemoveLayer: failed to force-remove', layer._leaflet_id, err)
        return
      }
    }
    debugWarn && debugWarn('safeTryRemoveLayer: protected, skipping', layer._leaflet_id)
    return
  }

  try {
    layer.remove()
  } catch (e) {
    debugWarn && debugWarn('safeTryRemoveLayer: remove() failed', e)
  }
}

function isNearFerryLatLng(lat, lng, eps = 0.0006) {
  try {
    if (CONFIG.map && CONFIG.map.proximityBlocking === false) return false
    const ferry = CONFIG.ferry.misnjakCoords
    if (!ferry) return false
    return Math.max(Math.abs(lat - ferry[0]), Math.abs(lng - ferry[1])) <= eps
  } catch (e) {
    return false
  }
}

function createMarkerSafe(lat, lng, opts = {}) {
  try {
    let _lat = Number(lat)
    let _lng = Number(lng)
    if (!isFinite(_lat) || !isFinite(_lng)) return null

    if (
      isNearFerryLatLng(_lat, _lng) &&
      !(opts && (opts.pane === 'ferryPane' || opts._isFerry === true))
    ) {
      debugWarn &&
        debugWarn('createMarkerSafe: blocked marker near ferry', { lat: _lat, lng: _lng, opts })
      return null
    }

    return L.marker([_lat, _lng], opts)
  } catch (e) {
    debugWarn && debugWarn('createMarkerSafe: failed', e)
    try {
      return L.marker([lat, lng], opts)
    } catch (err) {
      return null
    }
  }
}

function enforceFerryIntegrity(eps = 0.001) {
  try {
    if (!state.mapInstance || !state.layers || !state.layers.ferry) return
    const ferryLatLng =
      state.ferryMarker &&
      (state.ferryMarker._latlng || (state.ferryMarker.getLatLng && state.ferryMarker.getLatLng()))
    if (!ferryLatLng) return

    const candidates = []
    if (state.clusterLayer) {
      try {
        candidates.push(...state.clusterLayer.getLayers())
      } catch (e) {}
    }
    if (state.layers && state.layers.markers) {
      try {
        candidates.push(...state.layers.markers.getLayers())
      } catch (e) {}
    }

    try {
      state.mapInstance.eachLayer((lay) => {
        if (lay && lay._isFerry) {
          const inFerryLayer =
            state.layers &&
            state.layers.ferry &&
            state.layers.ferry.hasLayer &&
            state.layers.ferry.hasLayer(lay)
          if (!inFerryLayer) {
            debugLog &&
              debugLog(
                'enforceFerryIntegrity: removing ferry-flagged marker from wrong layer',
                lay._leaflet_id
              )
            safeTryRemoveLayer(lay)
          }
        }
      })
    } catch (e) {
      /* ignore */
    }

    candidates.forEach((cand) => {
      if (!cand) return
      if (cand === state.ferryMarker) return
      if (cand._isFerry) {
        debugLog && debugLog('enforceFerryIntegrity: removing flagged candidate', cand._leaflet_id)
        safeTryRemoveLayer(cand)
        return
      }
      const latlng = cand._latlng || (cand.getLatLng && cand.getLatLng && cand.getLatLng())
      if (!latlng) return
      if (
        Math.max(Math.abs(latlng.lat - ferryLatLng.lat), Math.abs(latlng.lng - ferryLatLng.lng)) <=
        eps
      ) {
        debugLog &&
          debugLog('enforceFerryIntegrity: removing proximate duplicate', cand._leaflet_id)
        safeTryRemoveLayer(cand)
      }
    })
  } catch (e) {
    debugWarn && debugWarn('enforceFerryIntegrity: failed', e)
  }
}

function clearSpiderfiedClusters() {
  try {
    if (!state.spiderfiedClusters || state.spiderfiedClusters.size === 0) return
    state.spiderfiedClusters.forEach((entry, cid) => {
      try {
        if (!entry) return
        if (entry.markers && Array.isArray(entry.markers)) {
          entry.markers.forEach((m) => {
            try {
              if (m && m._map) m.remove()
            } catch (e) {}
          })
        }
        if (entry.clusterMarker) {
          try {
            entry.clusterMarker.addTo(state.clusterLayer)
          } catch (e) {}
        }
      } catch (e) {}
    })
    state.spiderfiedClusters.clear()
  } catch (e) {
    debugWarn && debugWarn('clearSpiderfiedClusters failed', e)
  }
}

function createStackedMarker(key, leaves, lat, lng, clusterId = null) {
  try {
    if (!leaves || leaves.length === 0) return null
    const count = leaves.length

    const combinedContent = leaves
      .map((leaf, idx) => {
        const props = leaf.properties || {}
        const cameraPopup = props.popup || props.popupContent || props.popupHtml || ''
        if (cameraPopup) {
          return `<div class="stacked-camera-item" style="${
            idx > 0
              ? 'border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px; margin-top: 12px;'
              : ''
          }">${cameraPopup}</div>`
        }
        return ''
      })
      .filter(Boolean)
      .join('')

    const popupWrapper = `
      <div class="stacked-popup" style="font-family:var(--font-main); color:#fff;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.15);">
          <span style="font-size:0.85rem; opacity:0.7;">📷</span>
          <strong style="font-size:0.9rem;">${count} kamere na ovoj lokaciji</strong>
        </div>
        <div class="stacked-cameras-content">${combinedContent}</div>
      </div>`

    const icon = L.divIcon({
      className: 'custom-cluster',
      html: `<div class="cluster-icon small"><span>${count}</span></div>`,
      iconSize: [40, 40],
    })
    const m = createMarkerSafe(lat, lng, { icon, title: `${count} kamere`, alt: `${count} kamere` })
    if (!m) return null
    m._isClusterized = true
    m._stackKey = key
    m._stackLeaves = leaves
    const gid = `group:${key}`
    state.clusterMarkers.set(gid, m)
    m.bindPopup(popupWrapper, { maxWidth: 400, maxHeight: 500, autoPan: false })

    if (clusterId) {
      try {
        const clusterMarker = state.clusterMarkers.get(`cluster:${clusterId}`)
        if (clusterMarker) {
          try {
            state.clusterLayer.removeLayer(clusterMarker)
          } catch (e) {}
        }
      } catch (e) {}
    }

    m.addTo(state.clusterLayer)
    return m
  } catch (e) {
    return null
  }
}

function spiderfyCluster(clusterId, centerLat, centerLng, leaves) {
  try {
    if (!leaves || leaves.length === 0) return
    const count = leaves.length

    const radius = Math.min(0.003 + count * 0.00012, 0.02)
    const angleStep = (Math.PI * 2) / count
    const created = []

    leaves.forEach((leaf, idx) => {
      try {
        const props = leaf.properties || {}
        const [lng, lat] = leaf.geometry.coordinates
        const angle = idx * angleStep
        const tx = centerLat + Math.sin(angle) * radius
        const ty = centerLng + Math.cos(angle) * radius
        const icon = L.divIcon({
          className: props.iconClass || '',
          html: props.iconHtml || '',
          iconSize: props.iconSize || [30, 30],
        })
        const m = createMarkerSafe(tx, ty, { icon, title: props.layer || 'lokacija' })
        if (!m) return
        m.bindPopup(props.popup || '', { autoPan: false })
        m.addTo(state.clusterLayer)
        m._isClusterized = true
        created.push(m)
        const pid = props.id || `${props.layer}:${lng}:${lat}`
        const id = `spider:${clusterId}:${idx}`
        state.clusterMarkers.set(id, m)
      } catch (e) {}
    })

    const clusterMarker = state.clusterMarkers.get(`cluster:${clusterId}`)
    if (clusterMarker) {
      try {
        state.clusterLayer.removeLayer(clusterMarker)
      } catch (e) {}
    }

    state.spiderfiedClusters.set(clusterId, { markers: created, clusterMarker })
  } catch (e) {
    debugWarn && debugWarn('spiderfyCluster failed', e)
  }
}

const CATEGORY_ICONS = {
  LOKALNO:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  SPORT:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
  KULTURA:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/></svg>',
  TURIZAM:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>',
  MORE: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
  GASTRONOMIJA:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>',
}

function getCategoryPillHTML(category) {
  const icon = CATEGORY_ICONS[category] || ''
  return `<span class="pill-icon">${icon}</span>${escapeHtml(category)}`
}

function escapeHtml(text) {
  if (!text) return ''
  const textarea = document.createElement('textarea')
  textarea.innerHTML = text
  const decoded = textarea.value
  const div = document.createElement('div')
  div.textContent = decoded
  return div.innerHTML
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function deg2rad(deg) {
  return deg * (Math.PI / 180)
}

function initLazyImages() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('[data-bg]').forEach((el) => {
      const bgUrl = el.dataset.bg
      if (bgUrl) el.style.backgroundImage = `url('${bgUrl}')`
    })
    return
  }

  // Reuse existing observer or create new one
  if (!window._lazyImgObserver) {
    window._lazyImgObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target
            const bgUrl = el.dataset.bg
            if (bgUrl) {
              el.style.backgroundImage = `url('${bgUrl}')`
              el.classList.add('lazy-loaded')
              window._lazyImgObserver.unobserve(el)
            }
          }
        })
      },
      { rootMargin: '100px' }
    )
  }

  document.querySelectorAll('[data-bg]:not(.lazy-loaded)').forEach((el) => {
    window._lazyImgObserver.observe(el)
  })
}
