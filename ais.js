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
  // 1. Primary Source: Our live AIS snapshot (data/ais-snapshot.json)
  if (state.aisData) {
    // If the snapshot is for the requested vessel (checking name or IMO if available)
    // Or if this is the main ferry (since we mostly track one for now)
    const isMainFerry = (imo === '9822621' || imo === '238838340');

    if (isMainFerry || state.aisData.imo === imo) {
      debugLog('Using live AIS snapshot for modal:', state.aisData.name);
      return {
        ...state.aisData,
        source: 'Live Snapshot (AISStream)',
        note: 'Podaci u stvarnom vremenu osvježeni unutar zadnjih 5 minuta.'
      };
    }
  }

  // 2. Try to fetch from local proxy server (fallback for development)
  const proxyUrl = `http://localhost:3001/api/vessel/${imo}`;
  try {
    const response = await fetchWithRetry(proxyUrl);
    if (response) return await response.json();
  } catch (err) { }

  // 3. Last resort: public sources (likely CORS blocked)
  throw new Error('Live AIS podaci nisu dostupni. Za direktan uvid koristite kartu.');
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
          ${data.note
      ? `
            <div style="padding: 0.75rem; margin-bottom: 1rem; background: rgba(59, 130, 246, 0.1); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.875rem; color: var(--text-dim);">
              ℹ️ ${data.note}
            </div>
          `
      : ''
    }
          <div style="font-size: 0.75rem; color: var(--text-dim); display: flex; justify-content: space-between; align-items: center;">
            <span>Izvor: ${data.source}</span>
            <button onclick="window.open('https://www.vesselfinder.com/vessels/details/${data.imo
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
