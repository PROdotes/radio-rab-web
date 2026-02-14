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
  LOKALNO: 'map-pin',
  SPORT: 'trophy',
  KULTURA: 'palette',
  TURIZAM: 'plane',
  MORE: 'anchor',
  GASTRONOMIJA: 'utensils',
}

function getCategoryPillHTML(category) {
  const icon = CATEGORY_ICONS[category] || 'tag'
  return `<i data-lucide="${icon}" class="pill-icon"></i>${escapeHtml(category)}`
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
