/** Radio Rab - Map Module */

function initMap() {

  const mapEl = document.getElementById('leaflet-map')
  if (!mapEl || state.mapInstance) return // Don't re-init if already exists

  // Wait for Leaflet to load
  if (typeof L === 'undefined') {
    setTimeout(initMap, 500)
    return
  }

  // Init Map centered on Rab-Mainland channel
  // preferCanvas: render markers on a single canvas when supported (faster for many points)
  // disable zoom animations to reduce perceived latency when zooming rapidly
  state.mapInstance = L.map('leaflet-map', {
    preferCanvas: true,
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false,
  }).setView([44.715, 14.878], 11)

  // Create a dedicated pane for the ferry so it stays out of cluster/marker layers and won't be recreated
  try {
    state.mapInstance.createPane('ferryPane')
    const ferryPane = state.mapInstance.getPane('ferryPane')
    if (ferryPane) ferryPane.style.zIndex = 550
  } catch (e) { }

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
    // Named layers used by updateMapWithNPT
    traffic: L.layerGroup().addTo(state.mapInstance),
    weather: L.layerGroup().addTo(state.mapInstance),
    islandWeather: L.layerGroup().addTo(state.mapInstance),
    counters: L.layerGroup().addTo(state.mapInstance),
    cameras: L.layerGroup().addTo(state.mapInstance),
    seaQuality: L.layerGroup().addTo(state.mapInstance),
  }

  // Patch LayerGroup.addLayer to block any non-ferry markers being added very
  // close to the ferry. This prevents direct adds to layer groups (traffic,
  // weather, counters, etc.) from creating accidental duplicates.
  try {
    const _origAddLayer = L.LayerGroup.prototype.addLayer
    L.LayerGroup.prototype.addLayer = function (layer) {
      try {
        // If proximity protections are disabled, delegate immediately
        if (CONFIG.map && CONFIG.map.proximityBlocking === false)
          return _origAddLayer.apply(this, arguments)
        if (!layer) return _origAddLayer.apply(this, arguments)
        if (layer instanceof L.Popup) return _origAddLayer.apply(this, arguments) // Allow popups
        const ferryLatLng =
          state.ferryMarker &&
          (state.ferryMarker.getLatLng ? state.ferryMarker.getLatLng() : state.ferryMarker._latlng)
        const latlng = layer._latlng || (layer.getLatLng && layer.getLatLng && layer.getLatLng())
        const eps = 0.0005
        if (ferryLatLng && latlng && latlng.lat != null) {
          if (
            Math.max(
              Math.abs(latlng.lat - ferryLatLng.lat),
              Math.abs(latlng.lng - ferryLatLng.lng)
            ) <= eps
          ) {
            // If this layer isn't explicitly flagged as the ferry, block it
            if (
              !layer._isFerry &&
              !(layer.options && (layer.options.pane === 'ferryPane' || layer.options._isFerry))
            ) {
              try {
                debugWarn &&
                  debugWarn('LAYERGROUP.ADD: blocked marker near ferry', {
                    id: layer._leaflet_id,
                    latlng,
                  })
                debugWarn && debugWarn(new Error('LAYERGROUP.ADD stack').stack)
              } catch (err) { }
              return this
            }
          }
        }
      } catch (e) {
        /* ignore */
      }
      return _origAddLayer.apply(this, arguments)
    }
  } catch (e) {
    /* ignore if Leaflet not available */
  }

  // One-time purge helper: remove legacy/unflagged markers from map/layers.
  // Keeps ferry-protected markers and cluster-managed markers intact.
  function purgeLegacyMarkers() {
    try {
      const keepFlags = (m) => m && (m._isFerry || m._isClusterized || m._doNotRemove)

      // Ensure clusterLayer exists so we can inspect it
      if (!state.clusterLayer) state.clusterLayer = L.layerGroup().addTo(state.mapInstance)

      // Inspect clusterLayer
      try {
        const layers = state.clusterLayer.getLayers()
        layers.forEach((lay) => {
          try {
            if (!lay) return
            if (!keepFlags(lay)) {
              try {
                state.clusterLayer.removeLayer(lay)
              } catch (e) { }
            }
          } catch (e) { }
        })
      } catch (e) { }

      // Inspect named layers
      try {
        Object.keys(state.layers || {}).forEach((k) => {
          try {
            const lg = state.layers[k]
            if (!lg || typeof lg.getLayers !== 'function') return
            lg.getLayers().forEach((lay) => {
              try {
                if (!lay) return
                if (!keepFlags(lay)) {
                  try {
                    lg.removeLayer(lay)
                  } catch (e) { }
                }
              } catch (e) { }
            })
          } catch (e) { }
        })
      } catch (e) { }

      // Clean clusterMarkers registry entries that point to removed/unflagged markers
      try {
        Array.from(state.clusterMarkers.entries()).forEach(([id, m]) => {
          try {
            if (!m) {
              state.clusterMarkers.delete(id)
              return
            }
            if (!keepFlags(m)) state.clusterMarkers.delete(id)
          } catch (e) { }
        })
      } catch (e) { }
    } catch (e) {
      debugWarn && debugWarn('purgeLegacyMarkers failed', e)
    }
  }

  // Global defensive listener: if any layer/marker is added near the ferry and is not
  // explicitly the ferry, remove it immediately and log stack trace. This covers cases
  // where code adds markers directly (not via clustering) and prevents accidental duplicates.
  try {
    state.mapInstance.on('layeradd', (e) => {
      try {
        const lay = e.layer
        if (!lay) return
        if (lay instanceof L.Popup) return // Allow popups
        const ferryLatLng =
          state.ferryMarker &&
          (state.ferryMarker.getLatLng ? state.ferryMarker.getLatLng() : state.ferryMarker._latlng)
        if (!ferryLatLng) return
        const latlng = lay._latlng || (lay.getLatLng && lay.getLatLng && lay.getLatLng())
        if (!latlng || latlng.lat == null) return
        const eps = 0.0005
        if (
          Math.max(
            Math.abs(latlng.lat - ferryLatLng.lat),
            Math.abs(latlng.lng - ferryLatLng.lng)
          ) <= eps
        ) {
          // If this layer is not explicitly the ferry, remove and log
          if (
            !lay._isFerry &&
            !(lay.options && (lay.options.pane === 'ferryPane' || lay.options._isFerry))
          ) {
            try {
              debugWarn &&
                debugWarn('LAYERADD: removing unexpected marker near ferry', {
                  id: lay._leaflet_id,
                  latlng,
                })
              debugWarn && debugWarn(new Error('LAYERADD stack').stack)
            } catch (err) { }
            try {
              lay.remove()
            } catch (err) { }
          }
        }
      } catch (err) {
        /* ignore */
      }
    })
  } catch (err) {
    /* ignore if events unsupported */
  }

  // One-time defensive cleanup: remove any stray markers flagged as ferry from non-ferry layers
  try {
    const stray = []
    if (state.clusterLayer) {
      try {
        stray.push(...state.clusterLayer.getLayers())
      } catch (e) { }
    }
    if (state.layers && state.layers.markers) {
      try {
        stray.push(...state.layers.markers.getLayers())
      } catch (e) { }
    }
    // Also inspect all top-level map layers for accidental ferry markers
    try {
      state.mapInstance.eachLayer((lay) => {
        if (lay && lay._isFerry) stray.push(lay)
      })
    } catch (e) { }

    stray.forEach((cand) => {
      if (!cand || !cand._isFerry) return
      // Only remove if it's not already in the dedicated ferry layer
      try {
        if (
          !(
            state.layers &&
            state.layers.ferry &&
            state.layers.ferry.hasLayer &&
            state.layers.ferry.hasLayer(cand)
          )
        ) {
          try {
            cand.remove()
          } catch (e) { }
        }
      } catch (e) { }
    })
  } catch (e) {
    /* defensive cleanup failed - ignore */
  }

  // Monitor ferry layer changes for diagnostics
  try {
    // (removed diagnostics) no-op — keep ferry layer listeners silent in normal runs
  } catch (e) {
    // ignore if events unsupported
  }

  // Cleanup any previous ferry integrity interval when re-initializing
  if (state._ferryIntegrityInterval) {
    try {
      clearInterval(state._ferryIntegrityInterval)
    } catch (e) { }
    state._ferryIntegrityInterval = null
  }

  // --- CUSTOM FILTER CONTROL ---
  const FilterControl = L.Control.extend({
    onAdd: function (map) {
      const div = L.DomUtil.create('div', 'map-filter-panel')

      // Load Saved Settings or Default
      const savedSettings = JSON.parse(localStorage.getItem('map_filter_settings') || '{}')
      const layers = savedSettings.layers || {
        roadwork: true,
        weather: true,
        counters: true,
        cameras: true,
        seaQuality: true,
      }
      const scope = savedSettings.scope || 'regional'

      div.innerHTML = `
        <div class="map-filter-header" id="map-filter-header">
          <span class="map-filter-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Slojevi karte
          </span>
          <svg class="map-control-chevron" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div class="map-filter-content" id="map-filter-content">
          <div class="map-filter-section">
            <div class="map-filter-section-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/>
              </svg>
              Podatkovni slojevi
            </div>
            <div class="map-filter-options">
              <label class="map-filter-option">
                <input type="checkbox" name="layer-type" value="roadwork" ${layers.roadwork ? 'checked' : ''
        }>
                <div class="map-filter-option-icon map-filter-option-icon--alert">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                    <path d="M12 9v4"/><path d="M12 17h.01"/>
                  </svg>
                </div>
                <div>
                  <div class="map-filter-option-text">Radovi & Alerti</div>
                </div>
              </label>
              <label class="map-filter-option">
                <input type="checkbox" name="layer-type" value="weather" ${layers.weather ? 'checked' : ''
        }>
                <div class="map-filter-option-icon map-filter-option-icon--weather">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="4"/>
                    <path d="M12 2v2"/><path d="M12 20v2"/>
                    <path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/>
                    <path d="M2 12h2"/><path d="M20 12h2"/>
                  </svg>
                </div>
                <div>
                  <div class="map-filter-option-text">Vrijeme</div>
                </div>
              </label>
              <label class="map-filter-option">
                <input type="checkbox" name="layer-type" value="counters" ${layers.counters ? 'checked' : ''
        }>
                <div class="map-filter-option-icon map-filter-option-icon--counter">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                    <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
                  </svg>
                </div>
                <div>
                  <div class="map-filter-option-text">Brojači prometa</div>
                </div>
              </label>
              <label class="map-filter-option">
                <input type="checkbox" name="layer-type" value="cameras" ${layers.cameras ? 'checked' : ''
        }>
                <div class="map-filter-option-icon map-filter-option-icon--camera">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                    <circle cx="12" cy="13" r="3"/>
                  </svg>
                </div>
                <div>
                  <div class="map-filter-option-text">Kamere uživo</div>
                </div>
              </label>
              <label class="map-filter-option">
                <input type="checkbox" name="layer-type" value="seaQuality" ${layers.seaQuality ? 'checked' : ''
        }>
                <div class="map-filter-option-icon map-filter-option-icon--sea">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>
                  </svg>
                </div>
                <div>
                  <div class="map-filter-option-text">Kakvoća mora</div>
                </div>
              </label>
            </div>
          </div>

          <div class="map-filter-section">
            <div class="map-filter-section-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 1.892.402 3.13 1.5 4.5L12 22l6.5-7.5c1.098-1.37 1.5-2.608 1.5-4.5a8 8 0 0 0-8-8Z"/>
              </svg>
              Područje prikaza
            </div>
            <div class="map-filter-options">
              <label class="map-filter-option">
                <input type="radio" name="region-scope" value="local" ${scope === 'local' ? 'checked' : ''
        }>
                <div class="map-filter-option-icon map-filter-option-icon--local">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/>
                  </svg>
                </div>
                <div>
                  <div class="map-filter-option-text">Lokalno</div>
                  <div class="map-filter-option-desc">Samo otok Rab</div>
                </div>
              </label>
              <label class="map-filter-option">
                <input type="radio" name="region-scope" value="regional" ${scope === 'regional' ? 'checked' : ''
        }>
                <div class="map-filter-option-icon map-filter-option-icon--regional">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
                  </svg>
                </div>
                <div>
                  <div class="map-filter-option-text">Regija</div>
                  <div class="map-filter-option-desc">75 km oko otoka</div>
                </div>
              </label>
              <label class="map-filter-option">
                <input type="radio" name="region-scope" value="full" ${scope === 'full' ? 'checked' : ''
        }>
                <div class="map-filter-option-icon map-filter-option-icon--full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
                    <rect width="7" height="5" x="7" y="7" rx="1"/><rect width="7" height="5" x="10" y="12" rx="1"/>
                  </svg>
                </div>
                <div>
                  <div class="map-filter-option-text">Cijela Hrvatska</div>
                  <div class="map-filter-option-desc">Obala i unutrašnjost</div>
                </div>
              </label>
            </div>
          </div>
        </div>
      `

      // Toggle functionality
      const content = div.querySelector('#map-filter-content')
      const toggleBtn = div.querySelector('#map-filter-toggle')
      const header = div.querySelector('#map-filter-header')

      const setFilterState = (collapsed) => {
        content.style.display = collapsed ? 'none' : ''
        div.classList.toggle('collapsed', collapsed)
      }

      const toggleFilter = () => {
        const willCollapse = content.style.display !== 'none'
        setFilterState(willCollapse)
        localStorage.setItem('map_filter_collapsed', willCollapse)
      }

      // Load collapsed state - default to true if never set
      const isFilterCollapsed = localStorage.getItem('map_filter_collapsed') !== 'false'
      setFilterState(isFilterCollapsed)

      header.addEventListener('click', toggleFilter)

      // Initial Lazy load check if scope was saved as 'full'
      if (scope === 'full') {
        setTimeout(() => {
          loadCoastalData()
          loadGlobalData()
        }, 1000)
      }

      // Prevent map clicks
      L.DomEvent.disableClickPropagation(div)

      // Add Listeners
      const inputs = div.querySelectorAll('input')
      inputs.forEach((input) => {
        input.addEventListener('change', () => {
          updateMapVisualization()

          // Save Settings
          const settings = {
            layers: {
              roadwork: div.querySelector('input[value="roadwork"]').checked,
              weather: div.querySelector('input[value="weather"]').checked,
              counters: div.querySelector('input[value="counters"]').checked,
              cameras: div.querySelector('input[value="cameras"]').checked,
              seaQuality: div.querySelector('input[value="seaQuality"]').checked,
            },
            scope: div.querySelector('input[name="region-scope"]:checked').value,
          }
          localStorage.setItem('map_filter_settings', JSON.stringify(settings))

          // Handle Lazy Loading
          if (settings.scope === 'full') {
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

  // Emergency suppression removed: rely on createMarkerSafe + LayerGroup and
  // layeradd guards to prevent accidental non-ferry markers near the ferry.

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

  // Port markers removed per request (Mišnjak / Stinica)

  // Route Line
  L.polyline([misnjak, stinica], {
    color: 'var(--primary)',
    weight: 3,
    opacity: 0.5,
    dashArray: '10, 10',
  }).addTo(state.layers.ferry)

  // Ferry Icon - Premium design with SVG ship icon
  const ferryIcon = L.divIcon({
    className: 'ferry-icon-marker',
    html: `<div class="ferry-marker">
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
        <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
        <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/>
        <path d="M12 10v4"/>
        <path d="M12 2v3"/>
      </svg>
    </div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  })

  // Create ferry marker in the dedicated ferryPane and protect it from accidental removal
  const ferryMarker = L.marker(misnjak, {
    icon: ferryIcon,
    pane: 'ferryPane',
    interactive: true,
  }).addTo(state.layers.ferry)
  ferryMarker._isFerry = true
  ferryMarker._doNotRemove = true
  // Keep original remove in case we need to unprotect later
  ferryMarker._originalRemove = ferryMarker.remove.bind(ferryMarker)
  ferryMarker.remove = function () {
    // prevent accidental removal; only allow if explicitly forced
    if (this._forceRemove) return this._originalRemove()
    debugWarn &&
      debugWarn('Ferry: prevented accidental remove() call on ferryMarker', this._leaflet_id)
  }
  // persist reference for the simulation to always resolve the live marker
  state.ferryMarker = ferryMarker

  // Explicit click handler to show AIS data modal
  ferryMarker.on('click', function (e) {
    e.originalEvent?.stopPropagation()
    showVesselAISModal('9822621')
  })

  // Start Simulation Loop (no AIS ghost marker)
  startFerrySimulation(ferryMarker, misnjak, stinica)

  // Enforce ferry integrity periodically to prevent duplicates created by
  // cluster/marker rebuilds or other layers. Runs every 3 seconds.
  // NOTE: Disabled automatic periodic enforcement during cleanup. Leave the
  // enforceFerryIntegrity function available for manual invocation if needed.
  // state._ferryIntegrityInterval = setInterval(() => enforceFerryIntegrity(0.0006), 3000)

  // Suppression expiry: none (we removed the one-time L.marker monkey-patch).

  // Add Centre/Locate Controls
  addMapControls()

  // --- AIS OVERLAY TOGGLE ---
  const aisOverlay = document.querySelector('.map-overlay-info')
  if (aisOverlay) {
    const h4 = aisOverlay.querySelector('h4')
    const p = aisOverlay.querySelector('p')
    const contentv2 = aisOverlay.querySelector('#ferry-status-v2')

    const bodyDiv = document.createElement('div')
    bodyDiv.id = 'ais-overlay-body'
    // Padding handled by CSS #ais-overlay-body { padding: 1rem; }
    if (h4) bodyDiv.appendChild(h4)
    if (p) bodyDiv.appendChild(p)
    if (contentv2) bodyDiv.appendChild(contentv2)

    const headerDiv = document.createElement('div')
    headerDiv.className = 'map-filter-header ais-overlay-header'
    headerDiv.style.padding = '10px 16px'
    headerDiv.innerHTML = `
      <span class="map-filter-title">
        <span class="pulse-dot" style="width: 8px; height: 8px"></span>
        AIS LIVE
      </span>
      <svg class="map-control-chevron" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `

    aisOverlay.innerHTML = ''
    aisOverlay.appendChild(headerDiv)
    aisOverlay.appendChild(bodyDiv)

    const setAisState = (isHidden) => {
      bodyDiv.style.display = isHidden ? 'none' : ''
      aisOverlay.classList.toggle('collapsed', isHidden)
      if (isHidden) {
        aisOverlay.style.background = 'rgba(15, 23, 42, 0.7)'
      } else {
        aisOverlay.style.background = 'rgba(15, 23, 42, 0.95)'
      }
    }

    // Load state - default to true if never set
    const isAisCollapsed = localStorage.getItem('ais_overlay_collapsed') !== 'false'
    setAisState(isAisCollapsed)

    const toggleAis = (e) => {
      if (e) e.stopPropagation()
      const isNowCollapsed = !aisOverlay.classList.contains('collapsed')
      setAisState(isNowCollapsed)
      localStorage.setItem('ais_overlay_collapsed', isNowCollapsed)
    }

    headerDiv.addEventListener('click', toggleAis)
    aisOverlay.addEventListener('click', (e) => {
      if (aisOverlay.classList.contains('collapsed')) toggleAis(e)
    })
    L.DomEvent.disableClickPropagation(aisOverlay)
  }

  // Initial Render
  try {
    // Purge legacy/unflagged markers once on startup to prevent leftovers
    purgeLegacyMarkers()
  } catch (e) {
    /* ignore */
  }
  updateMapVisualization()
  // Attach cluster update handlers (debounced) so clusters refresh on move/zoom
  attachClusterUpdateHandlers()
} // end initMap

function updateMapVisualization() {
  if (!state.mapInstance || !state.layers) return

  // Debug: entry log
  //debugLog('Map: updateMapVisualization called')
  const __mapTiming_start =
    typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()

  // Get Filter States (used to decide whether we need to rebuild features/index)
  const showRoadwork = document.querySelector('input[value="roadwork"]')?.checked ?? true
  const showWeather = document.querySelector('input[value="weather"]')?.checked ?? true
  const showCounters = document.querySelector('input[value="counters"]')?.checked ?? true
  const showCameras = document.querySelector('input[value="cameras"]')?.checked ?? true
  const showSeaQuality = document.querySelector('input[value="seaQuality"]')?.checked ?? true

  const scope = document.querySelector('input[name="region-scope"]:checked')?.value || 'regional'
  const rabCoords = { lat: 44.76, lng: 14.76 }

  const isWithinScope = (lat, lng, itemDist) => {
    if (!lat || !lng) return false
    let dist = itemDist
    if (dist === undefined || dist === null)
      dist = getDistanceFromLatLonInKm(rabCoords.lat, rabCoords.lng, lat, lng)
    if (scope === 'local') return dist <= 20
    if (scope === 'regional') return dist <= 75
    return true
  }

  // Compute a small fingerprint of current data+filters to avoid rebuilding Supercluster every viewport change
  const featuresFingerprint = JSON.stringify({
    showRoadwork,
    showWeather,
    showCounters,
    showCameras,
    showSeaQuality,
    scope,
    coastalLoaded: !!state.coastalLoaded,
    globalLoaded: !!state.globalLoaded,
    nptAlertsLen: (state.nptAlerts || []).length,
    nptIslandWeatherLen: (state.nptIslandWeather || []).length,
    nptCountersLen: (state.nptCounters || []).length,
    nptIslandCamerasLen: (state.nptIslandCameras || []).length,
    seaQualityLen: (state.seaQualityPoints || []).length,
  })

  const needRebuild = !state.superIndex || state._lastFeaturesFingerprint !== featuresFingerprint

  let features = []

  if (needRebuild) {
    debugLog('Map: rebuilding features + superIndex')

    // When rebuilding the Supercluster index we must ensure no stale raw markers
    // remain from previous builds (especially seaQuality markers that were added
    // to their own layer in earlier code paths). Clear clusterLayer and its
    // registry so Supercluster becomes the single owner of rendered markers.
    try {
      if (state.clusterLayer) {
        try {
          state.clusterLayer.clearLayers()
        } catch (e) { }
      }
      // Remove all tracked cluster markers (except ferry) and reset the map
      try {
        state.clusterMarkers.forEach((m, id) => {
          try {
            if (m && !m._isFerry) {
              try {
                state.clusterLayer.removeLayer(m)
              } catch (e) { }
            }
          } catch (e) { }
        })
      } catch (e) { }
      try {
        state.clusterMarkers.clear()
      } catch (e) {
        state.clusterMarkers = new Map()
      }

      // Clear any dedicated seaQuality layer markers so they don't persist when
      // clustering is enabled (we index seaQuality via Supercluster now).
      try {
        if (state.layers && state.layers.seaQuality) state.layers.seaQuality.clearLayers()
      } catch (e) { }
    } catch (e) {
      /* ignore cleanup errors */
    }

    // 1) Alerts
    if (showRoadwork && state.nptAlerts) {
      const uniqueAlertsMap = new Map()
      state.nptAlerts.forEach((a) => uniqueAlertsMap.set(a.id, a))
      const uniqueAlerts = Array.from(uniqueAlertsMap.values())
      uniqueAlerts.forEach((alert) => {
        if (!isWithinScope(alert.lat, alert.lng)) return
        const type = getAlertType(alert)
        const isHighSeverity = type === 'accident' || type === 'closure'
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [parseFloat(alert.lng), parseFloat(alert.lat)] },
          properties: {
            id: alert.id,
            layer: 'alert',
            iconClass: 'custom-map-marker marker-' + type,
            iconSize: [36, 36],
            iconHtml: `<div class="map-marker map-marker--alert"${isHighSeverity ? ' data-severity="high"' : ''
              }>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <path d="M12 9v4"/><path d="M12 17h.01"/>
              </svg>
            </div>`,
            popup: `
              <div class="popup-header">
                <div class="popup-header-icon popup-header-icon--alert">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                    <path d="M12 9v4"/><path d="M12 17h.01"/>
                  </svg>
                </div>
                <div class="popup-header-text">
                  <h3 class="popup-title">${escapeHtml(
              type.charAt(0).toUpperCase() + type.slice(1)
            )}</h3>
                  <span class="popup-subtitle">Prometno upozorenje</span>
                </div>
              </div>
              <div class="popup-body">
                <p class="popup-description">${escapeHtml(alert.details)}</p>
              </div>
              <div class="popup-footer">
                <span class="popup-source">Izvor: NPT</span>
                <span class="popup-live">Aktivno</span>
              </div>
            `,
          },
        })
      })
    }

    // 2) Weather
    if (showWeather) {
      let rawWeather = [...(state.nptIslandWeather || [])]
      if (state.coastalLoaded && state.coastalWeather) rawWeather.push(...state.coastalWeather)
      if (state.globalLoaded && state.globalWeather) rawWeather.push(...state.globalWeather)
      const uniqueWeatherMap = new Map()
      rawWeather.forEach((w) => uniqueWeatherMap.set(w.id, w))
      const allWeather = Array.from(uniqueWeatherMap.values())
      allWeather.forEach((w) => {
        if (!isWithinScope(w.lat, w.lng, w.distanceFromRab)) return
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [parseFloat(w.lng), parseFloat(w.lat)] },
          properties: {
            id: w.id,
            layer: 'weather',
            iconClass: 'custom-weather-marker',
            iconSize: [36, 36],
            iconHtml: `<div class="map-marker map-marker--weather">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2"/><path d="M12 20v2"/>
                <path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/>
                <path d="M2 12h2"/><path d="M20 12h2"/>
                <path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
              </svg>
            </div>`,
            popup: `
              <div class="popup-header">
                <div class="popup-header-icon popup-header-icon--weather">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="4"/>
                    <path d="M12 2v2"/><path d="M12 20v2"/>
                    <path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/>
                    <path d="M2 12h2"/><path d="M20 12h2"/>
                    <path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
                  </svg>
                </div>
                <div class="popup-header-text">
                  <h3 class="popup-title">${escapeHtml(w.id)}</h3>
                  <span class="popup-subtitle">Vremenska postaja</span>
                </div>
              </div>
              <div class="popup-body">
                <div class="popup-row">
                  <span class="popup-label">Temperatura</span>
                  <span class="popup-value">${escapeHtml(String(w.temp))}°C</span>
                </div>
                <div class="popup-row">
                  <span class="popup-label">Vjetar</span>
                  <span class="popup-value">${escapeHtml(String(w.windSpeed))} km/h</span>
                </div>
                <div class="popup-row">
                  <span class="popup-label">Udari vjetra</span>
                  <span class="popup-value">${escapeHtml(String(w.windGust))} km/h</span>
                </div>
              </div>
              <div class="popup-footer">
                <span class="popup-source">Izvor: DHMZ</span>
                <span class="popup-live">Aktivno</span>
              </div>
            `,
          },
        })
      })
    }

    // 3) Counters
    if (showCounters) {
      let rawCounters = [...(state.nptCounters || [])]
      if (state.coastalLoaded && state.coastalCounters) rawCounters.push(...state.coastalCounters)
      if (state.globalLoaded && state.globalCounters) rawCounters.push(...state.globalCounters)
      const uniqueCountersMap = new Map()
      rawCounters.forEach((c) => uniqueCountersMap.set(c.id, c))
      const uniqueCounters = Array.from(uniqueCountersMap.values())
      const groupedByLoc = {}
      uniqueCounters.forEach((c) => {
        if (!isWithinScope(c.lat, c.lng, c.distanceFromRab)) return
        const key = `${parseFloat(c.lat).toFixed(5)},${parseFloat(c.lng).toFixed(5)}`
        if (!groupedByLoc[key]) groupedByLoc[key] = []
        groupedByLoc[key].push(c)
      })
      Object.values(groupedByLoc).forEach((group) => {
        const first = group[0]
        let popupRows = ''
        if (group.length > 1) {
          group.forEach((c, idx) => {
            popupRows += `
              ${idx > 0
                ? '<div style="border-top: 1px solid rgba(255,255,255,0.1); margin: 8px 0;"></div>'
                : ''
              }
              <div style="font-weight: 600; color: var(--text-main); margin-bottom: 4px;">${escapeHtml(
                c.name
              )}</div>
              <div class="popup-row">
                <span class="popup-label">Protok</span>
                <span class="popup-value">${escapeHtml(String(c.flow))} voz/h</span>
              </div>
              <div class="popup-row">
                <span class="popup-label">Brzina</span>
                <span class="popup-value">${escapeHtml(String(c.speed))} km/h</span>
              </div>
            `
          })
        } else {
          popupRows = `
            <div class="popup-row">
              <span class="popup-label">Protok</span>
              <span class="popup-value">${escapeHtml(String(first.flow))} voz/h</span>
            </div>
            <div class="popup-row">
              <span class="popup-label">Brzina</span>
              <span class="popup-value">${escapeHtml(String(first.speed))} km/h</span>
            </div>
          `
        }
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [parseFloat(first.lng), parseFloat(first.lat)] },
          properties: {
            id: first.id || first.name,
            layer: 'counter',
            iconClass: 'custom-counter-marker',
            iconSize: [36, 36],
            iconHtml: `<div class="map-marker map-marker--counter">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                <circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
              </svg>
            </div>`,
            popup: `
              <div class="popup-header">
                <div class="popup-header-icon popup-header-icon--counter">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                    <circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
                  </svg>
                </div>
                <div class="popup-header-text">
                  <h3 class="popup-title">${group.length > 1 ? 'Višesmjerno brojanje' : escapeHtml(first.name)
              }</h3>
                  <span class="popup-subtitle">Brojač prometa</span>
                </div>
              </div>
              <div class="popup-body">
                ${popupRows}
              </div>
              <div class="popup-footer">
                <span class="popup-source">Izvor: HAK</span>
                <span class="popup-live">Aktivno</span>
              </div>
            `,
          },
        })
      })
    }

    // 4) Cameras
    if (showCameras) {
      let rawCameras = [...(state.nptIslandCameras || [])]
      if (state.coastalLoaded && state.coastalCameras) rawCameras.push(...state.coastalCameras)
      if (state.globalLoaded && state.globalCameras) rawCameras.push(...state.globalCameras)
      const uniqueCamsMap = new Map()
      rawCameras.forEach((c) => uniqueCamsMap.set(c.id, c))
      const uniqueCams = Array.from(uniqueCamsMap.values())
      uniqueCams.forEach((cam) => {
        if (!isWithinScope(cam.lat, cam.lng, cam.distanceFromRab)) return
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [parseFloat(cam.lng), parseFloat(cam.lat)] },
          properties: {
            id: cam.id,
            layer: 'camera',
            iconClass: 'custom-camera-marker',
            iconSize: [36, 36],
            iconHtml: `<div class="map-marker map-marker--camera">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                <circle cx="12" cy="13" r="3"/>
              </svg>
            </div>`,
            popup: `
              <div class="popup-header">
                <div class="popup-header-icon popup-header-icon--camera">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                    <circle cx="12" cy="13" r="3"/>
                  </svg>
                </div>
                <div class="popup-header-text">
                  <h3 class="popup-title">${escapeHtml(cam.title)}</h3>
                  <span class="popup-subtitle">Prometna kamera</span>
                </div>
              </div>
              <div class="popup-camera-preview">
                <img src="${escapeHtml(cam.url)}" alt="${escapeHtml(cam.title)}"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 640 360%22%3E%3Crect fill=%22%230f172a%22 width=%22640%22 height=%22360%22/%3E%3Ctext x=%22320%22 y=%22180%22 fill=%22%2364748b%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2216%22%3ESlika nije dostupna%3C/text%3E%3C/svg%3E'; this.onerror=null;">
              </div>
              <div class="popup-camera-controls">
                <button class="popup-camera-btn" data-camera-url="${escapeHtml(
              cam.url
            )}" data-camera-title="${escapeHtml(cam.title)}">Otvori sliku</button>
              </div>
              <div class="popup-footer">
                <span class="popup-source">NPT Live</span>
                <span class="popup-live">Streaming</span>
              </div>
            `,
          },
        })
      })
    }

    // 5) Sea Quality
    if (showSeaQuality && state.seaQualityPoints) {
      state.seaQualityPoints.forEach((p) => {
        if (!isWithinScope(p.lat, p.lng)) return

        const qualityVal = parseInt(p.locj)
        const qualityTxt =
          qualityVal === 1
            ? 'Izvrsna'
            : qualityVal === 2
              ? 'Dobra'
              : qualityVal === 3
                ? 'Zadovoljavajuća'
                : 'Nezadovoljavajuća'
        const qualityClass =
          qualityVal === 1
            ? 'excellent'
            : qualityVal === 2
              ? 'good'
              : qualityVal === 3
                ? 'moderate'
                : 'poor'
        const markerClass =
          qualityVal === 1
            ? 'sea-excellent'
            : qualityVal === 2
              ? 'sea-good'
              : qualityVal === 3
                ? 'sea-moderate'
                : 'sea-poor'

        const historyHtml =
          p.history && p.history.length > 0
            ? `<button class="popup-history-btn" data-sea-id="${escapeHtml(
              String(p.lsta || p.id)
            )}">Povijest mjerenja</button>`
            : `<div class="popup-history-note">Nema dostupne povijesti mjerenja.</div>`

        // Choose a friendly place name for popups: prefer specific spot/bay names
        // (lnaziv, lpla, lnaz) over generic city names (lgrad) so popups show
        // "Uvala Zastolac" instead of just "Rab" or "Lopar".
        const _cityName = (p.lgrad || '').trim()
        const _candidates = [p.lnaziv, p.lpla, p.lnaz].map((v) => (v || '').trim()).filter(Boolean)
        function _looksSpecific(name) {
          if (!name) return false
          const lower = name.toLowerCase()
          if (lower.includes('uvala') || lower.includes('u. ')) return true
          if (name.split(/\s+/).length > 1) return true
          return false
        }

        let displayName = 'Lokacija'
        for (const c of _candidates) {
          if (!c) continue
          if (_cityName && c.toLowerCase() === _cityName.toLowerCase()) continue
          if (_looksSpecific(c)) {
            displayName = c
            break
          }
          if (displayName === 'Lokacija') displayName = c
        }
        const displayCity = _cityName

        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [parseFloat(p.lng), parseFloat(p.lat)] },
          properties: {
            id: p.lsta || p.id,
            layer: 'seaQuality',
            iconClass: 'custom-sea-marker',
            iconSize: [36, 36],
            iconHtml: `<div class="map-marker map-marker--${markerClass}">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>
              </svg>
            </div>`,
            popup: `
              <div class="popup-header">
                <div class="popup-header-icon popup-header-icon--sea">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>
                  </svg>
                </div>
                <div class="popup-header-text">
                  <h3 class="popup-title">${escapeHtml(displayName)}</h3>
                  <span class="popup-subtitle">${escapeHtml(displayCity)}</span>
                </div>
              </div>
              <div class="popup-body">
                <div class="popup-quality-badge popup-quality-badge--${qualityClass}">
                  <div class="popup-quality-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>
                    </svg>
                  </div>
                  <div>
                    <div class="popup-quality-label">Kakvoća mora</div>
                    <div class="popup-quality-value">${qualityTxt.toUpperCase()}</div>
                  </div>
                </div>
                ${historyHtml}
              </div>
              <div class="popup-footer">
                <span class="popup-source">IZOR ${p.god || ''}</span>
                <span class="popup-live">Službeni podaci</span>
              </div>
            `,
          },
        })
      })
    }

    // Debug: report number of features before indexing
    debugLog(`Map: built features=${features.length}`)

    // Remove any features that coincide with the ferry position so Supercluster doesn't generate
    // separate markers at the same coordinates. Use a small epsilon (about 50m) to compare.
    try {
      const ferryLatLng =
        state.ferryMarker &&
        (state.ferryMarker.getLatLng ? state.ferryMarker.getLatLng() : state.ferryMarker._latlng)
      if (ferryLatLng) {
        const eps = 0.0005
        features = features.filter((f) => {
          try {
            if (!f || !f.geometry || !f.geometry.coordinates) return true
            const [lng, lat] = f.geometry.coordinates
            if (Math.max(Math.abs(lat - ferryLatLng.lat), Math.abs(lng - ferryLatLng.lng)) <= eps)
              return false
          } catch (e) { }
          return true
        })
      }
    } catch (e) { }

    // If clustering is disabled, render raw features as points (no Supercluster)
    if (CONFIG.map && CONFIG.map.enableClustering === false) {
      state.superIndex = null
      // Ensure clusterLayer exists
      if (!state.clusterLayer) state.clusterLayer = L.layerGroup().addTo(state.mapInstance)

      // Pre-group identical-coordinate camera features so we create a single
      // stacked marker instead of many overlapping raw points.
      const cameraGroups = new Map()
      features.forEach((f) => {
        try {
          if (!f || !f.geometry || !f.geometry.coordinates) return
          const props = f.properties || {}
          if ((props.layer || '') !== 'camera') return
          const [lng, lat] = f.geometry.coordinates
          const key = `${parseFloat(lat).toFixed(6)}:${parseFloat(lng).toFixed(6)}`
          const arr = cameraGroups.get(key) || []
          arr.push(f)
          cameraGroups.set(key, arr)
        } catch (e) { }
      })

      const newIds = new Set()
      const createdCameraGroups = new Set()

      features.forEach((f) => {
        try {
          if (!f || !f.geometry || !f.geometry.coordinates) return
          const [lng, lat] = f.geometry.coordinates
          const props = f.properties || {}
          const pid = props.id || `${props.layer}:${lng}:${lat}`
          const id = `point:${props.layer || 'p'}:${pid}`
          newIds.add(id)

          // If this is part of a camera-identical group, create a single stacked
          // marker for the group and skip creating individual raw points.
          try {
            if ((props.layer || '') === 'camera') {
              const key = `${parseFloat(lat).toFixed(6)}:${parseFloat(lng).toFixed(6)}`
              const group = cameraGroups.get(key)
              if (group && group.length > 1) {
                if (!createdCameraGroups.has(key)) {
                  createdCameraGroups.add(key)
                  const m = createStackedMarker(key, group, lat, lng)
                  if (m) newIds.add(`group:${key}`)
                }
                return
              }
            }
          } catch (e) {
            /* ignore grouping errors */
          }

          const icon = L.divIcon({
            className: props.iconClass || '',
            html: props.iconHtml || '',
            iconSize: props.iconSize || [30, 30],
          })
          const existing = state.clusterMarkers.get(id)
          if (existing) {
            if (existing._isClusterized) existing.setLatLng([lat, lng])
          } else {
            // Skip creating markers that would overlap the ferry
            try {
              const ferryLatLng =
                state.ferryMarker &&
                (state.ferryMarker.getLatLng
                  ? state.ferryMarker.getLatLng()
                  : state.ferryMarker._latlng)
              const eps = 0.0005
              if (
                ferryLatLng &&
                Math.max(Math.abs(lat - ferryLatLng.lat), Math.abs(lng - ferryLatLng.lng)) <= eps
              ) {
                debugWarn &&
                  debugWarn(
                    'Map: skipping creation of raw point near ferry (clustering disabled)',
                    { id, lat, lng }
                  )
                // Additional loud logging when enabled to trace callsite
                logProximitySkip({ reason: 'raw-point', id, lat, lng })
                return
              }
            } catch (e) { }

            const marker = createMarkerSafe(lat, lng, { icon, title: props.layer || 'lokacija' })
            if (marker) {
              marker.bindPopup(props.popup || '').addTo(state.clusterLayer)
              const el = marker.getElement && marker.getElement()
              if (el) {
                el.setAttribute('role', 'button')
                el.setAttribute('aria-label', props.layer || 'lokacija')
                el.tabIndex = 0
                el.addEventListener('keydown', (ev) => {
                  if (ev.key === 'Enter') marker.fire('click')
                })
              }
              marker._isClusterized = true
              state.clusterMarkers.set(id, marker)
            }
          }
        } catch (e) {
          /* ignore individual feature errors */
        }
      })

      // Remove markers that are no longer present
      state.clusterMarkers.forEach((marker, id) => {
        if (!newIds.has(id)) {
          if (marker._isClusterized && !marker._isFerry) {
            try {
              state.clusterLayer.removeLayer(marker)
            } catch (e) { }
            state.clusterMarkers.delete(id)
          }
        }
      })

      state._lastFeaturesFingerprint = featuresFingerprint
      return
    }

    // Build supercluster index (clustering enabled)
    if (!window.Supercluster) {
      debugWarn('Supercluster missing - include the library')
      return
    }

    try {
      state.superIndex = new Supercluster({ radius: 80, maxZoom: 16 })
      const __mapTiming_indexStart =
        typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()
      state.superIndex.load(features)
      const __mapTiming_indexEnd =
        typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()
      state._lastFeaturesFingerprint = featuresFingerprint
      // Silent timing: use debugLog to avoid noisy console output in production
      debugLog(
        'MapTiming: indexBuild',
        Math.round(__mapTiming_indexEnd - __mapTiming_indexStart),
        'ms'
      )
    } catch (e) {
      debugWarn('Supercluster load failed', e)
      return
    }
  } else {
    debugLog('Map: reusing existing superIndex')
  }

  // Render clusters for current viewport — do a marker diff to avoid DOM churn
  if (!state.clusterLayer) state.clusterLayer = L.layerGroup().addTo(state.mapInstance)

  const bounds = state.mapInstance.getBounds()
  const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
  const zoom = Math.round(state.mapInstance.getZoom())
  const __mapTiming_getClustersStart =
    typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()
  const clusters = state.superIndex.getClusters(bbox, zoom)
  const __mapTiming_getClustersEnd =
    typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()

  // Prepare grouping for identical-coordinate single-point features so we can
  // apply tiny offsets when clusters dissolve. Key by rounded coords to 6
  // decimals (â‰ˆ10cm precision) to group exact matches.
  const coordGroups = new Map()
  clusters.forEach((c) => {
    try {
      if (!c || !c.geometry || !c.geometry.coordinates) return
      if (c.properties && c.properties.cluster) return
      const [lng, lat] = c.geometry.coordinates
      const key = `${lat.toFixed(6)}:${lng.toFixed(6)}`
      const arr = coordGroups.get(key) || []
      arr.push(c)
      coordGroups.set(key, arr)
    } catch (e) {
      /* ignore grouping errors */
    }
  })

  const newIds = new Set()
  // Track coord-group stacked markers created during this fast pass so we
  // don't create duplicates when multiple clusters reference the same coords.
  const coordGroupIndexes = new Set()

  // Prune any stale non-cluster markers for managed layers so we don't show
  // duplicate raw points alongside Supercluster markers. Keep protected/ferry markers.
  try {
    const managedLayers = new Set(['alert', 'weather', 'counter', 'camera', 'seaQuality'])
    state.clusterMarkers.forEach((marker, mid) => {
      try {
        if (!marker) return
        if (marker._isFerry || marker._doNotRemove) return
        // only consider point ids (format: point:<layer>:...)
        if (!mid || !mid.startsWith('point:')) return
        const parts = mid.split(':')
        const layerName = parts[1]
        if (!managedLayers.has(layerName)) return
        // If marker is not managed by cluster system, remove it so Supercluster can own it
        if (!marker._isClusterized) {
          try {
            state.clusterLayer.removeLayer(marker)
          } catch (e) { }
          state.clusterMarkers.delete(mid)
        }
      } catch (e) {
        /* ignore */
      }
    })
  } catch (e) {
    /* ignore prune errors */
  }

  clusters.forEach((c) => {
    const [lng, lat] = c.geometry.coordinates
    if (c.properties && c.properties.cluster) {
      const clusterId = c.properties.cluster_id
      const count = c.properties.point_count || 0
      const id = `cluster:${clusterId}`
      newIds.add(id)

      const size = count < 10 ? 'small' : count < 100 ? 'medium' : 'large'
      const html = `<div class="cluster-icon ${size}"><span>${count}</span></div>`
      const icon = L.divIcon({ className: 'custom-cluster', html, iconSize: [40, 40] })

      const existing = state.clusterMarkers.get(id)
      if (existing) {
        // Only touch cluster-managed markers
        if (existing._isClusterized) {
          existing.setLatLng([lat, lng])
          existing.setIcon(icon)
          // Ensure click handler on reused cluster marker will spiderfy/zoom appropriately
          try {
            if (!existing._clusterClickBound || existing._clusterClickBound !== clusterId) {
              existing.off && existing.off('click')
              existing.on &&
                existing.on('click', () => {
                  try {
                    clearSpiderfiedClusters()
                  } catch (e) { }
                  const leaves = state.superIndex.getLeaves(clusterId, 200) || []
                  if (leaves.length > 60) {
                    const expansion = state.superIndex.getClusterExpansionZoom(clusterId)
                    state.mapInstance.setView([lat, lng], expansion)
                  } else {
                    spiderfyCluster(clusterId, lat, lng, leaves)
                  }
                })
              existing._clusterClickBound = clusterId
            }
          } catch (e) { }
        }
      } else {
        const marker = createMarkerSafe(lat, lng, {
          icon,
          title: `${count} lokacija`,
          alt: `${count} lokacija`,
        })
        if (marker) {
          marker.on('click', () => {
            try {
              // Prefer spiderfying for medium-sized clusters to let users pick individual items.
              // If cluster is very large, fall back to zoom expansion.
              try {
                clearSpiderfiedClusters()
              } catch (e) { }
              const leaves = state.superIndex.getLeaves(clusterId, 200) || []
              if (leaves.length > 60) {
                const expansion = state.superIndex.getClusterExpansionZoom(clusterId)
                state.mapInstance.setView([lat, lng], expansion)
              } else {
                spiderfyCluster(clusterId, lat, lng, leaves)
              }
            } catch (err) {
              try {
                const expansion = state.superIndex.getClusterExpansionZoom(clusterId)
                state.mapInstance.setView([lat, lng], expansion)
              } catch (e) {
                state.mapInstance.setView([lat, lng], Math.min(zoom + 2, 18))
              }
            }
          })
          marker.addTo(state.clusterLayer)
          // accessibility
          const el = marker.getElement && marker.getElement()
          if (el) {
            el.setAttribute('role', 'button')
            el.setAttribute('aria-label', `${count} lokacija`)
            el.tabIndex = 0
            el.addEventListener('keydown', (ev) => {
              if (ev.key === 'Enter') marker.fire('click')
            })
          }
          marker._isClusterized = true
          state.clusterMarkers.set(id, marker)
        }
      }
    } else {
      const props = c.properties || {}
      // Build a stable id for single features
      const pid = props.id || `${props.layer}:${lng}:${lat}`
      const id = `point:${props.layer || 'p'}:${pid}`
      newIds.add(id)

      const icon = L.divIcon({
        className: props.iconClass || '',
        html: props.iconHtml || '',
        iconSize: props.iconSize || [30, 30],
      })

      // Check for identical-coordinate groups FIRST, before checking existing markers
      // This ensures stacked markers are created even if one camera already has a marker
      try {
        const key = `${lat.toFixed(6)}:${lng.toFixed(6)}`
        const group = coordGroups.get(key)
        if (group && group.length > 1) {
          // If group consists solely of cameras, create a single stacked marker
          const allCameras = group.every((leaf) => {
            const p = leaf.properties || {}
            return p.layer === 'camera' || p.layer === 'cameras' || p.layer === 'camera_feed'
          })
          if (allCameras) {
            const groupId = `group:${key}`
            // Check if stacked marker already exists
            const existingStacked = state.clusterMarkers.get(groupId)
            if (existingStacked) {
              // Stacked marker exists, just mark it as still needed
              newIds.add(groupId)
              coordGroupIndexes.add(key)
              return // Skip creating individual marker
            }
            // Only create one stacked marker per key
            if (!coordGroupIndexes.has(key)) {
              coordGroupIndexes.add(key)
              // Remove any existing individual markers at this location
              group.forEach((leaf) => {
                const lp = leaf.properties || {}
                const lpid =
                  lp.id ||
                  `${lp.layer}:${leaf.geometry.coordinates[0]}:${leaf.geometry.coordinates[1]}`
                const lid = `point:${lp.layer || 'p'}:${lpid}`
                const existingIndividual = state.clusterMarkers.get(lid)
                if (existingIndividual) {
                  try {
                    state.clusterLayer.removeLayer(existingIndividual)
                  } catch (e) { }
                  state.clusterMarkers.delete(lid)
                }
              })
              // Create stacked marker using centralized helper so popup buttons are wired
              const m = createStackedMarker(key, group, lat, lng)
              if (m) {
                newIds.add(groupId)
              }
            }
            // Skip creating the individual point marker
            return
          }
        }
      } catch (e) {
        /* ignore grouping errors */
      }

      const existing = state.clusterMarkers.get(id)
      if (existing) {
        if (existing._isClusterized) {
          existing.setLatLng([lat, lng])
          existing.setIcon(icon)
        }
      } else {
        // Prevent cluster code from creating a separate marker at/near the ferry position.
        try {
          const ferryLatLng =
            state.ferryMarker &&
            (state.ferryMarker.getLatLng
              ? state.ferryMarker.getLatLng()
              : state.ferryMarker._latlng)
          const eps = 0.0005
          if (
            ferryLatLng &&
            Math.max(Math.abs(lat - ferryLatLng.lat), Math.abs(lng - ferryLatLng.lng)) <= eps
          ) {
            logProximitySkip({ reason: 'cluster-marker', id, lat, lng })
            return
          }
        } catch (e) {
          /* ignore */
        }

        const marker = createMarkerSafe(lat, lng, { icon, title: props.layer || 'lokacija' })
        if (marker) {
          marker.bindPopup(props.popup || '').addTo(state.clusterLayer)
          const el = marker.getElement && marker.getElement()
          if (el) {
            el.setAttribute('role', 'button')
            el.setAttribute('aria-label', props.layer || 'lokacija')
            el.tabIndex = 0
            el.addEventListener('keydown', (ev) => {
              if (ev.key === 'Enter') marker.fire('click')
            })
          }
          marker._isClusterized = true
          state.clusterMarkers.set(id, marker)
        }
      }
    }
  })

  // Remove markers that are no longer present
  state.clusterMarkers.forEach((marker, id) => {
    if (!newIds.has(id)) {
      // Only remove markers that we manage as cluster markers
      if (marker._isClusterized) {
        try {
          state.clusterLayer.removeLayer(marker)
        } catch (e) {
          /* ignore */
        }
        state.clusterMarkers.delete(id)
      }
    }
  })

  // Final dedupe pass: if we've created grouped stacked markers, remove any
  // stray individual markers that sit at the same coordinates (tiny epsilon).
  try {
    const EPS = 1e-6
    Array.from(state.clusterMarkers.entries()).forEach(([gid, gm]) => {
      try {
        if (!gid || !gid.startsWith('group:')) return
        if (!gm) return
        const gLatLng = gm._latlng || (gm.getLatLng && gm.getLatLng && gm.getLatLng())
        if (!gLatLng) return
        state.clusterMarkers.forEach((other, oid) => {
          try {
            if (!other || !oid) return
            if (oid === gid) return
            if (other._isFerry || other._doNotRemove) return
            // Keep other grouped markers
            if (oid.startsWith('group:')) return
            const oLatLng =
              other._latlng || (other.getLatLng && other.getLatLng && other.getLatLng())
            if (!oLatLng) return
            if (
              Math.max(Math.abs(oLatLng.lat - gLatLng.lat), Math.abs(oLatLng.lng - gLatLng.lng)) <=
              EPS
            ) {
              try {
                state.clusterLayer.removeLayer(other)
              } catch (e) { }
              state.clusterMarkers.delete(oid)
            }
          } catch (e) {
            /* ignore inner */
          }
        })
      } catch (e) {
        /* ignore per-group */
      }
    })
  } catch (e) {
    /* ignore dedupe errors */
  }

  const __mapTiming_end =
    typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()
  // Emit timing log (always visible) — helpful for debugging in browsers with tricky consoles
  try {
    // Silent timing: send to debugLog so it only appears when debugging is enabled
    debugLog(
      'MapTiming:',
      'getClusters=',
      Math.round(__mapTiming_getClustersEnd - __mapTiming_getClustersStart) + 'ms',
      'render=',
      Math.round(__mapTiming_end - __mapTiming_getClustersEnd) + 'ms',
      'total=',
      Math.round(__mapTiming_end - __mapTiming_start) + 'ms'
    )
  } catch (e) {
    /* ignore logging errors */
  }
  // Ensure ferry integrity after a full visualization pass to catch any markers
  // created during rendering paths that slipped past guarded creation sites.
  try {
    enforceFerryIntegrity(0.0006)
  } catch (e) {
    /* ignore */
  }
}

// Debounced map update handler to avoid thrashing Supercluster while panning/zooming
function attachClusterUpdateHandlers() {
  if (!state.mapInstance) return
  if (state._clusterHandlersAttached) {
    debugLog('Map: cluster handlers already attached')
    return
  }
  // Track interacting state to avoid updating ferry marker during aggressive panning/zooming
  state._mapInteracting = false

  // Short, responsive handler while the user is interacting (fires during move)
  const interactiveHandler = debounce(() => {
    try {
      // Fast path: if we have an index, just update clusters for viewport
      if (state.superIndex) updateClustersForViewport()
      else updateMapVisualization()
    } catch (e) {
      debugWarn('Map: interactive cluster refresh failed', e)
    }
  }, 50)

  // Final handler after interaction settles (ensure any needed rebuilds occur)
  const finalHandler = debounce(() => {
    try {
      updateMapVisualization()
    } catch (e) {
      debugWarn('Map: final cluster refresh failed', e)
    }
  }, 200)

  // Attach listeners: 'move' is more responsive but fires frequently; 'moveend' ensures final state
  state.mapInstance.on('movestart', () => {
    state._mapInteracting = true
    try {
      clearSpiderfiedClusters()
    } catch (e) { }
  })
  // Also mark interacting on zoomstart so we don't update marker positions while
  // Leaflet is performing zoom animations. Without this, setLatLng calls during
  // zoom can cause the ferry marker to visibly jump across the map.
  state.mapInstance.on('zoomstart', () => {
    state._mapInteracting = true
    try {
      clearSpiderfiedClusters()
    } catch (e) { }
  })
  // Hide the ferry marker during zoom so it doesn't visibly interpolate across the map.
  // We will force-snap it into place on zoomend.
  state.mapInstance.on('zoomstart', () => {
    try {
      const fm = state.ferryMarker
      if (fm && fm.getElement) {
        const el = fm.getElement()
        if (el) (el.style.transition = 'none'), (el.style.opacity = '0')
      }
    } catch (err) {
      /* ignore */
    }
  })
  state.mapInstance.on('move', interactiveHandler)
  state.mapInstance.on('zoom', interactiveHandler)
  state.mapInstance.on('moveend', () => {
    state._mapInteracting = false
    try {
      finalHandler()
      // Force a ferry tick to snap to the latest position after interaction
      if (state._ferryUpdateFn) state._ferryUpdateFn()
    } catch (e) { }
  })
  state.mapInstance.on('zoomend', () => {
    state._mapInteracting = false
    try {
      finalHandler()
      if (state._ferryUpdateFn) state._ferryUpdateFn()
    } catch (e) { }
  })

  // On zoomend, ensure ferry is visible and snapped to its correct position.
  state.mapInstance.on('zoomend', () => {
    try {
      // Force a ferry tick to snap to the latest position after zoom
      if (state._ferryUpdateFn) state._ferryUpdateFn(true)
      const fm = state.ferryMarker
      if (fm && fm.getElement) {
        const el = fm.getElement()
        if (el) el.style.opacity = '1'
      }
    } catch (err) {
      /* ignore */
    }
  })

  state._clusterHandlersAttached = true
  debugLog('Map: cluster handlers attached (interactive + final)')
}

// Fast viewport-only cluster update (assumes state.superIndex exists)
function updateClustersForViewport() {
  if (!state.mapInstance || !state.superIndex) return
  // reuse existing clusterLayer and perform marker diff similar to full update
  if (!state.clusterLayer) state.clusterLayer = L.layerGroup().addTo(state.mapInstance)

  const bounds = state.mapInstance.getBounds()
  const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
  const zoom = Math.round(state.mapInstance.getZoom())
  const clusters = state.superIndex.getClusters(bbox, zoom)

  const newIds = new Set()
  const coordGroupIndexes = new Set() // Track which coord groups we've processed

  clusters.forEach((c) => {
    const [lng, lat] = c.geometry.coordinates
    if (c.properties && c.properties.cluster) {
      const clusterId = c.properties.cluster_id
      const count = c.properties.point_count || 0
      const id = `cluster:${clusterId}`
      newIds.add(id)

      const size = count < 10 ? 'small' : count < 100 ? 'medium' : 'large'
      const html = `<div class="cluster-icon ${size}"><span>${count}</span></div>`
      const icon = L.divIcon({ className: 'custom-cluster', html, iconSize: [40, 40] })

      const existing = state.clusterMarkers.get(id)
      if (existing) {
        // never overwrite ferry markers or other non-cluster-managed markers
        if (existing._isFerry) return
        if (existing._isClusterized) {
          existing.setLatLng([lat, lng])
          // only update icon when count changed (cheaper than always setIcon)
          const prevHtml = existing._lastClusterHtml
          if (prevHtml !== html) {
            existing.setIcon(icon)
            existing._lastClusterHtml = html
          }
          // Ensure click handler is present on reused cluster markers
          try {
            if (!existing._clusterClickBound || existing._clusterClickBound !== clusterId) {
              existing.off && existing.off('click')
              existing.on &&
                existing.on('click', () => {
                  try {
                    clearSpiderfiedClusters()
                  } catch (e) { }
                  const leaves = state.superIndex.getLeaves(clusterId, 200) || []
                  if (leaves.length > 60) {
                    const expansion = state.superIndex.getClusterExpansionZoom(clusterId)
                    state.mapInstance.setView([lat, lng], expansion)
                  } else {
                    spiderfyCluster(clusterId, lat, lng, leaves)
                  }
                })
              existing._clusterClickBound = clusterId
            }
          } catch (e) { }
        }
      } else {
        // Prevent creation of cluster marker that would overlap the ferry
        try {
          const ferryLatLng =
            state.ferryMarker &&
            (state.ferryMarker.getLatLng
              ? state.ferryMarker.getLatLng()
              : state.ferryMarker._latlng)
          const eps = 0.0005
          if (
            ferryLatLng &&
            Math.max(Math.abs(lat - ferryLatLng.lat), Math.abs(lng - ferryLatLng.lng)) <= eps
          ) {
            debugWarn &&
              debugWarn('Map: skipping creation of cluster marker (cluster) near ferry', {
                id,
                lat,
                lng,
              })
            logProximitySkip({ reason: 'cluster-cluster', id, lat, lng })
            return
          }
        } catch (e) { }

        const marker = createMarkerSafe(lat, lng, {
          icon,
          title: `${count} lokacija`,
          alt: `${count} lokacija`,
        })
        if (marker) {
          marker.on('click', () => {
            try {
              // Mirror behavior from full update: spiderfy for small/medium clusters,
              // otherwise zoom to expansion. Use clearSpiderfiedClusters to remove
              // any previously spiderfied markers.
              try {
                clearSpiderfiedClusters()
              } catch (e) { }
              const leaves = state.superIndex.getLeaves(clusterId, 200) || []
              if (leaves.length > 60) {
                const expansion = state.superIndex.getClusterExpansionZoom(clusterId)
                state.mapInstance.setView([lat, lng], expansion)
              } else {
                spiderfyCluster(clusterId, lat, lng, leaves)
              }
            } catch (err) {
              try {
                const expansion = state.superIndex.getClusterExpansionZoom(clusterId)
                state.mapInstance.setView([lat, lng], expansion)
              } catch (e) {
                state.mapInstance.setView([lat, lng], Math.min(zoom + 2, 18))
              }
            }
          })
          marker.addTo(state.clusterLayer)
          // Mark this marker as managed by the clustering system so cleanup
          // and pruning logic can correctly identify cluster-owned markers.
          marker._isClusterized = true
          state.clusterMarkers.set(id, marker)
          marker._lastClusterHtml = html
        }
      }
    } else {
      const props = c.properties || {}
      const pid = props.id || `${props.layer}:${lng}:${lat}`
      const id = `point:${props.layer || 'p'}:${pid}`

      // Determine identical-coordinate grouping first (use rounded 6-decimal key)
      try {
        const key = `${lat.toFixed(6)}:${lng.toFixed(6)}`
        // gather same-key entries in this viewport (cheap linear scan)
        const group = clusters.filter((cc) => {
          try {
            if (!cc || !cc.geometry || (cc.properties && cc.properties.cluster)) return false
            const [clng, clat] = cc.geometry.coordinates
            return `${clat.toFixed(6)}:${clng.toFixed(6)}` === key
          } catch (e) {
            return false
          }
        })

        if (group && group.length > 1) {
          const allCameras = group.every((leaf) => {
            const p = leaf.properties || {}
            return p.layer === 'camera' || p.layer === 'cameras' || p.layer === 'camera_feed'
          })
          if (allCameras) {
            const groupId = `group:${key}`
            // Check if stacked marker already exists
            const existingStacked = state.clusterMarkers.get(groupId)
            if (existingStacked) {
              // Stacked marker exists, just mark it as still needed
              newIds.add(groupId)
              coordGroupIndexes.add(key)
              return // Skip creating individual marker
            }
            // Only create one stacked marker per key during this pass
            if (!coordGroupIndexes.has(key)) {
              coordGroupIndexes.add(key)
              // Remove any existing individual markers at this location
              group.forEach((leaf) => {
                const lp = leaf.properties || {}
                const lpid =
                  lp.id ||
                  `${lp.layer}:${leaf.geometry.coordinates[0]}:${leaf.geometry.coordinates[1]}`
                const lid = `point:${lp.layer || 'p'}:${lpid}`
                const existingIndividual = state.clusterMarkers.get(lid)
                if (existingIndividual) {
                  try {
                    state.clusterLayer.removeLayer(existingIndividual)
                  } catch (e) { }
                  state.clusterMarkers.delete(lid)
                }
              })
              const m = createStackedMarker(key, group, lat, lng)
              if (m) newIds.add(groupId)
            } else {
              newIds.add(groupId)
            }
            // Skip creating the individual point marker
            return
          }
        }
      } catch (e) {
        /* ignore grouping errors */
      }

      // Not grouped -> create point marker and register id
      newIds.add(id)

      const icon = L.divIcon({
        className: props.iconClass || '',
        html: props.iconHtml || '',
        iconSize: props.iconSize || [30, 30],
      })
      const existing = state.clusterMarkers.get(id)
      if (existing) {
        if (existing._isFerry) return
        if (existing._isClusterized) existing.setLatLng([lat, lng])
      } else {
        // Prevent creation of point marker that would overlap the ferry
        try {
          const ferryLatLng =
            state.ferryMarker &&
            (state.ferryMarker.getLatLng
              ? state.ferryMarker.getLatLng()
              : state.ferryMarker._latlng)
          const eps = 0.0005
          if (
            ferryLatLng &&
            Math.max(Math.abs(lat - ferryLatLng.lat), Math.abs(lng - ferryLatLng.lng)) <= eps
          ) {
            debugWarn &&
              debugWarn('Map: skipping creation of cluster-managed point near ferry', {
                id,
                lat,
                lng,
              })
            logProximitySkip({ reason: 'cluster-point', id, lat, lng })
            return
          }
        } catch (e) { }

        const marker = createMarkerSafe(lat, lng, { icon, title: props.layer || 'lokacija' })
        if (marker) {
          marker.bindPopup(props.popup || '').addTo(state.clusterLayer)
          // Flag point markers created from Supercluster as cluster-managed
          // so they will be removed/updated by the cluster diff routine.
          marker._isClusterized = true
          state.clusterMarkers.set(id, marker)
        }
      }
    }
  })

  // Remove obsolete markers (only those we manage)
  state.clusterMarkers.forEach((marker, id) => {
    if (!newIds.has(id)) {
      if (marker._isClusterized && !marker._isFerry) {
        try {
          state.clusterLayer.removeLayer(marker)
        } catch (e) { }
        state.clusterMarkers.delete(id)
      }
    }
  })
}

// Ensure clusters refresh when lazy-loaded datasets complete
/* eslint-disable no-func-assign */
const originalLoadCoastalData = loadCoastalData
loadCoastalData = async function () {
  const res = await originalLoadCoastalData.apply(this, arguments)
  try {
    updateMapVisualization()
  } catch (e) {
    debugWarn('Map: failed to refresh after coastal load', e)
  }
  return res
}

const originalLoadGlobalData = loadGlobalData
loadGlobalData = async function () {
  const res = await originalLoadGlobalData.apply(this, arguments)
  try {
    updateMapVisualization()
  } catch (e) {
    debugWarn('Map: failed to refresh after global load', e)
  }
  return res
}
/* eslint-enable no-func-assign */
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
        state.coastalCameras = NPT_COASTAL.cameras
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
      state.coastalCameras = data.cameras
      updateMapVisualization()
    }
  } catch (e) {
    debugWarn('Map: Fetch failed, trying local Coastal JS fallback...', e)
    try {
      await loadScript('data/traffic-coastal.js')
      if (typeof NPT_COASTAL !== 'undefined') {
        state.coastalWeather = NPT_COASTAL.weather
        state.coastalCounters = NPT_COASTAL.counters
        state.coastalCameras = NPT_COASTAL.cameras
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
      state.globalCameras = data.cameras
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
    // If real AIS data is available, use it instead of simulation
    if (window.aisStreamClient && window.aisStreamClient.getLatestData()) {
      const aisData = window.aisStreamClient.getLatestData()
      if (aisData && aisData.latitude && aisData.longitude) {
        try {
          marker.setLatLng([aisData.latitude, aisData.longitude])
        } catch (e) {
          /* ignore */
        }
        return // Skip simulation update
      }
    }

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
                              ⚠️ LINIJA U PREKIDU
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

    // Resolve the live ferry marker each tick to avoid updating stale/removed instances.
    const resolveLiveFerry = () => {
      if (state.ferryMarker && state.ferryMarker._map) return state.ferryMarker
      if (marker && marker._map) return marker
      // As a last resort, search the ferry layer for a flagged marker
      if (state.layers && state.layers.ferry) {
        try {
          return state.layers.ferry.getLayers().find((l) => l && l._isFerry)
        } catch (e) {
          // ignore
        }
      }
      return null
    }

    const activeFerry = resolveLiveFerry()
    if (activeFerry && activeFerry._map) {
      // Consolidate duplicates: ensure there is only one ferry marker on the map.
      try {
        // Update canonical reference
        state.ferryMarker = activeFerry

        // Collect candidates from ferry layer and cluster layer (in case of accidental placement)
        const candidates = []
        try {
          if (state.layers && state.layers.ferry) candidates.push(...state.layers.ferry.getLayers())
        } catch (e) { }
        try {
          if (state.clusterLayer) candidates.push(...state.clusterLayer.getLayers())
        } catch (e) { }

        // Aggressive runtime diagnostic: if multiple markers exist within eps of
        // the active ferry, emit an unconditional console warning (throttled)
        // so we can capture details even when normal debug logs are disabled.
        try {
          const ferryLatlng =
            activeFerry._latlng || (activeFerry.getLatLng && activeFerry.getLatLng())
          const eps = 0.0005
          const nearby = candidates
            .filter((c) => c && (c._latlng || (c.getLatLng && c.getLatLng())))
            .map((c) => ({
              layer: c,
              latlng: c._latlng || (c.getLatLng && c.getLatLng()),
              id: c._leaflet_id,
              flags: {
                isFerry: !!c._isFerry,
                isAis: !!c._isAis,
                isClusterized: !!c._isClusterized,
                doNotRemove: !!c._doNotRemove,
              },
            }))
            .filter((c) => {
              if (!c.latlng || !ferryLatlng) return false
              return (
                Math.max(
                  Math.abs(c.latlng.lat - ferryLatlng.lat),
                  Math.abs(c.latlng.lng - ferryLatlng.lng)
                ) <= eps
              )
            })

          if (nearby.length > 1) {
            const nowTs = Date.now()
            const last = state._lastProxLog || 0
            // throttle to once every 5s to avoid spam
            if (nowTs - last > 5000) {
              state._lastProxLog = nowTs
              try {
                debugWarn &&
                  debugWarn(
                    'FERRY DEBUG: multiple nearby markers detected',
                    nearby.map((n) => ({ id: n.id, latlng: n.latlng, flags: n.flags }))
                  )
                debugWarn && debugWarn(new Error('FERRY DEBUG stack').stack)
              } catch (e) {
                /* ignore */
              }
            }
          }
        } catch (e) {
          /* ignore diagnostics errors */
        }

        const approxEq = (a, b, eps = 0.0005) => {
          if (!a || !b) return false
          const la = a.lat ?? a._lat ?? a._latlng?.lat
          const ln = a.lng ?? a._lng ?? a._latlng?.lng
          const ra = b.lat ?? b._lat ?? b._latlng?.lat
          const rn = b.lng ?? b._lng ?? b._latlng?.lng
          if (la == null || ln == null || ra == null || rn == null) return false
          return Math.max(Math.abs(la - ra), Math.abs(ln - rn)) <= eps
        }

        // Helper that respects marker protection flags and attempts a safe removal
        const safeTryRemove = (cand) => {
          if (!cand) return
          // If marker explicitly protected, prefer using its originalRemove (if available)
          if (cand._doNotRemove) {
            if (typeof cand._originalRemove === 'function') {
              try {
                // Some markers override remove(); use a force flag so their wrapper allows deletion
                cand._forceRemove = true
                cand._originalRemove()
                cand._forceRemove = false
                return
              } catch (err) {
                cand._forceRemove = false
                debugWarn &&
                  debugWarn('Ferry: failed to force-remove protected marker', cand._leaflet_id, err)
                return
              }
            }
            // No original remover available — skip and warn
            debugWarn && debugWarn('Ferry: protected marker; skipping remove', cand._leaflet_id)
            return
          }

          try {
            cand.remove()
          } catch (e) {
            debugWarn && debugWarn('Ferry: failed to remove duplicate', e)
          }
        }

        candidates.forEach((cand) => {
          if (!cand) return
          if (cand === activeFerry) return

          // If candidate explicitly marked as ferry, attempt safe removal (will respect protection)
          if (cand._isFerry) {
            debugLog && debugLog('Ferry: removing duplicate marker', cand._leaflet_id, cand._latlng)
            safeTryRemove(cand)
            return
          }

          // If it's extremely close to the active ferry position, assume it's an accidental duplicate and remove safely
          try {
            if (
              activeFerry &&
              approxEq(
                cand._latlng || (cand.getLatLng && cand.getLatLng && cand.getLatLng()),
                activeFerry._latlng ||
                (activeFerry.getLatLng && activeFerry.getLatLng && activeFerry.getLatLng())
              )
            ) {
              try {
                debugWarn &&
                  debugWarn('Ferry: removing nearby non-flagged duplicate marker', {
                    id: cand._leaflet_id,
                    latlng: cand._latlng || (cand.getLatLng && cand.getLatLng()),
                  })
                safeTryRemove(cand)
              } catch (e) {
                debugWarn && debugWarn('Ferry: failed to remove nearby duplicate', e)
              }
            }
          } catch (e) {
            /* ignore */
          }
        })

        try {
          // Avoid updating marker position while the user is interacting with the map
          // (panning/zooming). Leaflet applies transforms during interaction which can
          // conflict with manual setLatLng calls and cause visible jumps. We defer
          // updates until the map settles; a final snap is triggered on moveend/zoomend
          // via state._ferryUpdateFn().
          if (state._mapInteracting) {
            debugLog && debugLog('Ferry: deferring setLatLng during map interaction')
          } else {
            activeFerry.setLatLng([lat, lng])
          }
        } catch (e) {
          debugWarn('Ferry: failed to setLatLng on activeFerry', e)
        }
      } catch (e) {
        debugWarn('Ferry: failed to update position', e)
      }
    } else {
      debugWarn('Ferry simulation: no live ferry marker found this tick, skipping position update')
    }

    // --- AIS "GHOST" POSITION ---
    let activeAis
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

      // Resolve live AIS marker each tick (may be recreated by map updates)
      const resolveLiveAis = () => {
        if (state.aisMarker && state.aisMarker._map) return state.aisMarker
        if (aisMarker && aisMarker._map) return aisMarker
        if (state.layers && state.layers.ferry) {
          try {
            return state.layers.ferry.getLayers().find((l) => l && l._isAis)
          } catch (e) {
            // ignore
          }
        }
        return null
      }

      activeAis = resolveLiveAis()
      if (activeAis && activeAis._map) {
        try {
          // Mirror ferry deferral for the AIS ghost marker as well to avoid
          // conflicting DOM transforms during map interaction.
          if (state._mapInteracting) {
            debugLog && debugLog('AIS: deferring setLatLng during map interaction')
          } else {
            activeAis.setLatLng([aisLat, aisLng])
          }
        } catch (e) {
          debugWarn('AIS: failed to setLatLng on activeAis', e)
        }
      } else {
        debugWarn('Ferry simulation: no live AIS marker found this tick, skipping AIS update')
      }
    }

    // Temporary debug logs (controlled by CONFIG.debug via debugLog)
    /*debugLog('ferry tick', {
      leafId: activeFerry ? activeFerry._leaflet_id : null,
      latlng: activeFerry ? activeFerry._latlng : null,
      onMap: !!(activeFerry && activeFerry._map),
      usingStateRef: state.ferryMarker === activeFerry,
    })
    debugLog('ais tick', {
      leafId: activeAis ? activeAis._leaflet_id : null,
      latlng: activeAis ? activeAis._latlng : null,
      onMap: !!(activeAis && activeAis._map),
      usingStateRef: state.aisMarker === activeAis,
    })*/

    // Detect large jumps (possible stale instance being updated elsewhere)
    try {
      if (activeFerry && activeFerry._latlng) {
        const prev = activeFerry._latlng
        const approxDelta = Math.max(
          Math.abs((prev.lat || 0) - lat),
          Math.abs((prev.lng || 0) - lng)
        )
        // If position change > ~0.01 degrees (~1km) in one tick, warn
        if (approxDelta > 0.01) {
          debugWarn('Ferry large jump detected', { prev: prev, target: [lat, lng], approxDelta })
        }
      }
    } catch (e) {
      // ignore diagnostics errors
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

    // Build the status HTML
    let aisDataHtml = ''
    if (window.aisStreamClient && window.aisStreamClient.getLatestData()) {
      const aisData = window.aisStreamClient.getLatestData()
      if (aisData && aisData.latitude) {
        aisDataHtml = `
          <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(59, 130, 246, 0.1); border: 1px solid var(--accent); border-radius: 0.5rem;">
            <div style="font-weight: bold; color: var(--accent); margin-bottom: 0.5rem;">🟢 LIVE AIS</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem; font-size: 0.8rem;">
              <div>Brzina: <strong>${aisData.speed?.toFixed(1) || '—'} kn</strong></div>
              <div>Kurs: <strong>${aisData.course?.toFixed(0) || '—'}°</strong></div>
              <div>Status: <strong>${aisData.status || '—'}</strong></div>
              <div>Heading: <strong>${aisData.heading?.toFixed(0) || '—'}°</strong></div>
            </div>
          </div>
        `
      }
    }

    const statusHtml = `
                <div style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <div class="pulse-dot" style="background: ${aisOffsetMins >= 5
        ? 'var(--error)'
        : aisOffsetMins >= 1
          ? 'var(--warning)'
          : 'var(--success)'
      }"></div>
                    <div style="font-weight:bold; color: var(--text-main); font-size: 1rem;">
                        AIS: ${escapeHtml(aisStatusMsg)}
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; font-size: 0.85rem;">
                    <div>
                        <div style="color: var(--primary); font-weight: 700; border-bottom: 1px solid var(--border); margin-bottom: 0.5rem; padding-bottom: 0.2rem;">MIŠNJAK →</div>
                        <div style="opacity: 0.6; text-decoration: line-through;">Zadnji: ${depMisnjak.last
      }</div>
                        <div style="font-weight: bold; margin: 0.2rem 0; font-size: 1rem;">Sljedeći: ${depMisnjak.next
      }</div>
                        <div style="opacity: 0.8;">Nakon toga: ${depMisnjak.after}</div>
                    </div>
                    <div>
                        <div style="color: var(--primary); font-weight: 700; border-bottom: 1px solid var(--border); margin-bottom: 0.5rem; padding-bottom: 0.2rem;">STINICA →</div>
                        <div style="opacity: 0.6; text-decoration: line-through;">Zadnji: ${depStinica.last
      }</div>
                        <div style="font-weight: bold; margin: 0.2rem 0; font-size: 1rem;">Sljedeći: ${depStinica.next
      }</div>
                        <div style="opacity: 0.8;">Nakon toga: ${depStinica.after}</div>
                    </div>
                </div>
                
                ${aisDataHtml}
                
                <div style="margin-top: 1rem; font-size: 0.75rem; color: var(--text-muted); font-style: italic;">
                    * AIS podaci uživo. Osvježeno: ${now.toLocaleTimeString('hr-HR')}
                </div>
            `

    // Update Sidebar Widget (always exists in DOM if widget is present)
    const sidebarWidget = document.getElementById('ferry-status-v2')
    if (sidebarWidget) {
      sidebarWidget.innerHTML = statusHtml
    }

    // Update Map Marker Popup
    // We reconstruct the full popup layout to ensure it's always complete
    if (marker) {
      const fullPopupContent = `
       <div class="popup-header">
         <div class="popup-header-icon popup-header-icon--ferry">
           <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
             <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
             <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/>
             <path d="M12 10v4"/><path d="M12 2v3"/>
           </svg>
         </div>
         <div class="popup-header-text">
           <h3 class="popup-title">Trajekt Rapska Plovidba</h3>
           <span class="popup-subtitle">Linija Stinica - Mišnjak</span>
         </div>
       </div>
       <div class="popup-body">
         <div class="popup-ferry-status">
           ${statusHtml}
         </div>
       </div>
       <div class="popup-footer">
         <span class="popup-source">AIS podaci</span>
         <span class="popup-live">Praćenje uživo</span>
       </div>
      `

      // Update the popup content. If it's open, Leaflet updates the DOM immediately.
      // If closed, it updates the stored content for the next open.
      marker.setPopupContent(fullPopupContent)
    }

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
        d8StatusEl.innerHTML = `⚠️ Zatvoreno za I. skupinu`
        d8StatusEl.className = 'value val-yellow'
      } else if (aisOffsetMins >= 5) {
        d8StatusEl.innerHTML = `⚠️ Zatvoreno za I. skupinu`
        d8StatusEl.className = 'value val-yellow'
      } else {
        d8StatusEl.innerHTML = `Otvoreno za sve`
        d8StatusEl.className = 'value val-green'
      }
    }
  }

  state.ferryInterval = setInterval(update, 1000)
  update() // First run
  // Expose the update function so map handlers can force a snap-to position after interactions
  try {
    state._ferryUpdateFn = update
  } catch (e) { }
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

  // If clustering is enabled we should NOT also render the same
  // points into dedicated layer groups (would cause duplicates).
  const clusteringDisabled = CONFIG.map && CONFIG.map.enableClustering === false

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

    // Add to map (guarded)
    if (clusteringDisabled) {
      const alertMarker = createMarkerSafe(parseFloat(alert.lat), parseFloat(alert.lng), {
        icon: markerIcon,
      })
      if (alertMarker) {
        alertMarker
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
      }
    }
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

      if (clusteringDisabled) {
        const stationMarker = createMarkerSafe(lat, lng, { icon: stationIcon, zIndexOffset: -1000 }) // Put WAY behind traffic
        if (stationMarker) {
          stationMarker
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
        }
      }
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

      if (clusteringDisabled) {
        const counterMarker = createMarkerSafe(counter.lat, counter.lng, {
          icon: counterIcon,
          zIndexOffset: -2000,
        }) // Behind everything
        if (counterMarker) {
          counterMarker
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
        }
      }
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
                        ${temp != null ? `<span>🌡️ ${Math.round(temp)}°</span>` : ''}
                        ${windGust > 0 ? `<span>💨 ${Math.round(windGust)}</span>` : ''}
                    </div>
                `,
        iconSize: [80, 28],
        iconAnchor: [40, 14],
      })

      if (clusteringDisabled) {
        const islMarker = createMarkerSafe(lat, lng, { icon: islandIcon })
        if (islMarker) {
          islMarker
            .bindPopup(
              `
                    <div style="text-align: center; color: #f1f5f9; min-width: 180px;">
                        <strong style="color: #0ea5e9; font-size: 1.1rem;">🏘️ ${CONFIG.stationNames[station.id] || station.id
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
        }
      }
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

  initCameraModal()
}

let cameraRefreshInterval = null

function initCameraModal() {
  const modal = document.getElementById('camera-modal')
  if (!modal) return

  const closeBtn = document.getElementById('camera-modal-close')
  const titleEl = document.getElementById('camera-modal-title')
  const imageEl = document.getElementById('camera-modal-image')

  closeBtn?.addEventListener('click', () => closeCameraModal(modal))
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeCameraModal(modal)
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeCameraModal(modal)
  })

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-camera-url]')
    if (!btn) return

    const url = btn.dataset.cameraUrl
    const title = btn.dataset.cameraTitle

    titleEl.textContent = title
    imageEl.src = url + '?t=' + Date.now()

    openModal(modal)

    if (cameraRefreshInterval) clearInterval(cameraRefreshInterval)
    cameraRefreshInterval = setInterval(() => {
      imageEl.src = url + '?t=' + Date.now()
    }, 20000)
  })
}

function closeCameraModal(modal) {
  if (cameraRefreshInterval) {
    clearInterval(cameraRefreshInterval)
    cameraRefreshInterval = null
  }
  closeModal(modal)
}
