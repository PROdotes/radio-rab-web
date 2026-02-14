/**
 * Radio Rab News Portal — Weather & Traffic Module
 * Extracted from script.js
 */
/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */

async function initNPT() {
  debugLog('NPT System: Initializing...')

  let data = null

  if (typeof NPT_DATA !== 'undefined') {
    debugLog('NPT: Loading from window.NPT_DATA')
    data = NPT_DATA
  } else {
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
    const alerts = Array.isArray(data) ? data : data.events || data.alerts || []
    const weather = Array.isArray(data) ? null : data.weather || null
    const islandWeather = Array.isArray(data) ? null : data.islandWeather || null
    const islandCounters = Array.isArray(data) ? null : data.islandCounters || data.counters || null
    const allCounters = Array.isArray(data) ? null : data.counters || null
    const updatedAt = Array.isArray(data) ? null : data.updatedAt || null

    state.nptAlerts = alerts
    state.nptWeather = weather
    state.nptIslandWeather = islandWeather
    state.nptIslandCameras = Array.isArray(data) ? [] : data.islandCameras || []
    state.nptCounters = islandCounters
    state.nptUpdatedAt = updatedAt

    try {
      const externalRab = await fetchExternalWeather(44.7554, 14.761, 'Rab (Grad)')
      if (externalRab) {
        if (!state.nptIslandWeather) state.nptIslandWeather = []
        const existingIdx = state.nptIslandWeather.findIndex((w) => w.id === externalRab.id)
        if (existingIdx >= 0) state.nptIslandWeather[existingIdx] = externalRab
        else state.nptIslandWeather.unshift(externalRab)
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

    updateSyncStatus(updatedAt)

    updateMapVisualization()

    addMapControls()

    initMeteoAlerts()

    if (!state.nptRefreshInterval) {
      state.nptRefreshInterval = setInterval(initNPT, CONFIG.nptRefreshInterval)
      debugLog(`NPT: Auto-refresh enabled (every ${CONFIG.nptRefreshInterval / 1000}s)`)
    }
  } catch (e) {
    debugWarn('NPT: Error processing data:', e)
    updateSyncStatus(null, true)
  }
}

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

async function fetchExternalWeather(lat, lng, name) {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=sunrise,sunset&timezone=auto`
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=sea_surface_temperature&daily=tide_height_max&timezone=auto`

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
      tideTime: marineData?.daily?.time?.[0],
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

  if (state.tickerBaseline === null) {
    state.tickerBaseline = tickerContent.innerHTML
  }

  const combined = [...(state.meteoAlerts || []), ...alerts]
  const critical = combined
    .filter((a) => {
      if (a.type === 'meteo') {
        return a.severity === 'orange' || a.severity === 'red'
      }
      const details = (a.details || '').toLowerCase()
      const road = (a.road || '').toUpperCase()
      const rabRegex = /\b(rab|rapsk)[a-z]{0,3}\b/i

      return (
        rabRegex.test(details) ||
        details.includes('stinica') ||
        details.includes('mišnjak') ||
        road.includes('D105') ||
        (road.includes('D8') && (details.includes('senj') || details.includes('buri')))
      )
    })
    .slice(0, 3)

  if (critical.length === 0) {
    tickerContent.innerHTML = state.tickerBaseline
    return
  }

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

  tickerContent.innerHTML = alertItems + state.tickerBaseline
}

async function initMeteoAlerts() {
  debugLog('MeteoAlerts: Fetching official warnings...')

  const urls = [
    CONFIG.urls.meteo.today,
    CONFIG.urls.meteo.tomorrow,
    CONFIG.urls.meteo.dayAfterTomorrow,
  ]

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

            const severity = levelValue.split(';')[1]?.trim().toLowerCase() || 'info'

            const eventName = info.querySelector('event')?.textContent || 'Upozorenje'
            allParsedAlerts.push({
              source: 'DHMZ',
              type: 'meteo',
              event: eventName,
              severity: severity,
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

    state.meteoAlerts = deduplicateMeteoAlerts(allParsedAlerts)
    debugLog(`MeteoAlerts: Found ${state.meteoAlerts.length} relevant warnings`)

    if (state.nptAlerts) {
      updateTrafficAlerts(state.nptAlerts, state.nptUpdatedAt)
    }
    updateWeatherWarningBadge()
  } catch (err) {
    debugWarn('MeteoAlerts: Global Fetch Failed', err)
  }
}

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

async function initSeaQuality() {
  debugLog('SeaQuality: Initializing...')
  let data = null

  if (typeof IZOR_DATA !== 'undefined') {
    debugLog('SeaQuality: Loading from window.IZOR_DATA')
    data = IZOR_DATA
  } else {
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

  const cityName = (point.lgrad || '').trim()
  const candidates = [point.lnaziv, point.lpla, point.lnaz]
    .map((v) => (v || '').trim())
    .filter(Boolean)

  function looksSpecific(name) {
    if (!name) return false
    const lower = name.toLowerCase()
    if (lower.includes('uvala') || lower.includes('u. ') || lower.includes('uvala')) return true
    if (name.split(/\s+/).length > 1) return true
    return false
  }

  let locationName = 'Lokacija'
  for (const c of candidates) {
    if (!c) continue
    if (cityName && c.toLowerCase() === cityName.toLowerCase()) continue
    if (looksSpecific(c)) {
      locationName = c
      break
    }
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

function updateTrafficAlerts(alerts, updatedAt) {
  const widget = document.getElementById('traffic-alerts-widget')
  const container = document.getElementById('alert-items-container')
  if (!widget || !container) return

  const combinedAlerts = [...(state.meteoAlerts || []), ...alerts]

  const relevant = combinedAlerts.filter((a) => {
    if (a.type === 'meteo') return true

    const details = (a.details || '').toLowerCase()
    const road = (a.road || '').toUpperCase()
    const lat = parseFloat(a.lat)
    const lng = parseFloat(a.lng)

    const rabRegex = /\b(rab|rapsk)[a-z]{0,3}\b/i
    const hasRabKeyword = rabRegex.test(details)
    const hasFerryKeyword =
      details.includes('stinica') ||
      details.includes('mišnjak') ||
      details.includes('trajekt') ||
      details.includes('jadrolinija')

    if (hasRabKeyword || hasFerryKeyword || road.includes('D105')) return true

    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      const dist = getDistanceFromLatLonInKm(44.7554, 14.761, lat, lng)

      if (dist < 35) return true

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

    return false
  })

  if (relevant.length === 0) {
    widget.style.display = 'none'
    return
  }

  widget.style.display = 'block'

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

  container.querySelectorAll('.alert-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.alert-expand-btn')) return
      card.classList.toggle('expanded')
    })
  })

  if (hasMore) {
    const expandBtn = document.createElement('button')
    expandBtn.className = 'alert-expand-btn'
    expandBtn.innerHTML = `+ još ${relevant.length - maxVisible}`
    expandBtn.addEventListener('click', () => {
      const isExpanded = widget.classList.toggle('alerts_expanded')
      expandBtn.innerHTML = isExpanded ? 'Sakrij' : `+ još ${relevant.length - maxVisible}`
    })
    container.appendChild(expandBtn)
  }

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

function updateWeatherWithNPT(weather) {
  if (!weather || weather.length === 0) return

  const sorted = [...weather].sort(
    (a, b) => (parseFloat(b.windGust) || 0) - (parseFloat(a.windGust) || 0)
  )

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

  const isHighWind = gustVal > 80

  const windValueEl = document.querySelector('[data-weather="wind"] .weather-value')
  if (windValueEl) {
    windValueEl.textContent = `Vjetar ${Math.round(displayGust)} km/h`
    if (displayWind.id.startsWith('EXT'))
      windValueEl.title = `Lokacija: ${displayWind.name} (Open-Meteo)`

    if (isHighWind) windValueEl.classList.add('val-red')
    else windValueEl.classList.remove('val-red')
  }

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

  if (
    isHighWind &&
    !state.nptAlerts.some(
      (a) => a.details.toLowerCase().includes('vjetar') || a.details.toLowerCase().includes('bura')
    )
  ) {
    debugLog('Weather: High wind detected, generating auto-alert')
  }
}
