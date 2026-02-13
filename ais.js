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
  // Try to load from local data file first
  try {
    const response = await fetch('data/ferry-ais.json')
    if (response.ok) {
      const data = await response.json()
      console.log('Using local AIS data:', data)
      return data
    }
  } catch (err) {
    console.warn('Local AIS data not available:', err)
  }

  // Try to get data from AISStream WebSocket if available
  if (window.aisStreamClient && window.aisStreamClient.getLatestData()) {
    const data = window.aisStreamClient.getLatestData()
    console.log('Using live AISStream data:', data)
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
