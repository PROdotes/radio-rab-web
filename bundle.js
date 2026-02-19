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


/**
 * Radio Rab News Portal — Demo Data
 * Realistic sample content for the island of Rab
 */

// ===========================================
// CATEGORIES & AUTHORS
// ===========================================
const CATEGORIES = ['LOKALNO', 'SPORT', 'KULTURA', 'TURIZAM', 'MORE', 'GASTRONOMIJA']

const AUTHORS = [
  'Marina Vuković',
  'Davor Petričević',
  'Ana Smokrović',
  'Ivica Barić',
  'Petra Dominković',
]

// ===========================================
// HERO ARTICLE
// ===========================================
const HERO_ARTICLE = {
  id: 0,
  category: 'LOKALNO',
  title: 'Rapska Fjera 2026: Povratak u Srednji Vijek',
  snippet:
    'Najveća kulturna manifestacija na otoku ove godine donosi rekordni program. Više od 200 sudionika, vitezovi, obrtnici i glazbenici pretvorit će Rab u živu povijesnu pozornicu od 25. do 27. srpnja.',
  aiSummary:
    'Rapska fjera ove godine slavi 20. obljetnicu. Program uključuje viteške turnire, srednjovjekovnu glazbu, sajam tradicijskih obrta i gastronomsku ponudu. Očekuje se preko 30.000 posjetitelja tijekom tri dana manifestacije.',
  image: 'https://images.unsplash.com/photo-1599930113854-d6d7fd521f10?w=1200&h=800&fit=crop',
  author: 'Marina Vuković',
  date: 'Danas',
  readTime: '5 min',
}

// ===========================================
// NEWS TEMPLATES
// ===========================================
const NEWS_TEMPLATES = {
  LOKALNO: [
    {
      title: 'Započeli radovi na novom kružnom toku kod Malog Palita',
      snippet:
        'Velika infrastrukturna investicija smanjit će gužve prema gradu. Radovi traju do svibnja.',
      body: '<p><b>GRAD RAB</b> — Jutros su službeno započeli radovi na izgradnji novog kružnog toka na raskrižju kod Malog Palita. Ovo je jedna od najznačajnijih investicija u prometnu infrastrukturu otoka u posljednjih deset godina.</p><p>Gradonačelnik je istaknuo kako će se ovim rješenjem trajno riješiti usko grlo koje nastaje tijekom turističke sezone.</p><ul><li>Trajanje radova: 120 dana</li><li>Izvođač: Građevinar d.o.o.</li><li>Regulacija prometa: Semafori</li></ul>',
      image: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&h=600&fit=crop',
      tags: ['infrastruktura', 'promet', 'palit'],
    },
    {
      title: 'Najava prekida opskrbe električnom energijom u Mundanijama',
      snippet:
        'Zbog radova na trafostanici, Mundanije će u utorak biti bez struje od 8 do 12 sati.',
      body: '<p><b>HEP OBAVIJEST</b> — Obavještavamo mještane naselja Mundanije da će zbog planiranih radova na reviziji trafostanice doći do prekida opskrbe električnom energijom.</p><div class="alert-box"><strong>Vrijeme:</strong> Utorak, 8:00 - 12:00h<br><strong>Lokacija:</strong> Srednje Mundanije i zaseok Krstini.</div><p>U slučaju nepovoljnih vremenskih prilika radovi se odgađaju.</p>',
      image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=600&fit=crop',
      tags: ['struja', 'hep', 'obavijest', 'brownout'],
    },
  ],
  SPORT: [
    {
      title: 'RK Rab: Rukometašice izborile nastup u prvoj ligi',
      snippet: 'Povijesni uspjeh rapskog sporta. Pobjedom nad Senjom osiguran plasman u elitu.',
      body: '<p>Nevjerojatna atmosfera u dvorani na Rabu! Naša ženska ekipa <b>RK Rab</b> ostvarila je san generacija. U odlučujućoj utakmici sezone pobijedile su vječnog rivala ekipu Senja rezultatom 28:24.</p><p>Ovo je prvi put u povijesti da jedan rapski dvoranski sport ulazi u najviši nacionalni rang natjecanja.</p>',
      image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&h=600&fit=crop',
      tags: ['rukomet', 'rk rab', 'uspjeh'],
    },
  ],
  KULTURA: [
    {
      title: 'Otvorena 20. jubilarna izložba u galeriji "Knežev dvor"',
      snippet: 'Svečano otvorena retrospektiva rapskih umjetnika kroz dva desetljeća.',
      body: '<p>Kulturno srce grada Raba sinoć je kucalo u ritmu povijesti. Jubilarna izložba "Dvadeset godina stvaralaštva" okupila je rekordan broj posjetitelja.</p><p>Izložba ostaje otvorena do kraja ožujka, a ulaz je besplatan za sve stanovnike otoka.</p>',
      image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&h=600&fit=crop',
      tags: ['kultura', 'izložba', 'rab'],
    },
  ],
  TURIZAM: [
    {
      title: 'Rapska plovidba: Novi trajekt "Četiri zvonika" stiže u ožujku',
      snippet: 'Moderni brod povećat će kapacitet linije Mišnjak-Stinica za 30%.',
      body: '<p>Dugo najavljivano pojačanje flote <b>Rapske plovidbe</b> konačno stiže. Novi trajekt, simbolično nazvan "Četiri zvonika", trenutno je na završnom opremanju.</p><p>Brod može primiti 110 automobila i opremljen je najmodernijim salonima za putnike u potpunosti digitaliziranim sustavom upravljanja.</p>',
      image: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800&h=600&fit=crop',
      tags: ['trajekt', 'promet', 'turizam'],
    },
  ],
  MORE: [
    {
      title: 'Povećana aktivnost dupina u Barbatskom kanalu',
      snippet: 'Znanstvenici iz Instituta Plavi svijet mole nautičare za oprez i smanjenu brzinu.',
      body: '<p>Tijekom posljednjih tjedan dana zabilježena je povećana aktivnost skupine dobrih dupina u kanalu između Raba i Dolina. Vjeruje se da se radi o majkama s mladunčadi.</p><p><b>VAŽNO OBAVIJEST:</b> Molimo nautičare da ne prilaze životinjama i da u kanalu drže minimalnu brzinu kretanja.</p>',
      image: 'https://images.unsplash.com/photo-1570481662006-a3a1374699e8?w=800&h=600&fit=crop',
      tags: ['priroda', 'dupini', 'more'],
    },
  ],
  GASTRONOMIJA: [
    {
      title: 'Rapska torta dospjela na listu "Zaboravljeni okusi Europe"',
      snippet:
        'Prestižno priznanje za našu najpoznatiju slasticu i očuvanje recepture iz 1177. godine.',
      body: '<p>Tradicija koja traje stoljećima dobila je još jedno veliko međunarodno priznanje. Europsko udruženje za očuvanje gastro-baštine uvrstilo je <b>Rapsku tortu</b> u sam vrh autentičnih slastica.</p><p>Ovo nije samo priznanje slastici, već i svim rapskim obiteljima koje čuvaju originalni recept već 850 godina.</p>',
      image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=600&fit=crop',
      tags: ['gastro', 'recept', 'tradicija'],
    },
  ],
  OSMRTNICE: [
    {
      title: 'Posljednji ispraćaj — Ivan Ivić',
      snippet: 'Preminuo u 85. godini života. Ispraćaj u srijedu na gradskom groblju.',
      body: '<div class="osmrtnica-content"><img src="https://picsum.photos/seed/obituary/400/600" alt="Osmrtnica"><p>S tugom u srcu javljamo rodbini i prijateljima da nas je napustio naš dragi otac i djed.</p></div>',
      image: 'https://picsum.photos/seed/obituary/400/600',
      tags: ['osmrtnice'],
    },
  ],
}

// ===========================================
// GENERATE ARTICLES
// ===========================================
function generateArticles() {
  const articles = []
  let id = 1

  // Generate articles from templates
  Object.entries(NEWS_TEMPLATES).forEach(([category, templates]) => {
    templates.forEach((template) => {
      const author = AUTHORS[Math.floor(Math.random() * AUTHORS.length)]
      const hoursAgo = Math.floor(Math.random() * 72) + 1

      let dateStr
      if (hoursAgo < 1) {
        dateStr = 'Upravo sada'
      } else if (hoursAgo < 24) {
        dateStr = `prije ${hoursAgo} h`
      } else {
        const days = Math.floor(hoursAgo / 24)
        dateStr = days === 1 ? 'Jučer' : `prije ${days} dana`
      }

      articles.push({
        id: id++,
        category: category,
        title: template.title,
        snippet: template.snippet,
        image: template.image,
        author: author,
        date: dateStr,
        readTime: `${Math.floor(Math.random() * 4) + 2} min`,
      })
    })
  })

  // Shuffle articles
  return articles.sort(() => Math.random() - 0.5)
}

const ALL_ARTICLES = generateArticles()

// Migration-ready static data bridges (used by UI for demos)
const MARKET_ITEMS = [
  {
    title: 'Domaće Maslinovo Ulje',
    seller: 'OPG Kaštelan',
    price: '18 €/l',
    image: 'https://picsum.photos/seed/oil/400/300',
  },
  {
    title: 'Rapska Torta',
    seller: 'Vilma Slastice',
    price: '25 €',
    image: 'https://picsum.photos/seed/cake/400/300',
  },
  {
    title: 'Med od Kadulje',
    seller: 'Pčelarstvo Krstić',
    price: '12 €',
    image: 'https://picsum.photos/seed/honey/400/300',
  },
  {
    title: 'Ovčji Sir',
    seller: 'OPG Gvačić',
    price: '30 €/kg',
    image: 'https://picsum.photos/seed/cheese/400/300',
  },
  {
    title: 'Suhe Smokve',
    seller: 'Domaća Radinost',
    price: '8 €',
    image: 'https://picsum.photos/seed/figs/400/300',
  },
  {
    title: 'Eko Povrće Košarica',
    seller: 'Vrtovi Raba',
    price: '15 €',
    image: 'https://picsum.photos/seed/veg/400/300',
  },
]

const VIDEO_ITEMS = [
  {
    title: 'Nevera pogodila luku Rab',
    duration: '0:45',
    views: '1.2k',
    image: 'https://picsum.photos/seed/storm/300/500',
  },
  {
    title: 'Svečano otvorenje Fjere',
    duration: '1:20',
    views: '3.5k',
    image: 'https://picsum.photos/seed/fjera/300/500',
  },
  {
    title: 'Novi trajekt "Otok Rab"',
    duration: '0:55',
    views: '800',
    image: 'https://picsum.photos/seed/ferry/300/500',
  },
  {
    title: 'Intervju: Gradonačelnik',
    duration: '2:15',
    views: '2.1k',
    image: 'https://picsum.photos/seed/mayor/300/500',
  },
  {
    title: 'Sportski vikend: Sažetak',
    duration: '1:05',
    views: '950',
    image: 'https://picsum.photos/seed/sport/300/500',
  },
]


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


/**
 * Radio Rab News Portal — AIS Vessel Tracking
 * Extracted from script.js
 */
/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */

// ===========================================
// VESSEL AIS DATA MODAL
// ===========================================

/**
 * Show modal with live AIS data for a vessel
 * @param {string} imo - IMO number of the vessel
 */
async function showVesselAISModal(imo) {
  const modal = document.getElementById('vessel-ais-modal')
  const content = document.getElementById('vessel-ais-content')
  const closeBtn = document.getElementById('vessel-ais-close')

  if (!modal || !content) return

  // Show modal with loading state
  modal.hidden = false
  content.innerHTML = `
    <div class="loader" style="margin: 2rem auto;"></div>
    <p style="text-align: center; color: var(--text-dim);">Učitavanje AIS podataka...</p>
  `

  // Close handler function
  const closeModal = () => {
    modal.hidden = true
  }

  // Close button handler
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation()
      closeModal()
    }
  }

  // Close on backdrop click
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeModal()
    }
  }

  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal()
      document.removeEventListener('keydown', handleEscape)
    }
  }
  document.addEventListener('keydown', handleEscape)

  // Fetch AIS data from multiple sources
  try {
    const data = await fetchVesselAISData(imo)
    displayVesselAISData(content, data)
  } catch (error) {
    content.innerHTML = `
      <div style="padding: 2rem; text-align: center;">
        <p style="color: var(--text-dim); margin-bottom: 1rem;">
          Nije moguće dohvatiti AIS podatke u ovom trenutku.
        </p>
        <p style="font-size: 0.875rem; color: var(--text-dim);">
          ${error.message || 'Greška prilikom dohvaćanja podataka'}
        </p>
        <button onclick="window.open('https://www.vesselfinder.com/vessels/details/${imo}', '_blank')"
                style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--accent); color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
          Otvori VesselFinder
        </button>
      </div>
    `
  }
}

/**
 * Fetch vessel AIS data from public APIs
 * @param {string} imo - IMO number
 * @returns {Promise<Object>} Vessel data
 */
async function fetchVesselAISData(imo) {
  // Try to get data from AISStream WebSocket if available
  if (window.aisStreamClient && window.aisStreamClient.getLatestData()) {
    const data = window.aisStreamClient.getLatestData()
    debugLog('Using live AISStream data:', data)
    return data
  }

  // Try to fetch from local proxy server (fallback)
  const proxyUrl = `http://localhost:3001/api/vessel/${imo}`

  try {
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      return data
    }
  } catch (err) {
    console.warn('Proxy server not available, using simulated data:', err)
  }

  // Fallback: Simulated live data for IMO 9822621 (Rapska Plovidba ferry)
  // This simulates what real AIS data would look like
  if (imo === '9822621') {
    // Get current ferry position from the map marker if available
    let currentLat = 44.7086
    let currentLng = 14.8647
    let estimatedSpeed = 8.5 // knots, typical ferry speed
    let course = 45 // degrees

    // Try to get actual position from the live ferry marker
    try {
      if (state.ferryMarker && state.ferryMarker.getLatLng) {
        const pos = state.ferryMarker.getLatLng()
        currentLat = pos.lat
        currentLng = pos.lng

        // Estimate course based on position (rough approximation)
        const misnjak = CONFIG.ferry.misnjakCoords
        const stinica = CONFIG.ferry.stinicaCoords
        const distToMisnjak = Math.sqrt(
          Math.pow(currentLat - misnjak[0], 2) + Math.pow(currentLng - misnjak[1], 2)
        )
        const distToStinica = Math.sqrt(
          Math.pow(currentLat - stinica[0], 2) + Math.pow(currentLng - stinica[1], 2)
        )

        // If closer to Stinica, heading towards Mišnjak (southwest ~225°)
        // If closer to Mišnjak, heading towards Stinica (northeast ~45°)
        course = distToStinica < distToMisnjak ? 225 : 45
      }
    } catch (e) {
      console.warn('Could not get live ferry position:', e)
    }

    return {
      name: 'RAPSKA PLOVIDBA',
      mmsi: '238690000',
      imo: imo,
      type: 'Passenger/Ro-Ro Cargo Ship',
      flag: 'Croatia',
      latitude: currentLat,
      longitude: currentLng,
      speed: estimatedSpeed,
      course: course,
      heading: course,
      destination: 'Stinica ⇄ Mišnjak',
      eta: '~15 min',
      status: 'Under way using engine',
      timestamp: new Date().toISOString(),
      source: 'Live Simulation (Map Data)',
      note: 'Pozicija sinkronizirana s kartom. Za stvarne AIS podatke potreban je API ključ.',
    }
  }

  // For other vessels, try to fetch (likely will fail due to CORS)
  const sources = [
    {
      name: 'MyShipTracking',
      url: `https://api.myshiptracking.com/vessels/imo-${imo}.json`,
      parser: (data) => ({
        name: data.SHIPNAME || 'N/A',
        mmsi: data.MMSI || 'N/A',
        imo: data.IMO || imo,
        type: data.TYPE_NAME || 'Ferry',
        flag: data.FLAG || 'N/A',
        latitude: data.LAT || 'N/A',
        longitude: data.LON || 'N/A',
        speed: data.SPEED || 'N/A',
        course: data.COURSE || 'N/A',
        heading: data.HEADING || 'N/A',
        destination: data.DESTINATION || 'N/A',
        eta: data.ETA || 'N/A',
        status: data.NAVSTAT_NAME || 'N/A',
        timestamp: data.TIMESTAMP || new Date().toISOString(),
        source: 'MyShipTracking',
      }),
    },
  ]

  for (const source of sources) {
    try {
      const response = await fetch(source.url, {
        method: 'GET',
        mode: 'cors',
        headers: {
          Accept: 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        return source.parser(data)
      }
    } catch (err) {
      console.warn(`Failed to fetch from ${source.name}:`, err)
      continue
    }
  }

  throw new Error('Javne AIS usluge blokiraju CORS. Za live podatke potreban je backend proxy.')
}

/**
 * Display vessel AIS data in the modal
 * @param {HTMLElement} container - Container element
 * @param {Object} data - Vessel data
 */
function displayVesselAISData(container, data) {
  const formatValue = (val) => (val === 'N/A' || val === null || val === undefined ? '—' : val)
  const formatCoord = (val) => (typeof val === 'number' ? val.toFixed(4) + '°' : formatValue(val))
  const formatSpeed = (val) => (typeof val === 'number' ? val.toFixed(1) + ' kn' : formatValue(val))
  const formatCourse = (val) => (typeof val === 'number' ? val.toFixed(0) + '°' : formatValue(val))

  container.innerHTML = `
    <div style="padding: 1rem 0;">
      <div style="display: grid; gap: 1.5rem;">
        <!-- Vessel Info -->
        <div>
          <h3 style="font-size: 1.25rem; margin-bottom: 1rem; color: var(--accent);">
            ${formatValue(data.name)}
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div class="ais-data-item">
              <span class="ais-label">MMSI</span>
              <span class="ais-value">${formatValue(data.mmsi)}</span>
            </div>
            <div class="ais-data-item">
              <span class="ais-label">IMO</span>
              <span class="ais-value">${formatValue(data.imo)}</span>
            </div>
            <div class="ais-data-item">
              <span class="ais-label">Tip</span>
              <span class="ais-value">${formatValue(data.type)}</span>
            </div>
            <div class="ais-data-item">
              <span class="ais-label">Zastava</span>
              <span class="ais-value">${formatValue(data.flag)}</span>
            </div>
          </div>
        </div>

        <!-- Position & Navigation -->
        <div>
          <h4 style="font-size: 1rem; margin-bottom: 0.75rem; opacity: 0.8;">Pozicija i navigacija</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
            <div class="ais-data-item">
              <span class="ais-label">Latitude</span>
              <span class="ais-value">${formatCoord(data.latitude)}</span>
            </div>
            <div class="ais-data-item">
              <span class="ais-label">Longitude</span>
              <span class="ais-value">${formatCoord(data.longitude)}</span>
            </div>
            <div class="ais-data-item">
              <span class="ais-label">Brzina</span>
              <span class="ais-value">${formatSpeed(data.speed)}</span>
            </div>
            <div class="ais-data-item">
              <span class="ais-label">Kurs</span>
              <span class="ais-value">${formatCourse(data.course)}</span>
            </div>
            <div class="ais-data-item">
              <span class="ais-label">Heading</span>
              <span class="ais-value">${formatCourse(data.heading)}</span>
            </div>
            <div class="ais-data-item">
              <span class="ais-label">Status</span>
              <span class="ais-value">${formatValue(data.status)}</span>
            </div>
          </div>
        </div>

        <!-- Destination -->
        <div>
          <h4 style="font-size: 1rem; margin-bottom: 0.75rem; opacity: 0.8;">Odredište</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div class="ais-data-item">
              <span class="ais-label">Destinacija</span>
              <span class="ais-value">${formatValue(data.destination)}</span>
            </div>
            <div class="ais-data-item">
              <span class="ais-label">ETA</span>
              <span class="ais-value">${formatValue(data.eta)}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding-top: 1rem; border-top: 1px solid var(--border);">
          ${
            data.note
              ? `
            <div style="padding: 0.75rem; margin-bottom: 1rem; background: rgba(59, 130, 246, 0.1); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.875rem; color: var(--text-dim);">
              ℹ️ ${data.note}
            </div>
          `
              : ''
          }
          <div style="font-size: 0.75rem; color: var(--text-dim); display: flex; justify-content: space-between; align-items: center;">
            <span>Izvor: ${data.source}</span>
            <button onclick="window.open('https://www.vesselfinder.com/vessels/details/${
              data.imo
            }', '_blank')"
                    style="padding: 0.25rem 0.75rem; background: var(--accent); color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.75rem;">
              VesselFinder →
            </button>
          </div>
        </div>
      </div>
    </div>
  `
}


/**
 * Radio Rab News Portal — Admin Module
 * Extracted from script.js
 */
/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
/* global CONFIG, state, escapeHtml, updateWeatherWithNPT, initNPT, AUTHORS, saveArticles, loadMoreArticles */

// ===========================================
// ADMIN PORTAL
// ===========================================

/**
 * Admin Portal Logic (UPDATED)
 */
function initAdminPortal() {
  const modal = document.getElementById('admin-modal')
  const btn = document.getElementById('staff-portal-btn')
  const close = document.getElementById('admin-close')
  const ferryToggle = document.getElementById('ferry-override-toggle')
  const d8Toggle = document.getElementById('d8-override-toggle')

  // Tab buttons
  const tabBtns = document.querySelectorAll('.admin-tab-btn')
  const tabContents = document.querySelectorAll('.admin-tab-content')

  if (!modal) return

  const toggleModal = () => {
    const isHidden = modal.hasAttribute('hidden')
    if (isHidden) {
      modal.removeAttribute('hidden')
      // Sync toggles
      if (ferryToggle) ferryToggle.checked = state.manualOverrides.ferrySuspended
      if (d8Toggle) d8Toggle.checked = state.manualOverrides.d8Restricted
      renderAdminNewsList()
      renderAdminGallery()
    } else {
      modal.setAttribute('hidden', '')
    }
  }

  // Tab switching logic
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.adminTab
      tabBtns.forEach((b) => b.classList.toggle('active', b === btn))
      tabContents.forEach((content) => {
        content.classList.toggle('active', content.id === `admin-tab-${target}`)
      })
    })
  })

  // Hidden Shortcut: Alt + Shift + A
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && e.key === 'A') {
      e.preventDefault()
      toggleModal()
    }
  })

  btn?.addEventListener('click', (e) => {
    e.preventDefault()
    toggleModal()
  })

  close?.addEventListener('click', toggleModal)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) toggleModal()
  })

  // Island Status Overrides
  ferryToggle?.addEventListener('change', (e) => {
    state.manualOverrides.ferrySuspended = e.target.checked
    if (state.nptIslandWeather) updateWeatherWithNPT(state.nptIslandWeather)
    initNPT() // Refresh UI
  })

  d8Toggle?.addEventListener('change', (e) => {
    state.manualOverrides.d8Restricted = e.target.checked
    if (state.nptIslandWeather) updateWeatherWithNPT(state.nptIslandWeather)
    initNPT()
  })

  // Initialize Editor Modal
  initNewsEditor()
}

function renderAdminNewsList(filter = '') {
  const list = document.getElementById('admin-news-list')
  if (!list) return

  const q = filter.toLowerCase()
  const filtered = q
    ? state.allArticles.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          (a.tags || []).some((t) => t.toLowerCase().includes(q))
      )
    : state.allArticles

  list.innerHTML = filtered
    .map((article) => {
      const dateStr = article.timestamp
        ? new Date(article.timestamp).toLocaleDateString('hr-HR')
        : article.date || '—'
      return `
    <tr>
      <td>${escapeHtml(article.title)}</td>
      <td><span class="status-badge">${escapeHtml(article.category)}</span></td>
      <td>${dateStr}</td>
      <td><span class="status-badge ${article.status || 'published'}">${
        article.status || 'published'
      }</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" onclick="editArticle('${article.id}')" title="Uredi">✏️</button>
          <button class="btn-icon delete" onclick="deleteArticle('${
            article.id
          }')" title="Obriši">🗑️</button>
        </div>
      </td>
    </tr>
  `
    })
    .join('')
}

function renderAdminGallery(filter = '') {
  const grid = document.getElementById('admin-gallery-grid')
  if (!grid) return

  // Deduplicate images by URL using a Map (Set doesn't work on objects)
  const imageMap = new Map()
  state.allArticles.forEach((a) => {
    if (a.image && !imageMap.has(a.image)) {
      imageMap.set(a.image, a.tags || [])
    }
  })

  const q = filter.toLowerCase()
  let entries = [...imageMap.entries()]
  if (q) {
    entries = entries.filter(([, tags]) => tags.some((t) => t.toLowerCase().includes(q)))
  }

  grid.innerHTML = entries
    .map(
      ([url, tags]) => `
    <div class="gallery-item" onclick="selectGalleryImage('${url}')">
      <img src="${url}" loading="lazy">
      <div class="tags">${tags.join(', ')}</div>
    </div>
  `
    )
    .join('')
}

function initNewsEditor() {
  const editorModal = document.getElementById('news-editor-modal')
  const editorForm = document.getElementById('news-editor-form')
  const closeBtn = document.getElementById('editor-close')
  const addBtn = document.getElementById('add-news-btn')
  const templateSelect = document.getElementById('edit-template')
  const aiBtn = document.getElementById('editor-ai-summarize')
  const imageInput = document.getElementById('edit-image')
  const preview = document.getElementById('image-preview')
  const bodyEl = document.getElementById('edit-body')
  const gallerySearch = document.getElementById('gallery-search-input')

  if (!editorModal) return

  // --- Toolbar: wire up execCommand buttons ---
  editorModal.querySelectorAll('.tool-btn[data-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      bodyEl.focus()
      const cmd = btn.dataset.cmd
      if (cmd === 'createLink') {
        const url = prompt('Unesite URL:')
        if (url) document.execCommand('createLink', false, url)
      } else if (cmd === 'formatBlock') {
        document.execCommand('formatBlock', false, btn.dataset.value || 'H3')
      } else {
        document.execCommand(cmd, false, null)
      }
      // Update button active states
      updateToolbarState()
    })
  })

  // Track active formatting state
  function updateToolbarState() {
    editorModal.querySelectorAll('.tool-btn[data-cmd]').forEach((btn) => {
      const cmd = btn.dataset.cmd
      if (cmd === 'bold' || cmd === 'italic' || cmd === 'insertUnorderedList') {
        btn.classList.toggle('active', document.queryCommandState(cmd))
      }
    })
  }

  bodyEl?.addEventListener('keyup', updateToolbarState)
  bodyEl?.addEventListener('mouseup', updateToolbarState)

  // --- "New Article" button ---
  addBtn?.addEventListener('click', () => {
    editorForm.reset()
    if (bodyEl) bodyEl.innerHTML = ''
    editorForm.dataset.editId = ''
    if (preview) preview.style.backgroundImage = ''
    document.getElementById('edit-status').value = 'published'
    editorModal.removeAttribute('hidden')
  })

  closeBtn?.addEventListener('click', () => editorModal.setAttribute('hidden', ''))

  // --- Image preview ---
  imageInput?.addEventListener('input', () => {
    if (preview) preview.style.backgroundImage = `url(${imageInput.value})`
  })

  // --- Templates (all three) ---
  templateSelect?.addEventListener('change', (e) => {
    const tpl = e.target.value
    if (!bodyEl) return

    if (tpl === 'brownout') {
      bodyEl.innerHTML =
        '<h3>Prekid opskrbe strujom</h3><p>Zbog radova na mreži... Area: [Insert Area]</p><p>Vrijeme: [Insert Time]</p>'
      document.getElementById('edit-title').value = 'Najava prekida struje'
      document.getElementById('edit-category').value = 'LOKALNO'
    } else if (tpl === 'traffic') {
      bodyEl.innerHTML =
        '<h3>Izvanredna regulacija prometa</h3><p>Zbog [Razlog] promet se odvija [Opis].</p>'
      document.getElementById('edit-title').value = 'Otežan promet'
      document.getElementById('edit-category').value = 'LOKALNO'
    } else if (tpl === 'event') {
      bodyEl.innerHTML =
        '<h3>Najava događanja</h3><p><b>Što:</b> [Naziv]</p><p><b>Kada:</b> [Datum i vrijeme]</p><p><b>Gdje:</b> [Lokacija]</p><p>Opis…</p>'
      document.getElementById('edit-title').value = 'Najava: '
      document.getElementById('edit-category').value = 'KULTURA'
    }

    // Reset after applying
    templateSelect.value = ''
  })

  // --- AI Summary ---
  aiBtn?.addEventListener('click', () => {
    const bodyContent = bodyEl?.innerText || ''
    if (!bodyContent.trim()) return
    aiBtn.textContent = '✨ Generiranje...'
    setTimeout(() => {
      const summary = bodyContent.substring(0, 120).trim() + '...'
      alert('AI Sažetak Generiran: ' + summary)
      aiBtn.textContent = 'AI Sažetak'
    }, 1000)
  })

  // --- Gallery search ---
  gallerySearch?.addEventListener('input', () => {
    renderAdminGallery(gallerySearch.value)
  })

  // --- Form submit ---
  editorForm?.addEventListener('submit', (e) => {
    e.preventDefault()
    const editId = editorForm.dataset.editId
    const bodyHtml = bodyEl?.innerHTML || ''
    const plainText = bodyEl?.innerText || ''

    // Build base article object
    const article = {
      id: editId || `news-${Date.now()}`,
      title: document.getElementById('edit-title').value,
      body: bodyHtml,
      category: document.getElementById('edit-category').value,
      image: document.getElementById('edit-image').value,
      tags: document
        .getElementById('edit-tags')
        .value.split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      snippet: plainText.substring(0, 150).trim() + (plainText.length > 150 ? '...' : ''),
      status: document.getElementById('edit-status').value,
      timestamp: new Date().toISOString(),
      author: AUTHORS[0],
      date: 'Danas',
      readTime: `${Math.max(2, Math.ceil(plainText.split(/\s+/).length / 200))} min`,
    }

    if (editId) {
      // Preserve fields that aren't in the form
      const idx = state.allArticles.findIndex((a) => a.id === editId)
      if (idx !== -1) {
        const existing = state.allArticles[idx]
        article.isHero = existing.isHero
        article.aiSummary = existing.aiSummary
        state.allArticles[idx] = article
      }
    } else {
      state.allArticles.unshift(article)
    }

    saveArticles()
    renderAdminNewsList()
    editorModal.setAttribute('hidden', '')

    // Refresh the main feed
    const grid = document.getElementById('news-grid')
    if (grid) {
      grid.innerHTML = ''
      state.currentVisibleCount = 0
      loadMoreArticles()
    }
  })
}

// Global functions for inline usage
window.editArticle = function (id) {
  const article = state.allArticles.find((a) => a.id === id)
  if (!article) return

  const modal = document.getElementById('news-editor-modal')
  const form = document.getElementById('news-editor-form')
  const bodyEl = document.getElementById('edit-body')

  document.getElementById('edit-title').value = article.title
  if (bodyEl) bodyEl.innerHTML = article.body || ''
  document.getElementById('edit-category').value = article.category
  document.getElementById('edit-status').value = article.status || 'published'
  document.getElementById('edit-image').value = article.image
  document.getElementById('edit-tags').value = (article.tags || []).join(', ')

  form.dataset.editId = id
  const preview = document.getElementById('image-preview')
  if (preview) preview.style.backgroundImage = `url(${article.image})`

  modal.removeAttribute('hidden')
}

window.deleteArticle = function (id) {
  if (confirm('Jeste li sigurni da želite obrisati ovu vijest?')) {
    state.allArticles = state.allArticles.filter((a) => a.id !== id)
    saveArticles()
    renderAdminNewsList()

    const grid = document.getElementById('news-grid')
    if (grid) {
      grid.innerHTML = ''
      state.currentVisibleCount = 0
      loadMoreArticles()
    }
  }
}

window.selectGalleryImage = function (url) {
  const imageInput = document.getElementById('edit-image')
  if (imageInput) {
    imageInput.value = url
    document.getElementById('image-preview').style.backgroundImage = `url(${url})`
    // Switch to news tab
    document.querySelector('[data-admin-tab="news"]')?.click()
  }
}


/**
 * Radio Rab News Portal — News Module
 * Extracted from script.js
 */
/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
/* global CONFIG, state, escapeHtml, getCategoryPillHTML, openReaderMode, shareArticle */

// ===========================================
// NEWS FEED
// ===========================================

function initNewsFeed() {
  // Initialize managed articles from localStorage or templates
  const saved = localStorage.getItem('radio_rab_articles')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      state.allArticles = Array.isArray(parsed) ? parsed : flattenTemplates()
    } catch (e) {
      state.allArticles = flattenTemplates()
    }
  } else {
    state.allArticles = flattenTemplates()
    saveArticles()
  }

  const hero = state.allArticles.find((a) => a.isHero) || state.allArticles[0]
  renderHero(hero)
  loadMoreArticles()
  initLoadMore()
  initFilters()
}

function flattenTemplates() {
  const flattened = []
  Object.keys(NEWS_TEMPLATES).forEach((cat) => {
    NEWS_TEMPLATES[cat].forEach((item, idx) => {
      flattened.push({
        id: `${cat.toLowerCase()}-${idx}-${Date.now()}`,
        ...item,
        category: cat,
        author: AUTHORS[Math.floor(Math.random() * AUTHORS.length)],
        date: 'Danas',
        readTime: '4 min',
        isHero: cat === 'LOKALNO' && idx === 0,
        status: 'published',
        tags: item.tags || [cat.toLowerCase()],
        timestamp: new Date().toISOString(),
      })
    })
  })
  return flattened
}

function saveArticles() {
  localStorage.setItem('radio_rab_articles', JSON.stringify(state.allArticles))
  window.dispatchEvent(new CustomEvent('news-updated'))
}

function renderHero(article) {
  const container = document.getElementById('primary-feature-container')
  if (!container || !article) return

  const isObituary = article.category === 'OSMRTNICE'

  container.innerHTML = `
        <article class="main-feature card-animate ${
          isObituary ? 'obituary-view' : ''
        }" style="--delay: 1;" data-category="${escapeHtml(article.category)}">
            <div class="feature-img-container">
                <span class="category-pill">${getCategoryPillHTML(article.category)}</span>
                <div class="feature-img lazy-img" data-bg="${escapeHtml(
                  article.image
                )}" role="img" aria-label="${escapeHtml(article.title)}"></div>
            </div>
            <div class="feature-content">
                <div class="meta-row">
                    <span class="meta-info">${escapeHtml(article.date)} · ${escapeHtml(
    article.readTime || '4 min'
  )} čit.</span>
                    <button class="translate-btn" title="Prevedi na Engleski">
                      <span class="icon">🌐</span> EN
                    </button>
                </div>
                <h2>${escapeHtml(article.title)}</h2>
                <div class="article-body">
                  ${
                    isObituary
                      ? `<img src="${article.image}" class="obituary-full-img" alt="Osmrtnica">`
                      : ''
                  }
                  ${article.body || `<p>${escapeHtml(article.snippet)}</p>`}
                </div>

                <div class="editorial-ai" ${isObituary ? 'hidden' : ''}>
                    <p class="ai-label">AI SAŽETAK</p>
                    <p>${escapeHtml(
                      article.aiSummary || 'Automatski sažetak članka trenutno nije dostupan.'
                    )}</p>
                </div>

                <div class="article-actions">
                    <button class="action-btn" id="reader-mode-btn">
                        <span class="icon">📖</span> <span class="label">Pročitaj članak</span>
                    </button>
                    <div class="share-group">
                        <button class="action-btn icon-only" data-share="copy" title="Kopiraj link">🔗</button>
                        <button class="action-btn icon-only" data-share="twitter" title="Podijeli na X">𝕏</button>
                        <button class="action-btn icon-only" data-share="facebook" title="Podijeli na Facebooku">f</button>
                    </div>
                </div>
            </div>
        </article>
    `

  // Attach event listeners
  container.querySelector('#reader-mode-btn')?.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopImmediatePropagation()
    openReaderMode(article.id)
  })
  container.querySelectorAll('[data-share]').forEach((btn) => {
    btn.addEventListener('click', () => shareArticle(btn.dataset.share))
  })
}

function loadMoreArticles() {
  const grid = document.getElementById('news-grid')
  const btn = document.getElementById('load-more-btn')
  const loader = document.getElementById('grid-loader')
  const btnText = btn?.querySelector('span')

  if (!grid || state.isLoading) return

  const filteredArticles = getFilteredArticles()
  const nextBatch = filteredArticles.slice(
    state.currentVisibleCount,
    state.currentVisibleCount + CONFIG.itemsPerBatch
  )

  if (nextBatch.length === 0) {
    hideLoader()
    if (btn) btn.style.display = 'none'
    return
  }

  state.isLoading = true
  if (btn) btn.disabled = true
  if (loader) loader.hidden = false
  if (btnText) btnText.textContent = 'Učitavanje...'

  // Simulate network delay for demo
  setTimeout(() => {
    const fragment = document.createDocumentFragment()

    nextBatch.forEach((article, index) => {
      const card = createNewsCard(article, index)
      fragment.appendChild(card)
    })

    grid.appendChild(fragment)
    if (window.lucide) {
      lucide.createIcons()
    }
    state.currentVisibleCount += nextBatch.length
    state.isLoading = false

    if (btn) btn.disabled = false
    if (loader) loader.hidden = true
    if (btnText) btnText.textContent = 'Učitaj više'

    // Check if more articles available
    if (state.currentVisibleCount >= filteredArticles.length) {
      hideLoader()
      if (btn) btn.style.display = 'none'
    }

    // Initialize lazy loading for newly added cards
    if (typeof initLazyImages === 'function') {
      initLazyImages()
    }
  }, CONFIG.loadDelay)
}

function createNewsCard(article, index) {
  const card = document.createElement('article')
  const isObituary = article.category === 'OSMRTNICE'
  card.className = `small-news-card card-animate ${isObituary ? 'obituary-card' : ''}`
  card.style.setProperty('--delay', (index % 3) + 1)
  card.setAttribute('data-category', article.category)

  card.innerHTML = `
        <div class="feature-img-container">
            <span class="category-pill">${getCategoryPillHTML(article.category)}</span>
            <div class="feature-img lazy-img" data-bg="${escapeHtml(
              article.image
            )}" role="img" aria-label="${escapeHtml(article.title)}"></div>
        </div>
        <div class="feature-content">
            <h3>${escapeHtml(article.title)}</h3>
            <p>${escapeHtml(article.snippet)}</p>
            <div class="meta-info flex-between">
                <span>${escapeHtml(article.author)}</span>
                <span>${escapeHtml(article.date)}</span>
            </div>
        </div>
    `

  card.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopImmediatePropagation()
    openReaderMode(article.id)
  })

  return card
}

function getFilteredArticles() {
  if (state.activeCategory === 'all') {
    return state.allArticles
  }
  return state.allArticles.filter((a) => a.category === state.activeCategory)
}


/**
 * Radio Rab News Portal — NPT / Traffic / Meteo / Sea Quality Module
 * Extracted from script.js
 */
/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */

// ===========================================
// NPT (National Access Point) Integration
// ===========================================

/**
 * Initialize NPT (National Access Point) Integration
 */
async function initNPT() {
  debugLog('NPT System: Initializing...')

  let data = null

  // 1. Try Global Variable (Local file protocol support)
  if (typeof NPT_DATA !== 'undefined') {
    debugLog('NPT: Loading from window.NPT_DATA')
    data = NPT_DATA
  }
  // 2. Try Fetch (Production support)
  else {
    debugLog('NPT: Loading from fetch')
    try {
      const response = await fetch(CONFIG.urls.npt.dataUrl)
      if (response.ok) {
        data = await response.json()
      }
    } catch (e) {
      debugWarn('NPT: Fetch failed:', e)
    }
  }

  if (!data) {
    debugWarn('NPT: Could not load data')
    return
  }

  try {
    // Handle both legacy array-only and new object-format data
    // Handle both legacy array-only and new object-format data
    const alerts = Array.isArray(data) ? data : data.events || data.alerts || []
    const weather = Array.isArray(data) ? null : data.weather || null
    const islandWeather = Array.isArray(data) ? null : data.islandWeather || null
    const islandCounters = Array.isArray(data) ? null : data.islandCounters || data.counters || null // DATA UPDATE: Use islandCounters
    const allCounters = Array.isArray(data) ? null : data.counters || null
    const updatedAt = Array.isArray(data) ? null : data.updatedAt || null

    state.nptAlerts = alerts
    state.nptWeather = weather
    state.nptIslandWeather = islandWeather
    state.nptIslandCameras = Array.isArray(data) ? [] : data.islandCameras || []
    state.nptCounters = islandCounters // Prioritize filtered counters
    state.nptUpdatedAt = updatedAt

    // --- EXTERNAL WEATHER FALLBACK (Open-Meteo) ---
    // Since NPT often lacks Rab-specific sensors, we supplement with Open-Meteo for the island coordinates
    try {
      const externalRab = await fetchExternalWeather(44.7554, 14.761, 'Rab (Grad)')
      if (externalRab) {
        if (!state.nptIslandWeather) state.nptIslandWeather = []
        // Add or update Rab data
        const existingIdx = state.nptIslandWeather.findIndex((w) => w.id === externalRab.id)
        if (existingIdx >= 0) state.nptIslandWeather[existingIdx] = externalRab
        else state.nptIslandWeather.unshift(externalRab) // Put Rab at top
      }
    } catch (err) {
      debugWarn('Weather: External fallback failed', err)
    }

    debugLog(
      `NPT: Loaded ${alerts.length} alerts, ${
        state.nptIslandWeather?.length || 0
      } island weather stations, Updated: ${updatedAt}`
    )

    updateNewsTickerWithNPT(alerts)
    updateTrafficAlerts(alerts, updatedAt)
    if (state.nptIslandWeather) updateWeatherWithNPT(state.nptIslandWeather)

    // Update Sync Status UI
    updateSyncStatus(updatedAt)

    // Update Map Visualization
    updateMapVisualization()

    // Add Custom Controls
    addMapControls()

    // Also refresh meteo alerts when NPT refreshes
    initMeteoAlerts()

    // Scope Filter Change
    if (!state.nptRefreshInterval) {
      state.nptRefreshInterval = setInterval(initNPT, CONFIG.nptRefreshInterval)
      debugLog(`NPT: Auto-refresh enabled (every ${CONFIG.nptRefreshInterval / 1000}s)`)
    }
  } catch (e) {
    debugWarn('NPT: Error processing data:', e)
    updateSyncStatus(null, true)
  }
}

/**
 * Update UI with Sync Status
 */
function updateSyncStatus(timestamp, isError = false) {
  const syncDot = document.getElementById('npt-sync-dot')
  const syncText = document.getElementById('npt-sync-text')
  const adminStatus = document.getElementById('admin-sync-status')

  if (!syncDot || !syncText) return

  if (isError) {
    syncDot.style.background = 'var(--error)'
    syncText.textContent = 'Veza prekinuta'
    if (adminStatus) adminStatus.textContent = 'Greška pri sinkronizaciji'
    return
  }

  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' })
    : '---'
  syncDot.style.background = 'var(--success)'
  syncText.textContent = `Sinkronizirano u ${time}`
  if (adminStatus) adminStatus.textContent = `Podaci od ${time}`
}

/**
 * Fetch weather from Open-Meteo (No API Key Required)
 */
async function fetchExternalWeather(lat, lng, name) {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=sunrise,sunset&timezone=auto`
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=sea_surface_temperature&daily=wave_height_max&timezone=auto`

  try {
    const [wRes, mRes] = await Promise.all([fetch(weatherUrl), fetch(marineUrl)])
    if (!wRes.ok) return null

    const wData = await wRes.json()
    const current = wData.current
    const daily = wData.daily

    let marineData = null
    if (mRes.ok) {
      marineData = await mRes.json()
    }

    return {
      id: `EXT:${name.replace(/\s+/g, '_')}`,
      name: name,
      lat: lat,
      lng: lng,
      temp: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      windGust: current.wind_gusts_10m,
      windDir: current.wind_direction_10m,
      sunrise: daily?.sunrise?.[0],
      sunset: daily?.sunset?.[0],
      seaTemp: marineData?.current?.sea_surface_temperature,
      tideTime: marineData?.daily?.time?.[0], // Placeholder context
      source: 'Open-Meteo',
      distanceFromRab: 0,
    }
  } catch (e) {
    return null
  }
}

function updateNewsTickerWithNPT(alerts) {
  const tickerContent = document.querySelector('.ticker-content')
  if (!tickerContent) return

  // Save baseline if not already done
  if (state.tickerBaseline === null) {
    state.tickerBaseline = tickerContent.innerHTML
  }

  // Filter for island-critical alerts only
  const combined = [...(state.meteoAlerts || []), ...alerts]
  const critical = combined
    .filter((a) => {
      if (a.type === 'meteo') {
        // Only orange and red warnings go to ticker
        return a.severity === 'orange' || a.severity === 'red'
      }
      const details = (a.details || '').toLowerCase()
      const road = (a.road || '').toUpperCase()
      const rabRegex = /\b(rab|rapsk)[a-z]{0,3}\b/i

      // Only show Ferry, Otok Rab specifically, or the bridge/access roads
      return (
        rabRegex.test(details) ||
        details.includes('stinica') ||
        details.includes('mišnjak') ||
        road.includes('D105') ||
        (road.includes('D8') && (details.includes('senj') || details.includes('buri')))
      )
    })
    .slice(0, 3) // Limit to top 3 most important

  if (critical.length === 0) {
    tickerContent.innerHTML = state.tickerBaseline
    return
  }

  // Clear and build clean ticker items
  const alertItems = critical
    .map(
      (a) => `
        <span class="ticker-item" style="color: var(--warning); font-weight: 800;">⚠️ ${
          a.road
        }: ${a.details.substring(0, 80)}${a.details.length > 80 ? '...' : ''}</span>
        <span class="ticker-separator">•</span>
    `
    )
    .join('')

  // Prepend to existing static items (which are baseline island info)
  tickerContent.innerHTML = alertItems + state.tickerBaseline
}

// ===========================================
// METEO ALERTS
// ===========================================

/**
 * Fetch and Process Meteo.hr Weather Warnings (CAP XML)
 */
async function initMeteoAlerts() {
  debugLog('MeteoAlerts: Fetching official warnings...')

  const urls = [
    CONFIG.urls.meteo.today,
    CONFIG.urls.meteo.tomorrow,
    CONFIG.urls.meteo.dayAfterTomorrow,
  ]

  // Rijeka (HR006), Velebit channel (HR803), and Kvarner (HR802) are the primary areas for Rab
  const relevantIDs = ['HR006', 'HR803', 'HR802']
  const allParsedAlerts = []

  try {
    const fetchPromises = urls.map((url) =>
      fetch(`${CONFIG.urls.corsProxy}${encodeURIComponent(url)}`)
        .then((res) => (res.ok ? res.text() : null))
        .catch(() => null)
    )

    const xmlStrings = await Promise.all(fetchPromises)
    const parser = new DOMParser()

    xmlStrings.forEach((xmlStr) => {
      if (!xmlStr) return

      try {
        const xmlDoc = parser.parseFromString(xmlStr, 'application/xml')
        const infoNodes = xmlDoc.querySelectorAll('info')

        infoNodes.forEach((info) => {
          // Only process Croatian language to avoid duplicates
          const lang = info.querySelector('language')?.textContent
          if (lang !== 'hr') return

          const areaNodes = info.querySelectorAll('area')
          let isRelevant = false
          let areaNames = []

          areaNodes.forEach((area) => {
            const geocode = area.querySelector('geocode value')?.textContent
            const areaDesc = area.querySelector('areaDesc')?.textContent
            if (relevantIDs.includes(geocode)) {
              isRelevant = true
              areaNames.push(areaDesc)
            }
          })

          if (isRelevant) {
            const levelParam = [...info.querySelectorAll('parameter')].find(
              (p) => p.querySelector('valueName')?.textContent === 'awareness_level'
            )
            const levelValue = levelParam?.querySelector('value')?.textContent || ''

            // Format: "2; yellow; Moderate" -> extract "yellow"
            const severity = levelValue.split(';')[1]?.trim().toLowerCase() || 'info'

            const eventName = info.querySelector('event')?.textContent || 'Upozorenje'
            allParsedAlerts.push({
              source: 'DHMZ',
              type: 'meteo',
              event: eventName,
              severity: severity, // yellow, orange, red
              description: info.querySelector('description')?.textContent,
              instruction: info.querySelector('instruction')?.textContent,
              onset: info.querySelector('onset')?.textContent,
              expires: info.querySelector('expires')?.textContent,
              areas: areaNames,
              road: `${areaNames.join(', ')} — ${eventName}`,
              details: info.querySelector('description')?.textContent,
            })
          }
        })
      } catch (e) {
        debugWarn('MeteoAlerts: XML Parse Error', e)
      }
    })

    // Deduplicate and Sort
    state.meteoAlerts = deduplicateMeteoAlerts(allParsedAlerts)
    debugLog(`MeteoAlerts: Found ${state.meteoAlerts.length} relevant warnings`)

    // Update UI if we have NPT alerts already
    if (state.nptAlerts) {
      updateTrafficAlerts(state.nptAlerts, state.nptUpdatedAt)
    }
    updateWeatherWarningBadge()
  } catch (err) {
    debugWarn('MeteoAlerts: Global Fetch Failed', err)
  }
}

// ===========================================
// SEA TEMPERATURE
// ===========================================

/**
 * Fetch Sea Temperature from DHMZ (Rab)
 */
async function initSeaTemperature() {
  try {
    const url = CONFIG.urls.meteo.seaTemp
    const response = await fetch(`${CONFIG.urls.corsProxy}${encodeURIComponent(url)}`)
    if (!response.ok) return

    const xmlStr = await response.text()
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlStr, 'application/xml')
    const podatciNodes = xmlDoc.querySelectorAll('Podatci')

    let rabTemp = null
    podatciNodes.forEach((node) => {
      const postaja = node.querySelector('Postaja')?.textContent
      if (postaja === 'Rab') {
        const termini = node.querySelectorAll('Termin')
        // Find the latest non-empty terminal value
        for (let i = termini.length - 1; i >= 0; i--) {
          const val = termini[i].textContent.trim()
          if (val && val !== '-' && !isNaN(parseFloat(val))) {
            rabTemp = parseFloat(val)
            break
          }
        }
      }
    })

    if (rabTemp !== null) {
      state.seaTemp = rabTemp
      debugLog(`SeaTemp: Official Rab temp is ${state.seaTemp}°C`)
      updateSeaTemperatureUI()
    }
  } catch (err) {
    debugWarn('SeaTemp: Fetch failed', err)
  }
}

// ===========================================
// SEA QUALITY (IZOR)
// ===========================================

/**
 * Initialize IZOR Sea Quality data
 */
async function initSeaQuality() {
  debugLog('SeaQuality: Initializing...')
  let data = null

  // 1. Try Global Variable (Local file protocol support)
  if (typeof IZOR_DATA !== 'undefined') {
    debugLog('SeaQuality: Loading from window.IZOR_DATA')
    data = IZOR_DATA
  }
  // 2. Try Fetch (Production support)
  else {
    try {
      const response = await fetch(CONFIG.urls.meteo.seaQuality)
      if (response.ok) {
        data = await response.json()
      }
    } catch (e) {
      debugWarn('SeaQuality: Fetch failed:', e)
    }
  }

  if (data && data.points) {
    state.seaQualityPoints = data.points
    debugLog(`SeaQuality: Loaded ${state.seaQualityPoints.length} points`)
    if (state.mapInstance) updateMapVisualization()
  }
}

function initSeaQualityModal() {
  const modal = document.getElementById('sea-history-modal')
  if (!modal) return

  const closeBtn = modal.querySelector('[data-sea-history-close]')
  closeBtn?.addEventListener('click', () => closeModal(modal))
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal)
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal(modal)
  })

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.popup-history-btn')
    if (!btn) return
    e.preventDefault()
    const seaId = btn.getAttribute('data-sea-id')
    if (!seaId) return
    const point = (state.seaQualityPoints || []).find(
      (p) => String(p.lsta || p.id) === String(seaId)
    )
    if (!point) return
    openSeaHistoryModal(point)
  })
}

function openSeaHistoryModal(point) {
  const modal = document.getElementById('sea-history-modal')
  if (!modal) return

  const title = modal.querySelector('#sea-history-title')
  const subtitle = modal.querySelector('#sea-history-subtitle')
  const metaEl = modal.querySelector('#sea-history-meta')
  const yearsEl = modal.querySelector('#sea-history-years')
  const emptyEl = modal.querySelector('#sea-history-empty')

  // Prefer the most specific place name available (bay/spot) instead of a
  // generic town name like "Rab" or "Lopar". IZOR exports multiple fields
  // (lnaziv, lpla, lnaz, lgrad). Choose a candidate that is different from
  // the city and that looks like a specific location (contains more than one
  // word or contains keywords like "Uvala"). Fall back to a sensible default.
  const cityName = (point.lgrad || '').trim()
  const candidates = [point.lnaziv, point.lpla, point.lnaz]
    .map((v) => (v || '').trim())
    .filter(Boolean)

  function looksSpecific(name) {
    if (!name) return false
    const lower = name.toLowerCase()
    if (lower.includes('uvala') || lower.includes('u. ') || lower.includes('uvala')) return true
    // Prefer multi-word names (e.g. "Uvala Zastolac") over single-word town names
    if (name.split(/\s+/).length > 1) return true
    return false
  }

  let locationName = 'Lokacija'
  // Try to pick the most specific candidate that's not identical to the city
  for (const c of candidates) {
    if (!c) continue
    if (cityName && c.toLowerCase() === cityName.toLowerCase()) continue
    if (looksSpecific(c)) {
      locationName = c
      break
    }
    // keep as fallback if nothing more specific found
    if (locationName === 'Lokacija') locationName = c
  }

  if (title) title.textContent = `Povijest kakvoće mora - ${locationName}`
  if (subtitle) subtitle.textContent = cityName ? `Lokacija: ${cityName}` : 'Povijest mjerenja'

  if (metaEl) {
    metaEl.innerHTML = `
      <span>Postaja: ${escapeHtml(String(point.lsta || point.id || '--'))}</span>
      <span>Izvor: IZOR</span>
    `
  }

  const history = Array.isArray(point.history) ? point.history : []
  const normalized = normalizeSeaHistoryEntries(history)
  const years = getSeaHistoryYears(normalized)

  if (yearsEl) yearsEl.innerHTML = ''
  if (emptyEl) emptyEl.hidden = normalized.length > 0

  years.forEach((year) => {
    const entries = normalized.filter((entry) => entry.year === year)
    const yearEl = document.createElement('div')
    yearEl.className = 'sea-history-year'

    const headerBtn = document.createElement('button')
    headerBtn.type = 'button'
    headerBtn.className = 'sea-history-year-header'
    headerBtn.innerHTML = `${year} <span>${entries.length} mjerenja</span>`
    headerBtn.addEventListener('click', () => {
      yearEl.classList.toggle('open')
    })

    const bodyEl = document.createElement('div')
    bodyEl.className = 'sea-history-year-body'

    if (entries.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'sea-history-empty'
      empty.textContent = 'Nema podataka za ovu godinu.'
      bodyEl.appendChild(empty)
    } else {
      entries.forEach((entry) => {
        const entryEl = document.createElement('div')
        entryEl.className = 'sea-history-entry'

        const header = document.createElement('button')
        header.type = 'button'
        header.className = 'sea-history-entry-header'
        header.innerHTML = `
          <span>${escapeHtml(entry.dateLabel)}${
          entry.timeLabel ? `, ${escapeHtml(entry.timeLabel)}` : ''
        }</span>
          <span class="sea-history-badge ${entry.qualityClass}">${escapeHtml(
          entry.qualityLabel
        )}</span>
        `
        header.addEventListener('click', () => {
          entryEl.classList.toggle('open')
        })

        const details = document.createElement('div')
        details.className = 'sea-history-entry-details'
        details.innerHTML = `
          <div>Temperatura mora: ${escapeHtml(entry.tempLabel)}</div>
          <div>Slanost: ${escapeHtml(entry.salinityLabel)}</div>
          <div>Ocjena: ${escapeHtml(entry.qualityLabel)}</div>
        `

        entryEl.appendChild(header)
        entryEl.appendChild(details)
        bodyEl.appendChild(entryEl)
      })
    }

    yearEl.appendChild(headerBtn)
    yearEl.appendChild(bodyEl)
    if (yearsEl) yearsEl.appendChild(yearEl)
  })

  openModal(modal)
}

function normalizeSeaHistoryEntries(history) {
  return history
    .map((entry) => {
      const rawDate = entry.vri || entry.datum || entry.dan || entry.vrijeme || ''
      const parsed = rawDate ? new Date(rawDate) : null
      const isValidDate = parsed && !Number.isNaN(parsed.getTime())
      const year = isValidDate ? parsed.getFullYear() : parseSeaYear(rawDate)
      const sortTs = isValidDate ? parsed.getTime() : 0
      const dateLabel = isValidDate
        ? parsed.toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : rawDate || '--'
      const timeLabel = isValidDate
        ? parsed.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' })
        : ''
      const qualityVal = parseInt(
        entry.ocj || entry.locj || entry.ocjena || entry.ocjena_kakvoce || entry.ocj_kakvoce
      )
      const qualityInfo = getSeaQualityInfo(qualityVal)
      const tempVal = entry.tmo ?? entry.temp ?? entry.temperatura
      const salinityVal = entry.slanost ?? entry.sal ?? entry.slan

      return {
        year: year,
        dateLabel,
        timeLabel,
        qualityLabel: qualityInfo.label,
        qualityClass: qualityInfo.className,
        tempLabel:
          tempVal !== undefined && tempVal !== null && tempVal !== '' ? `${tempVal}°C` : '--',
        salinityLabel:
          salinityVal !== undefined && salinityVal !== null && salinityVal !== ''
            ? `${salinityVal}‰`
            : '--',
        sortTs,
      }
    })
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return b.sortTs - a.sortTs
    })
}

function parseSeaYear(rawDate) {
  if (!rawDate) return new Date().getFullYear()
  const yearMatch = String(rawDate).match(/(20\d{2})/)
  if (yearMatch) return parseInt(yearMatch[1])
  return new Date().getFullYear()
}

function getSeaHistoryYears(entries) {
  const years = entries.map((entry) => entry.year).filter((year) => Number.isFinite(year))
  const maxYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear()
  return [maxYear, maxYear - 1, maxYear - 2]
}

function getSeaQualityInfo(qualityVal) {
  if (qualityVal === 1) return { label: 'Izvrsna', className: 'excellent' }
  if (qualityVal === 2) return { label: 'Dobra', className: 'good' }
  if (qualityVal === 3) return { label: 'Zadovoljavajuća', className: 'moderate' }
  return { label: 'Nezadovoljavajuća', className: 'poor' }
}

function updateSeaTemperatureUI() {
  if (state.seaTemp === null) return
  const seaTempEl = document.querySelector('[data-weather="sea-temp"] .weather-value')
  if (seaTempEl) {
    seaTempEl.textContent = `${state.seaTemp.toFixed(1)}°C`
    seaTempEl.title = 'Izvor: DHMZ (meteo.hr) - Službeno mjerenje'
  }
}

function deduplicateMeteoAlerts(alerts) {
  const seen = new Set()
  return alerts.filter((a) => {
    const key = `${a.event}-${a.onset}-${a.expires}-${a.severity}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function updateWeatherWarningBadge() {
  const weatherTitle = document.querySelector('.weather-widget h3')
  if (!weatherTitle) return

  const existingBadge = weatherTitle.querySelector('.meteo-badge')
  if (existingBadge) existingBadge.remove()

  if (!state.meteoAlerts || state.meteoAlerts.length === 0) return

  let maxSeverity = 'yellow'
  if (state.meteoAlerts.some((a) => a.severity === 'red')) maxSeverity = 'red'
  else if (state.meteoAlerts.some((a) => a.severity === 'orange')) maxSeverity = 'orange'

  const badge = document.createElement('span')
  badge.className = `meteo-badge severity-${maxSeverity}`
  badge.style.cssText =
    'width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-left: 10px; vertical-align: middle;'

  if (maxSeverity === 'red') {
    badge.style.background = '#ef4444'
    badge.style.animation = 'alert-pulse-anim 1s infinite'
  } else if (maxSeverity === 'orange') {
    badge.style.background = '#f97316'
  } else {
    badge.style.background = '#facc15'
  }

  weatherTitle.appendChild(badge)
  weatherTitle.title = 'Službeno upozorenje (Meteoalarm)'
}

// ===========================================
// TRAFFIC ALERTS
// ===========================================

/**
 * Update the dedicated Traffic Alerts widget
 */
function updateTrafficAlerts(alerts, updatedAt) {
  const widget = document.getElementById('traffic-alerts-widget')
  const container = document.getElementById('alert-items-container')
  if (!widget || !container) return

  // Filter for Rab-relevant alerts
  const combinedAlerts = [...(state.meteoAlerts || []), ...alerts]

  const relevant = combinedAlerts.filter((a) => {
    // Meteo alerts are pre-filtered in initMeteoAlerts
    if (a.type === 'meteo') return true

    const details = (a.details || '').toLowerCase()
    const road = (a.road || '').toUpperCase()
    const lat = parseFloat(a.lat)
    const lng = parseFloat(a.lng)

    // Regex for island specific mentions
    const rabRegex = /\b(rab|rapsk)[a-z]{0,3}\b/i
    const hasRabKeyword = rabRegex.test(details)
    const hasFerryKeyword =
      details.includes('stinica') ||
      details.includes('mišnjak') ||
      details.includes('trajekt') ||
      details.includes('jadrolinija')

    // 1. Mandatory Include: Island Road or Keywords
    if (hasRabKeyword || hasFerryKeyword || road.includes('D105')) return true

    // 2. Geographic Filtering (High precision)
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      const dist = getDistanceFromLatLonInKm(44.7554, 14.761, lat, lng)

      // Automatic include if very close (< 35km - local island access)
      if (dist < 35) return true

      // Secondary include for major access roads only if nearby (< 70km)
      // BUT: strictly only for high-impact events (accidents, closures, wind)
      const isAccessRoad =
        road.includes('D8') ||
        road.includes('A1') ||
        road.includes('A6') ||
        road.includes('A7') ||
        road.includes('D23')
      if (isAccessRoad && dist < 70) {
        const text = details.toLowerCase()
        const isUrgent =
          text.includes('nesreć') ||
          text.includes('sudar') ||
          text.includes('zatvoren') ||
          text.includes('prekid') ||
          text.includes('bura') ||
          text.includes('vjetar')

        return isUrgent
      }
    }

    return false // If it reached here, it's not relevant
  })

  if (relevant.length === 0) {
    widget.style.display = 'none'
    return
  }

  widget.style.display = 'block'

  // Show max 3 alerts initially, with expand option
  const maxVisible = 3
  const hasMore = relevant.length > maxVisible

  const renderAlert = (a, isHidden = false) => {
    const isMeteo = a.type === 'meteo'
    const type = isMeteo ? 'wind' : getAlertType(a)
    const icon = isMeteo ? '🌩️' : getAlertIcon(type)
    const severityClass = isMeteo ? `severity-${a.severity}` : `alert-${type}`
    const timeStr = a.onset
      ? new Date(a.onset).toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit' }) +
        ' ' +
        new Date(a.onset).toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' })
      : a.timestamp
      ? new Date(a.timestamp).toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' })
      : ''

    return `
            <div class="alert-card ${severityClass}${
      isHidden ? ' alert-hidden' : ''
    }" title="Klikni za više">
                <div class="alert-icon">${isMeteo ? '⚠️' : icon}</div>
                <div class="alert-info-wrapper">
                    <span class="alert-road">${escapeHtml(a.road || 'Obavijest')}</span>
                    <p class="alert-text">${escapeHtml(a.details)}</p>
                    ${
                      isMeteo
                        ? `<p class="alert-instruction" style="display:none; margin-top:5px; font-size:0.8rem; color:var(--text-dim); border-top:1px solid rgba(255,255,255,0.1); padding-top:5px;">${escapeHtml(
                            a.instruction
                          )}</p>`
                        : ''
                    }
                    ${timeStr ? `<span class="alert-time">${timeStr}</span>` : ''}
                </div>
            </div>
        `
  }

  const visibleAlerts = relevant
    .slice(0, maxVisible)
    .map((a) => renderAlert(a))
    .join('')
  const hiddenAlerts = relevant
    .slice(maxVisible)
    .map((a) => renderAlert(a, true))
    .join('')

  container.innerHTML = visibleAlerts + hiddenAlerts

  // Click to expand individual alert text
  container.querySelectorAll('.alert-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.alert-expand-btn')) return
      card.classList.toggle('expanded')
    })
  })

  // Add expand button if more alerts hidden
  if (hasMore) {
    const expandBtn = document.createElement('button')
    expandBtn.className = 'alert-expand-btn'
    expandBtn.innerHTML = `+ još ${relevant.length - maxVisible}`
    expandBtn.addEventListener('click', () => {
      const isExpanded = widget.classList.toggle('alerts-expanded')
      expandBtn.innerHTML = isExpanded ? 'Sakrij' : `+ još ${relevant.length - maxVisible}`
    })
    container.appendChild(expandBtn)
  }

  // Add Updated At footer
  if (updatedAt) {
    let footer = widget.querySelector('.widget-footer-time')
    if (!footer) {
      footer = document.createElement('div')
      footer.className = 'widget-footer-time'
      footer.style.cssText =
        'font-size: 0.7rem; color: var(--text-muted); margin-top: 10px; text-align: right; border-top: 1px solid var(--border); padding-top: 5px;'
      widget.appendChild(footer)
    }
    const time = new Date(updatedAt).toLocaleTimeString('hr-HR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Zagreb',
    })
    footer.innerText = `Ažurirano: ${time}`
  }
}

function getAlertType(alert) {
  // Parse text content for keywords first (NPT often marks everything as "info")
  const text = (alert.details || '').toLowerCase()

  if (text.includes('vjetar') || text.includes('bura') || text.includes('wind')) return 'wind'
  if (text.includes('nezgod') || text.includes('accident') || text.includes('sudar'))
    return 'accident'
  if (text.includes('zatvoren') || text.includes('closed') || text.includes('obustav'))
    return 'closure'
  if (
    text.includes('radov') ||
    text.includes('oštećenj') ||
    text.includes('kolotrag') ||
    text.includes('održavan')
  )
    return 'roadworks'
  if (text.includes('kvar') || text.includes('vozilo u kvaru')) return 'accident'

  // Fall back to explicit type field if no keywords matched
  if (alert.type) {
    const type = alert.type.toLowerCase()
    if (type === 'wind' || type === 'weather') return 'wind'
    if (type === 'roadworks' || type === 'maintenance') return 'roadworks'
    if (type === 'accident') return 'accident'
    if (type === 'closure') return 'closure'
  }

  return 'info'
}

function getAlertIcon(type) {
  switch (type) {
    case 'wind':
      return '💨'
    case 'roadworks':
      return '🚧'
    case 'accident':
      return '💥'
    case 'closure':
      return '🚫'
    case 'info':
      return 'ℹ️'
    default:
      return '⚠️'
  }
}

// ===========================================
// WEATHER UPDATE
// ===========================================

function updateWeatherWithNPT(weather) {
  if (!weather || weather.length === 0) return

  // Use Island Weather (Local) instead of global
  // Log strongest wind in 75km radius for Ferry/Bridge decisions
  if (!weather || weather.length === 0) return

  // Sort by wind gust desc
  const sorted = [...weather].sort(
    (a, b) => (parseFloat(b.windGust) || 0) - (parseFloat(a.windGust) || 0)
  )

  // Find Senj or Stinica if possible, otherwise max
  // 401 = Senj. If available, it's the gold standard for Ferry.
  // For the UI display, we prefer "Rab (Grad)" if available, otherwise strongest
  const maxWind = sorted[0]
  const rabDisplay = weather.find((s) => s.id === 'EXT:Rab_(Grad)')
  const displayWind = rabDisplay || maxWind

  const gustVal = parseFloat(maxWind.windGust) || 0
  const displayGust = parseFloat(displayWind.windGust) || 0
  const stationName =
    CONFIG.stationNames[maxWind.id] || maxWind.name || maxWind.id || 'Lokacija nepoznata'

  debugLog(
    `Weather: Current max ${gustVal} km/h (Senj/Max), Displaying ${displayGust} km/h (${displayWind.name})`
  )

  // LOGIC: If gust > 80 km/h at the most critical station (Senj/Max), flag potential service break
  const isHighWind = gustVal > 80

  // Update the "More i Vrijeme" widget if it exists
  const windValueEl = document.querySelector('[data-weather="wind"] .weather-value')
  if (windValueEl) {
    windValueEl.textContent = `Vjetar ${Math.round(displayGust)} km/h`
    if (displayWind.id.startsWith('EXT'))
      windValueEl.title = `Lokacija: ${displayWind.name} (Open-Meteo)`

    if (isHighWind) windValueEl.classList.add('val-red')
    else windValueEl.classList.remove('val-red')
  }

  // Update additional weather items from Rab EXT data
  if (rabDisplay) {
    const sunriseEl = document.querySelector('[data-weather="sunrise"] .weather-value')
    if (sunriseEl && rabDisplay.sunrise) {
      sunriseEl.textContent = new Date(rabDisplay.sunrise).toLocaleTimeString('hr-HR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    const seaTempEl = document.querySelector('[data-weather="sea-temp"] .weather-value')
    if (seaTempEl && (state.seaTemp !== null || rabDisplay.seaTemp)) {
      const val = state.seaTemp !== null ? state.seaTemp : rabDisplay.seaTemp
      seaTempEl.textContent = `${typeof val === 'number' ? val.toFixed(1) : val}°C`
      if (state.seaTemp !== null) {
        seaTempEl.title = 'Izvor: DHMZ (meteo.hr) - Službeno mjerenje'
      }
    }

    const headerTempEl = document.getElementById('header-weather-temp')
    if (headerTempEl && rabDisplay.temp) {
      headerTempEl.textContent = `${Math.round(rabDisplay.temp)}°C`
    }
  }

  // Sync with Sidebar Status
  const d8StatusEl = document.getElementById('d8-status')
  if (d8StatusEl && isHighWind && !state.manualOverrides.d8Restricted) {
    d8StatusEl.innerHTML = `⚠️ Otežano zbog vjetra`
    d8StatusEl.className = 'value val-yellow'
  }

  const ferryStatusEl = document.querySelector('[data-live="ferry-misnjak"] .value')
  if (ferryStatusEl && isHighWind && !state.manualOverrides.ferrySuspended) {
    ferryStatusEl.textContent = `⚠️ Moguć prekid (Vjetar)`
    ferryStatusEl.className = 'value val-yellow'
  }

  // Add auto-generated wind alert if high wind detected and no existing wind alert
  if (
    isHighWind &&
    !state.nptAlerts.some(
      (a) => a.details.toLowerCase().includes('vjetar') || a.details.toLowerCase().includes('bura')
    )
  ) {
    debugLog('Weather: High wind detected, generating auto-alert')
  }
}


/** Radio Rab - UI Module */
function initLoadMore() {
  const btn = document.getElementById('load-more-btn')
  if (!btn) return

  btn.addEventListener('click', () => {
    if (!state.isLoading) {
      loadMoreArticles()
    }
  })
}

function hideLoader() {
  const container = document.getElementById('load-more-container')
  if (container) {
    container.style.display = 'none'
  }
}

function showLoader() {
  const container = document.getElementById('load-more-container')
  if (container) {
    container.style.display = 'flex'
    // Also reset button state if it was hidden
    const btn = document.getElementById('load-more-btn')
    if (btn) btn.style.display = 'flex'
  }
}

// ===========================================
// FILTERS
// ===========================================
function initFilters() {
  const buttons = document.querySelectorAll('.filter-btn')

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.cat
      if (category === state.activeCategory) return

      // Update button states
      buttons.forEach((b) => {
        b.classList.remove('active')
        b.setAttribute('aria-pressed', 'false')
      })
      btn.classList.add('active')
      btn.setAttribute('aria-pressed', 'true')

      // Reset and reload
      state.activeCategory = category
      state.currentVisibleCount = 0

      const grid = document.getElementById('news-grid')
      if (grid) {
        grid.innerHTML = ''
        showLoader()
        loadMoreArticles()
      }
    })
  })

  // Enable dragging/scrolling the filter bar with mouse (desktop) and keep touch scrolling
  const filterBar = document.querySelector('.filter-bar')
  if (filterBar) {
    let isDown = false
    let startX
    let scrollLeft

    filterBar.addEventListener('mousedown', (e) => {
      isDown = true
      filterBar.classList.add('dragging')
      startX = e.pageX - filterBar.offsetLeft
      scrollLeft = filterBar.scrollLeft
      filterBar.style.cursor = 'grabbing'
      e.preventDefault()
    })

    filterBar.addEventListener('mouseleave', () => {
      isDown = false
      filterBar.classList.remove('dragging')
      filterBar.style.cursor = ''
    })

    filterBar.addEventListener('mouseup', () => {
      isDown = false
      filterBar.classList.remove('dragging')
      filterBar.style.cursor = ''
    })

    filterBar.addEventListener('mousemove', (e) => {
      if (!isDown) return
      const x = e.pageX - filterBar.offsetLeft
      const walk = (x - startX) * 1 //scroll-fast
      filterBar.scrollLeft = scrollLeft - walk
    })
  }
}

// ===========================================
// NAVIGATION
// ===========================================
function initNavigation() {
  const navTriggers = document.querySelectorAll('.nav-trigger[data-tab]')
  const tabContents = document.querySelectorAll('.tab-content')
  const widgetLinks = document.querySelectorAll('.widget-link[data-tab]')

  // Combine all navigation triggers
  const allTriggers = [...navTriggers, ...widgetLinks]

  allTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault()
      const targetTab = trigger.dataset.tab
      if (!targetTab) return

      switchTab(targetTab, navTriggers, tabContents)
    })
  })
}

// Simple hamburger feedback for demo: toggles a small overlay showing menu is active
function initHamburger() {
  const btn = document.getElementById('header-menu-btn')
  if (!btn) return
  let open = false

  const off = document.getElementById('offcanvas-menu')
  const backdrop = document.getElementById('offcanvas-backdrop')
  const offclose = document.getElementById('offcanvas-close')

  btn.addEventListener('click', (e) => {
    e.preventDefault()
    open = !open
    btn.setAttribute('aria-expanded', String(open))

    if (off && backdrop) {
      off.setAttribute('aria-hidden', String(!open))
      backdrop.hidden = !open
    }
  })

  // Backdrop click and close button handling for the offcanvas menu
  backdrop?.addEventListener('click', () => {
    open = false
    off?.setAttribute('aria-hidden', 'true')
    backdrop.hidden = true
    btn.setAttribute('aria-expanded', 'false')
  })
  offclose?.addEventListener('click', () => {
    open = false
    off?.setAttribute('aria-hidden', 'true')
    backdrop.hidden = true
    btn.setAttribute('aria-expanded', 'false')
  })

  // Wire reporter link inside offcanvas to open reporter modal
  document.getElementById('offcanvas-reporter')?.addEventListener('click', (e) => {
    e.preventDefault()
    const modal = document.getElementById('reporter-modal')
    if (modal) openModal(modal)
    // close offcanvas
    open = false
    off?.setAttribute('aria-hidden', 'true')
    backdrop.hidden = true
    btn.setAttribute('aria-expanded', 'false')
  })
}

// Ensure sticky offsets (filter bar) respect the actual header & ticker size (fixes mobile overlap)
function initStickyOffsets() {
  const wrapper = document.querySelector('.filter-sticky-wrapper')
  if (!wrapper) return

  const ticker = document.querySelector('.news-ticker')
  const header = document.querySelector('.site-header')

  function updateTop() {
    const tickerH = ticker
      ? Math.ceil(ticker.getBoundingClientRect().height)
      : parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ticker-height')) ||
      0

    // Ensure header anchors immediately below the ticker to avoid tiny overlap
    header.style.top = `${tickerH}px`

    // Use header's bottom to place the sticky wrapper exactly below it
    const headerBottom = Math.ceil(header.getBoundingClientRect().bottom)

    // Minimal gap (0) — visual nudge handled in CSS to keep JS math exact
    const gap = 0

    if (window.innerWidth <= 768) {
      wrapper.style.top = `${headerBottom + gap}px`
    } else {
      wrapper.style.top = `calc(var(--ticker-height) + var(--header-height))`
    }
  }

  // Initial set
  updateTop()

  // Update on resize and orientation change
  window.addEventListener('resize', updateTop, { passive: true })
  window.addEventListener('orientationchange', updateTop)

  // If ResizeObserver available, watch header size changes
  if (window.ResizeObserver && header) {
    const ro = new ResizeObserver(updateTop)
    ro.observe(header)
    if (ticker) ro.observe(ticker)
  }
}

// Show/hide scroll hint overlays on the filter bar based on scroll position
function initFilterScrollHints() {
  const wrapper = document.querySelector('.filter-sticky-wrapper')
  const bar = document.querySelector('.filter-bar')
  if (!wrapper || !bar) return

  const leftHint = wrapper.querySelector('.filter-scroll-hint.left')
  const rightHint = wrapper.querySelector('.filter-scroll-hint.right')

  function updateHints() {
    const maxScrollLeft = bar.scrollWidth - bar.clientWidth
    if (bar.scrollLeft > 8) wrapper.classList.add('has-scroll-left')
    else wrapper.classList.remove('has-scroll-left')

    if (bar.scrollLeft < maxScrollLeft - 8) wrapper.classList.add('has-scroll-right')
    else wrapper.classList.remove('has-scroll-right')

    // Hints are positioned by syncFilterHintPositions(); do not modify transforms here
  }

  // Initial
  updateHints()

  bar.addEventListener(
    'scroll',
    () => {
      requestAnimationFrame(updateHints)
    },
    { passive: true }
  )

  // Also update on resize
  window.addEventListener('resize', updateHints, { passive: true })
}

// Ensure hint overlays line up exactly with the visible filter bar
function syncFilterHintPositions() {
  const wrapper = document.querySelector('.filter-sticky-wrapper')
  const bar = document.querySelector('.filter-bar')
  const leftHint = wrapper?.querySelector('.filter-scroll-hint.left')
  const rightHint = wrapper?.querySelector('.filter-scroll-hint.right')
  if (!wrapper || !bar || !leftHint || !rightHint) return

  function sync() {
    const wrapperRect = wrapper.getBoundingClientRect()
    const barRect = bar.getBoundingClientRect()
    // Compute top relative to wrapper
    const top = Math.max(0, Math.round(barRect.top - wrapperRect.top))
    const height = Math.max(0, Math.round(barRect.height))

    leftHint.style.top = top + 'px'
    leftHint.style.height = height + 'px'
    leftHint.style.left = '0px'

    rightHint.style.top = top + 'px'
    rightHint.style.height = height + 'px'
    rightHint.style.right = '0px'
  }

  // Run immediately
  sync()

  // Update on resize/orientation
  window.addEventListener('resize', sync, { passive: true })
  window.addEventListener('orientationchange', sync)

  // Observe size changes to the bar
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(sync)
    ro.observe(bar)
    ro.observe(wrapper)
  }
}

function switchTab(targetTab, navTriggers, tabContents) {
  // Update nav states (both desktop and mobile)
  navTriggers.forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === targetTab)
  })

  // Switch content
  tabContents.forEach((content) => {
    const isActive = content.id === targetTab
    content.classList.toggle('active', isActive)

    // Fix Leaflet map sizing when becoming visible
    if (isActive && targetTab === 'map' && state.mapInstance) {
      setTimeout(() => {
        state.mapInstance.invalidateSize(true)
        updateMapVisualization() // Re-render markers to ensure correct placement
      }, 500) // Increased timeout to wait for CSS animation
    }
  })

  // Scroll to top of content
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ===========================================
// MODAL
// ===========================================
function initModal() {
  const modal = document.getElementById('reporter-modal')
  const openTrigger = document.getElementById('reporter-link')
  const closeBtn = modal?.querySelector('.modal-close')

  if (!modal) return

  // Make the header "Kontakt" link open the reporter modal
  if (openTrigger) {
    openTrigger.addEventListener('click', (e) => {
      e.preventDefault()
      openModal(modal)
    })
  }

  closeBtn?.addEventListener('click', () => closeModal(modal))

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal(modal)
    }
  })

  // Form Submission (Updated for MVP)
  const form = modal.querySelector('.reporter-form')
  form?.addEventListener('submit', (e) => {
    e.preventDefault()
    const btn = form.querySelector('.submit-btn')
    const originalText = btn.textContent

    // Get form data
    const formData = new FormData(form)
    const name = form.querySelector('input[type="text"]').value
    const email = form.querySelector('input[type="email"]').value
    const body = form.querySelector('textarea').value

    // Create "Submitted" article entry
    const newSubmission = {
      id: `submission-${Date.now()}`,
      title: `Prijava: ${body.substring(0, 30)}...`,
      snippet: body.substring(0, 100) + '...',
      body: `<p>${body}</p><p><strong>Pošiljatelj:</strong> ${name} (${email})</p>`,
      category: 'LOKALNO',
      image: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=600&fit=crop', // Placeholder for submitted
      author: name,
      date: 'Upravo sada',
      readTime: '1 min',
      status: 'submitted', // Moderation status
      timestamp: new Date().toISOString(),
      tags: ['prijava', 'citizen-reporter'],
    }

    // Loading state
    btn.textContent = 'Slanje...'
    btn.disabled = true

    setTimeout(() => {
      // Save to global state
      state.allArticles.unshift(newSubmission)
      saveArticles()

      // Success state
      btn.textContent = 'Hvala! Primljeno.'
      btn.style.background = 'var(--success)'

      setTimeout(() => {
        closeModal(modal)
        form.reset()
        setTimeout(() => {
          btn.textContent = originalText
          btn.disabled = false
          btn.style.background = ''
        }, 300)
      }, 1000)
    }, 1500)
  })
}

function initNewsReaderModal() {
  const nrModal = document.getElementById('news-reader-modal')
  if (!nrModal) return

  // Close with button
  nrModal.querySelector('.modal-close')?.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    closeModal(nrModal)
  })

  // Prevent clicks inside the content from closing the backdrop
  nrModal.querySelector('.modal-content')?.addEventListener('click', (e) => {
    e.stopPropagation()
  })

  // Close on backdrop click (with protection against same-event-click)
  nrModal.addEventListener('click', (e) => {
    if (e.target === nrModal) {
      // Only close if it wasn't JUST opened (prevents event race condition)
      if (Date.now() - (nrModal._openedAt || 0) > 300) {
        closeModal(nrModal)
      }
    }
  })
}

function openModal(modal) {
  modal.hidden = false
  modal.scrollTop = 0
  document.body.style.overflow = 'hidden'
  modal.querySelector('input')?.focus()
}

function closeModal(modal) {
  modal.hidden = true
  document.body.style.overflow = ''
}

// ===========================================
// RADIO PLAYER (Demo)
// ===========================================
function initRadioPlayer() {
  const playBtn = document.getElementById('radio-play')
  const radioPlayer = document.getElementById('radio-player')
  if (!playBtn) return

  // Stream URL from config
  const audio = new Audio(CONFIG.urls.radioStream)

  audio.addEventListener('error', (e) => {
    debugError('Radio Stream Error:', e)
  })

  playBtn.addEventListener('click', () => {
    const isPlaying = playBtn.classList.contains('playing')
    const isLoading = playBtn.classList.contains('loading')
    if (isPlaying || isLoading) {
      // Pause
      audio.pause()
      audio.currentTime = 0
      playBtn.classList.remove('playing', 'loading')
      radioPlayer?.classList.remove('is-playing')
    } else {
      // Play
      playBtn.classList.add('loading')

      audio
        .play()
        .then(() => {
          playBtn.classList.remove('loading')
          playBtn.classList.add('playing')
          radioPlayer?.classList.add('is-playing')
        })
        .catch((err) => {
          playBtn.classList.remove('loading')
          debugError('Playback failed:', err)
          // Help user with HTTPS/Mixed content block
          if (window.location.protocol === 'https:') {
            alert(
              'Problem s pokretanjem: Preglednik blokira ovaj stream na HTTPS stranici. Pokušajte kliknuti na direktni link ispod playera.'
            )
            showDirectLink()
          }
        })
    }
  })

  function updateSongTitle(text) {
    const songTitle = document.querySelector('.song-title')
    const nowPlayingLabel = document.querySelector('.now-playing')

    if (songTitle && songTitle.textContent !== text) {
      // Animate the transition
      songTitle.classList.add('updating')
      setTimeout(() => {
        songTitle.textContent = text
        songTitle.classList.remove('updating')
      }, 300)
    }

    if (nowPlayingLabel) {
      // Reset label if we are just showing station name
      if (text === 'Radio Rab - 24/7' || text === 'Radio Rab - Uživo (92.6FM)') {
        nowPlayingLabel.textContent = 'Sada svira'
        nowPlayingLabel.style.color = ''
      }
    }
  }

  function startMetadataUpdates() {
    fetchMetadata()
  }

  function stopMetadataUpdates() {
    if (state.metadataTimeout) {
      clearTimeout(state.metadataTimeout)
      state.metadataTimeout = null
    }
  }

  function showDirectLink() {
    const container = document.querySelector('.radio-widget')
    if (!container || document.getElementById('direct-stream-link')) return

    const linkBox = document.createElement('div')
    linkBox.id = 'direct-stream-link'
    linkBox.style.cssText =
      'font-size: 0.7rem; margin-top: 1rem; text-align: center; color: var(--text-muted);'
    linkBox.innerHTML = `⚠️ Blokiran HTTPS od strane preglednika.<br><a href="${CONFIG.urls.radioStreamDirect}" target="_blank" style="color: var(--primary); text-decoration: underline;">Kliknite ovdje za slušanje u novom TAB-u</a>`
    container.appendChild(linkBox)
  }

  async function fetchMetadata() {
    const proxyBase = CONFIG.urls.corsProxy
    const timestamp = Date.now()
    let nextDelay = 15000 // Default fallback

    debugLog('Radio: Fetching metadata...')

    try {
      // Fetch all three in parallel, but don't let one failure stop the others
      const results = await Promise.allSettled([
        fetchCurrentSong(proxyBase, timestamp),
        fetchHistory(proxyBase, timestamp),
        fetchNext(proxyBase, timestamp),
      ])

      const currentSongResult = results[0]
      const expireTime =
        currentSongResult.status === 'fulfilled' ? currentSongResult.value : null

      if (expireTime) {
        const now = new Date()
        const [hours, minutes, seconds] = expireTime.split(':').map(Number)
        const expireDate = new Date()
        expireDate.setHours(hours, minutes, seconds)

        // Handle case where expire time is tomorrow (e.g. crossing midnight)
        if (expireDate < now && now.getTime() - expireDate.getTime() > 12 * 60 * 60 * 1000) {
          expireDate.setDate(expireDate.getDate() + 1)
        }

        const diff = expireDate.getTime() - now.getTime()
        if (diff > 0) {
          // Update 1s after song ends
          nextDelay = diff + 1500
          debugLog(`Next update scheduled in ${Math.round(nextDelay / 1000)}s (at ${expireTime})`)
        } else {
          // Song supposedly ended, check soon
          nextDelay = 5000
        }
      }
    } catch (e) {
      debugWarn('Radio: Metadata fetch error:', e)
      // On error, retry sooner
      nextDelay = 5000
    }

    debugLog(`Radio: Next update in ${Math.round(nextDelay / 1000)}s`)
    state.metadataTimeout = setTimeout(fetchMetadata, nextDelay)
  }

  async function fetchCurrentSong(proxyBase, timestamp) {
    const targetUrl = `${CONFIG.urls.metadataBase}/NowOnAir.xml?t=${timestamp}`
    let response

    // Fallback logic
    for (const proxy of [
      (u) => u, // Try direct first!
      (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
      (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u) => `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(u)}`,
    ]) {
      try {
        response = await fetch(proxy(targetUrl))
        if (response.ok) break
      } catch (e) { }
    }
    if (!response || !response.ok) return null
    const str = await response.text()
    const xmlDoc = new DOMParser().parseFromString(str, 'text/xml')

    // Target the active event - Song is child of Event, Artist/Expire are children of Song
    const event = xmlDoc.querySelector('Event[status="happening"]')
    const songEl = event?.querySelector('Song')
    const artist = songEl?.querySelector('Artist')?.getAttribute('name')
    const songTitle = songEl?.getAttribute('title')
    const expireTime = songEl?.querySelector('Expire')?.getAttribute('Time')

    if (artist && songTitle) {
      updateSongTitle(`${artist} - ${songTitle}`)
      const nowPlayingLabel = document.querySelector('.now-playing')
      if (nowPlayingLabel) {
        // Visual feedback for live status
        nowPlayingLabel.textContent = '🎵 UŽIVO'
        nowPlayingLabel.style.color = 'var(--primary)'
        nowPlayingLabel.style.fontWeight = 'bold'
      }
    }

    return expireTime
  }

  async function fetchHistory(proxyBase, timestamp) {
    const targetUrl = `${CONFIG.urls.metadataBase}/AirPlayHistory.xml?t=${timestamp}`
    let response

    // Fallback logic
    for (const proxy of [
      (u) => u, // Try direct first!
      (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
      (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u) => `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(u)}`,
    ]) {
      try {
        response = await fetch(proxy(targetUrl))
        if (response.ok) break
      } catch (e) { }
    }
    if (!response.ok) return
    const str = await response.text()
    const xmlDoc = new DOMParser().parseFromString(str, 'text/xml')

    // Items are in chronological order, so we take the last few for "most recent"
    // But typically history file has oldest at top? Let's check structure.
    // Based on typical log: appending. So last items are newest?
    // Let's take the last 5 items and reverse them so newest is at top.
    const allSongs = Array.from(xmlDoc.querySelectorAll('Song'))
    const songs = allSongs.slice(-5).reverse()

    const listContainer = document.getElementById('playlist-items')
    const mainContainer = document.getElementById('playlist-container')

    if (songs.length > 0 && listContainer) {
      mainContainer.hidden = false
      listContainer.innerHTML = ''

      songs.forEach((song) => {
        const title = song.getAttribute('title')
        const artist = song.querySelector('Artist')?.getAttribute('name')
        const info = song.querySelector('Info')
        const startTime = info?.getAttribute('StartTime')?.substring(0, 5) || '' // HH:MM

        if (title && artist) {
          const item = document.createElement('div')
          item.className = 'playlist-item'
          item.innerHTML = `
                        <span class="playlist-time">${startTime}</span>
                        <div class="playlist-meta">
                            <span class="playlist-artist">${escapeHtml(artist)}</span>
                            <span class="playlist-song">${escapeHtml(title)}</span>
                        </div>
                    `
          listContainer.appendChild(item)
        }
      })
    }
  }

  async function fetchNext(proxyBase, timestamp) {
    const targetUrl = `${CONFIG.urls.metadataBase}/AirPlayNext.xml?t=${timestamp}`
    let response

    // Fallback logic
    for (const proxy of [
      (u) => u, // Try direct first!
      (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
      (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u) => `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(u)}`,
    ]) {
      try {
        response = await fetch(proxy(targetUrl))
        if (response.ok) break
      } catch (e) { }
    }
    if (!response || !response.ok) return
    const str = await response.text()
    const xmlDoc = new DOMParser().parseFromString(str, 'text/xml')

    const nextSong = xmlDoc.querySelector('Event[status="coming up"] Song')

    if (nextSong) {
      const title = nextSong.getAttribute('title')
      const artist = nextSong.querySelector('Artist')?.getAttribute('name')
      const container = document.getElementById('next-up-container')

      if (title && artist && container) {
        container.hidden = false
        document.getElementById('next-artist').textContent = artist
        document.getElementById('next-song').textContent = title
      }
    }
  }

  // Start polling immediately
  startMetadataUpdates()

  // Cleanup on page unload
  window.addEventListener('beforeunload', stopMetadataUpdates)
}

// ===========================================
// DATE DISPLAY
// ===========================================
function initDateDisplay() {
  const dateEl = document.querySelector('.current-date')
  if (!dateEl) return

  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }

  const now = new Date()
  dateEl.textContent = now.toLocaleDateString('hr-HR', options)
}

// ===========================================
// SCROLL EFFECTS
// ===========================================
function initScrollEffects() {
  const nav = document.querySelector('.news-nav')
  if (!nav) return

  let scrollTimeout

  function handleScroll() {
    const scrolled = window.scrollY > 100
    nav.style.background = scrolled ? 'rgba(2, 6, 23, 0.95)' : 'rgba(15, 23, 42, 0.85)'
  }

  window.addEventListener(
    'scroll',
    () => {
      if (scrollTimeout) {
        cancelAnimationFrame(scrollTimeout)
      }
      scrollTimeout = requestAnimationFrame(handleScroll)
    },
    { passive: true }
  )
}

// ===========================================
// UTILITIES
// ===========================================
function openReaderMode(id) {
  const article = state.allArticles.find((a) => a.id === id)
  if (!article) return

  const modal = document.getElementById('news-reader-modal')
  if (!modal) return

  // Populate Elements
  const breadcrumbs = document.getElementById('reader-breadcrumbs')
  const meta = document.getElementById('reader-meta')
  const title = document.getElementById('reader-title')
  const heroImg = document.getElementById('reader-hero-img')
  const aiText = document.getElementById('reader-ai-text')
  const body = document.getElementById('reader-body')
  const aiSummaryBox = document.getElementById('reader-ai-summary')

  if (breadcrumbs) {
    breadcrumbs.innerHTML = `
      <a href="#" class="breadcrumb-home">Naslovnica</a>
      <span class="sep">/</span>
      <span class="current">${article.category}</span>
    `
    breadcrumbs.querySelector('.breadcrumb-home')?.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      closeModal(modal)
    })
  }

  if (meta) meta.textContent = `${article.date} · ${article.readTime || '4 min'} čitanja`
  if (title) title.textContent = article.title
  if (heroImg) heroImg.style.backgroundImage = `url('${article.image}')`

  if (aiSummaryBox) {
    if (article.category === 'OSMRTNICE') {
      aiSummaryBox.setAttribute('hidden', '')
    } else {
      aiSummaryBox.removeAttribute('hidden')
      if (aiText)
        aiText.textContent =
          article.aiSummary || 'Automatski sažetak članka trenutno nije dostupan.'
    }
  }

  if (body) {
    const isObituary = article.category === 'OSMRTNICE'
    body.innerHTML = `
      ${isObituary ? `<img src="${article.image}" class="obituary-full-img" alt="Osmrtnica">` : ''}
      ${article.body || `<p>${escapeHtml(article.snippet)}</p>`}
    `
  }

  // Handle sharing in modal
  modal.querySelectorAll('[data-share]').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation()
      shareArticle(btn.dataset.share)
    }
  })

  // Set opening timestamp to prevent accidental auto-close
  modal._openedAt = Date.now()
  openModal(modal)
}

function shareArticle(method) {
  const url = window.location.href
  const title = document.querySelector('.main-feature h2')?.textContent || 'Radio Rab'

  switch (method) {
    case 'copy':
      navigator.clipboard.writeText(url).then(() => {
        alert('Poveznica kopirana!')
      })
      break
    case 'twitter':
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          title
        )}&url=${encodeURIComponent(url)}`,
        '_blank'
      )
      break
    case 'facebook':
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        '_blank'
      )
      break
  }
}

/**
 * Initialize Back to Top Button
 */
function initBackToTop() {
  const btn = document.getElementById('back-to-top')
  if (!btn) return

  const showThreshold = 400

  const toggleVisibility = () => {
    if (window.scrollY > showThreshold) {
      btn.classList.add('visible')
    } else {
      btn.classList.remove('visible')
    }
  }

  window.addEventListener('scroll', toggleVisibility, { passive: true })
  toggleVisibility()

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })
}

function initMarketplace() {
  const container = document.querySelector('#market .demo-placeholder')
  if (!container) return

  const marketSection = document.getElementById('market')
  marketSection.innerHTML = `
        <div class="section-header">
            <h2>RAPSKA TRŽNICA</h2>
            <p>Najbolje od lokalnih proizvođača</p>
        </div>
        <div class="market-grid">
            ${(typeof MARKET_ITEMS !== 'undefined' ? MARKET_ITEMS : getMockMarketItems())
      .map(
        (item) => `
                <div class="market-card card-animate">
                    <div class="market-img" style="background-image: url('${escapeHtml(
          item.image
        )}')">
                        <span class="price-tag">${escapeHtml(item.price)}</span>
                    </div>
                    <div class="market-info">
                        <h3>${escapeHtml(item.title)}</h3>
                        <p class="seller">${escapeHtml(item.seller)}</p>
                        <button class="btn-market">Kontaktiraj</button>
                    </div>
                </div>
            `
      )
      .join('')}
        </div>
    `
}

function getMockMarketItems() {
  return [
    {
      title: 'Domaće Maslinovo Ulje',
      seller: 'OPG Kaštelan',
      price: '18 €/l',
      image: 'https://picsum.photos/seed/oil/400/300',
    },
    {
      title: 'Rapska Torta',
      seller: 'Vilma Slastice',
      price: '25 €',
      image: 'https://picsum.photos/seed/cake/400/300',
    },
    {
      title: 'Med od Kadulje',
      seller: 'Pčelarstvo Krstić',
      price: '12 €',
      image: 'https://picsum.photos/seed/honey/400/300',
    },
    {
      title: 'Ovčji Sir',
      seller: 'OPG Gvačić',
      price: '30 €/kg',
      image: 'https://picsum.photos/seed/cheese/400/300',
    },
    {
      title: 'Domace Tjestenine',
      seller: 'Pasta Rab',
      price: '8 €',
      image: 'https://picsum.photos/seed/pasta/400/300',
    },
    {
      title: 'Rapski Likeri',
      seller: 'Destilerija Rab',
      price: '22 €',
      image: 'https://picsum.photos/seed/liqueur/400/300',
    },
  ]
}

function initVideos() {
  const container = document.querySelector('#shorts .demo-placeholder')
  if (!container) return

  const videosSection = document.getElementById('shorts')
  videosSection.innerHTML = `
        <div class="section-header">
            <h2>VIDEO</h2>
            <p>Aktualni video sadržaji</p>
        </div>
        <div class="video-grid">
            ${getMockVideos()
      .map(
        (video) => `
                <div class="video-card card-animate">
                    <div class="video-thumb" style="background-image: url('${escapeHtml(
          video.thumbnail
        )}')">
                        <span class="video-duration">${escapeHtml(video.duration)}</span>
                        <div class="play-btn">▶</div>
                    </div>
                    <div class="video-info">
                        <h3>${escapeHtml(video.title)}</h3>
                        <p class="video-meta">${escapeHtml(video.views)} pregleda</p>
                    </div>
                </div>
            `
      )
      .join('')}
        </div>
    `
}

function getMockVideos() {
  return [
    {
      title: 'Festival Rapske Fjere 2024',
      duration: '3:45',
      views: '12K',
      thumbnail: 'https://picsum.photos/seed/fjere/400/225',
    },
    {
      title: 'Katedrala sv. Kristofora',
      duration: '2:30',
      views: '8.5K',
      thumbnail: 'https://picsum.photos/seed/katedrala/400/225',
    },
    {
      title: 'Rabski Korzo u proljece',
      duration: '4:15',
      views: '15K',
      thumbnail: 'https://picsum.photos/seed/korzo/400/225',
    },
  ]
}


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
