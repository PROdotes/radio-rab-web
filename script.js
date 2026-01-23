/**
 * Radio Rab News Portal — Main Application
 * Version: 2.0.0
 */

// ===========================================
// CONFIGURATION
// ===========================================
const CONFIG = {
    itemsPerBatch: 9,
    scrollThreshold: 200,
    animationDelay: 80,
    loadDelay: 300
};

// ===========================================
// STATE
// ===========================================
const state = {
    currentVisibleCount: 0,
    activeCategory: 'all',
    isLoading: false,
    observer: null,
    mapInstance: null
};

// ===========================================
// INITIALIZATION
// ===========================================
document.addEventListener('DOMContentLoaded', init);

function init() {
    // Initialize components based on page content
    if (document.getElementById('primary-feature-container')) {
        initNewsFeed();
    }

    initNavigation();
    initModal();
    initRadioPlayer();
    initDateDisplay();
    initScrollEffects();
    initMarketplace();
    initVideos();
    initMap();
}

// ===========================================
// MARKETPLACE
// ===========================================
function initMarketplace() {
    const container = document.querySelector('#market .demo-placeholder');
    if (!container) return; // Already initialized or missing

    // Replace placeholder with grid
    const marketSection = document.getElementById('market');
    marketSection.innerHTML = `
        <div class="section-header">
            <h2>RAPSKA TRŽNICA</h2>
            <p>Najbolje od lokalnih proizvođača</p>
        </div>
        <div class="market-grid">
            ${getMockMarketItems().map(item => `
                <div class="market-card card-animate">
                    <div class="market-img" style="background-image: url('${item.image}')">
                        <span class="price-tag">${item.price}</span>
                    </div>
                    <div class="market-info">
                        <h3>${item.title}</h3>
                        <p class="seller">${item.seller}</p>
                        <button class="btn-market">Kontaktiraj</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function getMockMarketItems() {
    return [
        { title: 'Domaće Maslinovo Ulje', seller: 'OPG Kaštelan', price: '18 €/l', image: 'https://picsum.photos/seed/oil/400/300' },
        { title: 'Rapska Torta', seller: 'Vilma Slastice', price: '25 €', image: 'https://picsum.photos/seed/cake/400/300' },
        { title: 'Med od Kadulje', seller: 'Pčelarstvo Krstić', price: '12 €', image: 'https://picsum.photos/seed/honey/400/300' },
        { title: 'Ovčji Sir', seller: 'OPG Gvačić', price: '30 €/kg', image: 'https://picsum.photos/seed/cheese/400/300' },
        { title: 'Suhe Smokve', seller: 'Domaća Radinost', price: '8 €', image: 'https://picsum.photos/seed/figs/400/300' },
        { title: 'Eko Povrće Košarica', seller: 'Vrtovi Raba', price: '15 €', image: 'https://picsum.photos/seed/veg/400/300' },
    ];
}

// ===========================================
// VIDEO / SHORTS
// ===========================================
function initVideos() {
    const container = document.querySelector('#shorts .demo-placeholder');
    if (!container) return;

    const shortsSection = document.getElementById('shorts');
    shortsSection.innerHTML = `
        <div class="section-header">
            <h2>VIDEO VIJESTI</h2>
            <p>Aktualno, kratko i jasno</p>
        </div>
        <div class="video-grid">
             ${getMockVideos().map(video => `
                <div class="video-card card-animate">
                    <div class="video-thumb" style="background-image: url('${video.image}')">
                        <div class="play-overlay">▶</div>
                        <span class="video-duration">${video.duration}</span>
                    </div>
                    <div class="video-info">
                        <h3>${video.title}</h3>
                        <span class="video-views">${video.views} pregleda</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function getMockVideos() {
    return [
        { title: 'Nevera pogodila luku Rab', duration: '0:45', views: '1.2k', image: 'https://picsum.photos/seed/storm/300/500' },
        { title: 'Svečano otvorenje Fjere', duration: '1:20', views: '3.5k', image: 'https://picsum.photos/seed/fjera/300/500' },
        { title: 'Novi trajekt "Otok Rab"', duration: '0:55', views: '800', image: 'https://picsum.photos/seed/ferry/300/500' },
        { title: 'Intervju: Gradonačelnik', duration: '2:15', views: '2.1k', image: 'https://picsum.photos/seed/mayor/300/500' },
        { title: 'Sportski vikend: Sažetak', duration: '1:05', views: '950', image: 'https://picsum.photos/seed/sport/300/500' },
    ];
}

// ===========================================
// NEWS FEED
// ===========================================
function initNewsFeed() {
    renderHero(HERO_ARTICLE);
    loadMoreArticles();
    initInfiniteScroll();
    initFilters();
}

function renderHero(article) {
    const container = document.getElementById('primary-feature-container');
    if (!container || !article) return;

    container.innerHTML = `
        <article class="main-feature card-animate" style="--delay: 1">
            <div class="feature-img-container">
                <div class="feature-img" style="background-image: url('${escapeHtml(article.image)}');" role="img" aria-label="${escapeHtml(article.title)}"></div>
            </div>
            <div class="feature-content">
                <div class="flex-between">
                    <span class="category-pill">${escapeHtml(article.category)}</span>
                    <span class="meta-info">${escapeHtml(article.date)} · ${escapeHtml(article.readTime)} čitanja</span>
                </div>
                <h2>${escapeHtml(article.title)}</h2>
                <p>${escapeHtml(article.snippet)}</p>

                <div class="editorial-ai">
                    <p class="ai-label">AI SAŽETAK</p>
                    <p>${escapeHtml(article.aiSummary || 'Automatski sažetak članka trenutno nije dostupan.')}</p>
                </div>

                <div class="meta-info">Piše: ${escapeHtml(article.author)}</div>
        <div class="article-actions">
                    <button class="action-btn" onclick="toggleReaderMode()" aria-label="Uključi način za čitanje">
                        <span class="icon">📖</span> <span class="label">Čitaj</span>
                    </button>
                    <div class="share-group">
                        <button class="action-btn icon-only" onclick="shareArticle('copy')" aria-label="Kopiraj poveznicu">🔗</button>
                        <button class="action-btn icon-only" onclick="shareArticle('twitter')" aria-label="Podijeli na X">𝕏</button>
                        <button class="action-btn icon-only" onclick="shareArticle('facebook')" aria-label="Podijeli na Facebooku">f</button>
                    </div>
                </div>
            </div>
        </article>
    `;
}

function loadMoreArticles() {
    const grid = document.getElementById('news-grid');
    if (!grid || state.isLoading) return;

    const filteredArticles = getFilteredArticles();
    const nextBatch = filteredArticles.slice(
        state.currentVisibleCount,
        state.currentVisibleCount + CONFIG.itemsPerBatch
    );

    if (nextBatch.length === 0) {
        hideLoader();
        return;
    }

    state.isLoading = true;

    // Simulate network delay for demo
    setTimeout(() => {
        const fragment = document.createDocumentFragment();

        nextBatch.forEach((article, index) => {
            const card = createNewsCard(article, index);
            fragment.appendChild(card);
        });

        grid.appendChild(fragment);
        state.currentVisibleCount += nextBatch.length;
        state.isLoading = false;

        // Check if more articles available
        if (state.currentVisibleCount >= filteredArticles.length) {
            hideLoader();
        }
    }, CONFIG.loadDelay);
}

function createNewsCard(article, index) {
    const card = document.createElement('article');
    card.className = 'small-news-card card-animate';
    card.style.setProperty('--delay', (index % 3) + 1);
    card.setAttribute('data-category', article.category);

    card.innerHTML = `
        <div class="feature-img-container small-img-container">
            <div class="feature-img" style="background-image: url('${escapeHtml(article.image)}');" role="img" aria-label="${escapeHtml(article.title)}"></div>
        </div>
        <div class="feature-content">
            <span class="category-pill" style="font-size: 0.6rem; padding: 0.2rem 0.8rem; margin-bottom: 0.8rem;">${escapeHtml(article.category)}</span>
            <h3>${escapeHtml(article.title)}</h3>
            <p>${escapeHtml(article.snippet)}</p>
            <div class="meta-info flex-between">
                <span>${escapeHtml(article.author)}</span>
                <span>${escapeHtml(article.date)}</span>
            </div>
        </div>
    `;

    return card;
}

function getFilteredArticles() {
    if (state.activeCategory === 'all') {
        return ALL_ARTICLES;
    }
    return ALL_ARTICLES.filter(a => a.category === state.activeCategory);
}

// ===========================================
// FERRY MAP & SIMULATION
// ===========================================
function initMap() {
    const container = document.querySelector('#map .demo-placeholder');
    if (!container) return;

    // Clear placeholder
    const mapSection = document.getElementById('map');
    mapSection.innerHTML = `
        <div id="leaflet-map" style="height: 600px; width: 100%; border-radius: var(--radius); z-index: 1;"></div>
        <div class="map-overlayglass" style="position: absolute; bottom: 2rem; left: 2rem; z-index: 1000; padding: 1rem; background: var(--card-bg); border-radius: 12px; border: 1px solid var(--border);">
            <h4>🚢 Status Trajekta</h4>
            <div id="ferry-status">Učitavanje...</div>
        </div>
    `;

    // Wait for Leaflet to load
    if (typeof L === 'undefined') {
        setTimeout(initMap, 500);
        return;
    }

    // Init Map centered on Rab-Mainland channel
    state.mapInstance = L.map('leaflet-map').setView([44.715, 14.878], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(state.mapInstance);

    // Ports
    const misnjak = [44.7086, 14.8647];
    const stinica = [44.7214, 14.8911];

    // Custom Premium Markers for Ports
    const portIcon = (label) => L.divIcon({
        className: 'custom-port-marker',
        html: `
            <div class="port-marker-pin"></div>
            <div class="port-marker-label">${label}</div>
        `,
        iconSize: [120, 40],
        iconAnchor: [10, 10]
    });

    L.marker(misnjak, { icon: portIcon('MIŠNJAK') }).addTo(state.mapInstance);
    L.marker(stinica, { icon: portIcon('STINICA') }).addTo(state.mapInstance);

    // Route Line
    const route = L.polyline([misnjak, stinica], {
        color: 'var(--primary)',
        weight: 3,
        opacity: 0.5,
        dashArray: '10, 10'
    }).addTo(state.mapInstance);

    // Ferry Icon
    const ferryIcon = L.divIcon({
        className: 'ferry-icon-marker',
        html: '<div style="font-size: 24px; filter: drop-shadow(0 0 5px rgba(255,255,255,0.5));">⛴️</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    const ferryMarker = L.marker(misnjak, { icon: ferryIcon }).addTo(state.mapInstance);

    // Start Simulation Loop
    startFerrySimulation(ferryMarker, misnjak, stinica);
}

function startFerrySimulation(marker, startPos, endPos) {
    // Mock Schedule (Departures from Misnjak)
    // Real ferry is roughly every hour or so in winter, continuous in summer
    // Let's assume hourly for demo: XX:00 from Misnjak, XX:30 from Stinica
    const durationMins = 15;

    function update() {
        const now = new Date();
        const minutes = now.getMinutes() + (now.getSeconds() / 60);
        const hours = now.getHours();

        let progress = 0; // 0 = Misnjak, 1 = Stinica
        let statusText = "Na vezu";
        let isMoving = false;

        // Logic: 
        // 00 to 15 -> Misnjak to Stinica
        // 30 to 45 -> Stinica to Misnjak

        if (minutes >= 0 && minutes < durationMins) {
            // Outbound (Rab -> Kopno)
            progress = minutes / durationMins;
            statusText = `Isplovio iz Mišnjaka (${Math.round(progress * 100)}%)`;
            isMoving = true;
        } else if (minutes >= 30 && minutes < 30 + durationMins) {
            // Inbound (Kopno -> Rab)
            progress = 1 - ((minutes - 30) / durationMins); // Reverse direction
            statusText = `Plovidba prema Rabu (${Math.round((1 - progress) * 100)}%)`;
            isMoving = true;
        } else if (minutes >= durationMins && minutes < 30) {
            // Waiting at Stinica
            progress = 1;
            statusText = "Luka Stinica (Ukrcaj/Iskrcaj)";
        } else {
            // Waiting at Misnjak
            progress = 0;
            statusText = "Luka Mišnjak (Ukrcaj/Iskrcaj)";
        }

        // LERP Position
        const lat = startPos[0] + (endPos[0] - startPos[0]) * progress;
        const lng = startPos[1] + (endPos[1] - startPos[1]) * progress;

        marker.setLatLng([lat, lng]);

        const statusEl = document.getElementById('ferry-status');
        if (statusEl) {
            statusEl.innerHTML = `
                <div style="font-weight:bold; color: ${isMoving ? 'var(--success)' : 'var(--text-muted)'}">
                    ${statusText}
                </div>
                <div style="font-size: 0.8rem; margin-top: 0.2rem">
                    Brzina: ${isMoving ? '10 čvorova' : '0 čvorova'}
                </div>
            `;
        }
    }

    setInterval(update, 1000);
    update(); // First run
}
function initInfiniteScroll() {
    const grid = document.getElementById('news-grid');
    if (!grid) return;

    // Create sentinel element
    const sentinel = document.createElement('div');
    sentinel.id = 'scroll-sentinel';
    sentinel.innerHTML = '<div class="loader"></div>';
    grid.parentNode.appendChild(sentinel);

    // Intersection Observer for infinite scroll
    state.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !state.isLoading) {
                const filteredArticles = getFilteredArticles();
                if (state.currentVisibleCount < filteredArticles.length) {
                    loadMoreArticles();
                }
            }
        });
    }, { rootMargin: `${CONFIG.scrollThreshold}px` });

    state.observer.observe(sentinel);
}

function hideLoader() {
    const sentinel = document.getElementById('scroll-sentinel');
    if (sentinel) {
        sentinel.style.display = 'none';
    }
}

function showLoader() {
    const sentinel = document.getElementById('scroll-sentinel');
    if (sentinel) {
        sentinel.style.display = 'flex';
    }
}

// ===========================================
// FILTERS
// ===========================================
function initFilters() {
    const buttons = document.querySelectorAll('.filter-btn');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.cat;
            if (category === state.activeCategory) return;

            // Update button states
            buttons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');

            // Reset and reload
            state.activeCategory = category;
            state.currentVisibleCount = 0;

            const grid = document.getElementById('news-grid');
            if (grid) {
                grid.innerHTML = '';
                showLoader();
                loadMoreArticles();
            }
        });
    });
}

// ===========================================
// NAVIGATION
// ===========================================
function initNavigation() {
    const navTriggers = document.querySelectorAll('.nav-trigger[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');
    const widgetLinks = document.querySelectorAll('.widget-link[data-tab]');

    // Combine all navigation triggers
    const allTriggers = [...navTriggers, ...widgetLinks];

    allTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = trigger.dataset.tab;
            if (!targetTab) return;

            switchTab(targetTab, navTriggers, tabContents);
        });
    });
}

function switchTab(targetTab, navTriggers, tabContents) {
    // Update nav states (both desktop and mobile)
    navTriggers.forEach(t => {
        t.classList.toggle('active', t.dataset.tab === targetTab);
    });

    // Switch content
    tabContents.forEach(content => {
        const isActive = content.id === targetTab;
        content.classList.toggle('active', isActive);

        // Fix Leaflet map sizing when becoming visible
        if (isActive && targetTab === 'map' && state.mapInstance) {
            setTimeout(() => {
                state.mapInstance.invalidateSize();
            }, 100);
        }
    });

    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===========================================
// MODAL
// ===========================================
function initModal() {
    const modal = document.getElementById('reporter-modal');
    const openBtn = document.getElementById('reporter-btn');
    const closeBtn = modal?.querySelector('.modal-close');

    if (!modal) return;

    openBtn?.addEventListener('click', () => openModal(modal));
    closeBtn?.addEventListener('click', () => closeModal(modal));

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) {
            closeModal(modal);
        }
    });

    // Form Submission (Demo)
    const form = modal.querySelector('form');
    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = form.querySelector('.submit-btn');
        const originalText = btn.textContent;

        // Loading state
        btn.textContent = 'Šaljem...';
        btn.disabled = true;

        setTimeout(() => {
            // Success state
            btn.textContent = 'Hvala! Poslano.';
            btn.style.background = 'var(--success)';

            setTimeout(() => {
                closeModal(modal);
                form.reset();
                // Reset button after close
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                    btn.style.background = '';
                }, 300);
            }, 1000);
        }, 1500);
    });
}

function openModal(modal) {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modal.querySelector('input')?.focus();
}

function closeModal(modal) {
    modal.hidden = true;
    document.body.style.overflow = '';
}

// ===========================================
// RADIO PLAYER (Demo)
// ===========================================
function initRadioPlayer() {
    const playBtn = document.getElementById('radio-play');
    if (!playBtn) return;

    // Stream URL
    const streamUrl = 'http://de4.streamingpulse.com:7014/stream';
    const audio = new Audio(streamUrl);

    // Metadata URL (Jazler XML)
    const metadataUrl = 'https://radio-rab.hr/NowOnAir.xml';
    let metadataTimeout;

    audio.addEventListener('error', (e) => {
        console.error('Radio Stream Error:', e);
    });

    playBtn.addEventListener('click', () => {
        const isPlaying = playBtn.classList.contains('playing');
        const isLoading = playBtn.classList.contains('loading');
        if (isPlaying || isLoading) {
            // Pause
            audio.pause();
            audio.currentTime = 0;
            playBtn.classList.remove('playing', 'loading');
        } else {
            // Play
            playBtn.classList.add('loading');

            audio.play().then(() => {
                playBtn.classList.remove('loading');
                playBtn.classList.add('playing');
            }).catch(err => {
                playBtn.classList.remove('loading');
                console.error('Playback failed:', err);
                alert('Ne mogu pokrenuti stream. Provjerite postavke preglednika.');
            });
        }
    });



    function updateSongTitle(text) {
        const songTitle = document.querySelector('.song-title');
        const nowPlayingLabel = document.querySelector('.now-playing');

        if (songTitle) songTitle.textContent = text;
        if (nowPlayingLabel) {
            // Reset label if we are just showing station name
            if (text === 'Radio Rab - 24/7' || text === 'Radio Rab - Uživo (92.6FM)') {
                nowPlayingLabel.textContent = 'Sada svira';
                nowPlayingLabel.style.color = '';
            }
        }
    }

    function startMetadataUpdates() {
        fetchMetadata();
    }

    function stopMetadataUpdates() {
        clearTimeout(metadataTimeout);
    }

    async function fetchMetadata() {
        // No longer guarding against play state


        const proxyBase = 'https://api.allorigins.win/raw?url=';
        const timestamp = Date.now();
        let nextDelay = 15000; // Default fallback

        try {
            const expireTime = await fetchCurrentSong(proxyBase, timestamp);
            await fetchHistory(proxyBase, timestamp);
            await fetchNext(proxyBase, timestamp);

            if (expireTime) {
                const now = new Date();
                const [hours, minutes, seconds] = expireTime.split(':').map(Number);
                const expireDate = new Date();
                expireDate.setHours(hours, minutes, seconds);

                // Handle case where expire time is tomorrow (e.g. crossing midnight)
                if (expireDate < now && (now.getTime() - expireDate.getTime()) > 12 * 60 * 60 * 1000) {
                    expireDate.setDate(expireDate.getDate() + 1);
                }

                const diff = expireDate.getTime() - now.getTime();
                if (diff > 0) {
                    // Update 1s after song ends
                    nextDelay = diff + 1500;
                    console.log(`Next update scheduled in ${Math.round(nextDelay / 1000)}s (at ${expireTime})`);
                } else {
                    // Song supposedly ended, check soon
                    nextDelay = 5000;
                }
            }
        } catch (e) {
            console.warn('Metadata update cycle error:', e);
        }

        metadataTimeout = setTimeout(fetchMetadata, nextDelay);
    }

    async function fetchCurrentSong(proxyBase, timestamp) {
        const response = await fetch(proxyBase + encodeURIComponent(`https://radio-rab.hr/NowOnAir.xml?t=${timestamp}`));
        if (!response.ok) return null;
        const str = await response.text();
        const xmlDoc = new DOMParser().parseFromString(str, "text/xml");

        // Target the active event specifically
        const event = xmlDoc.querySelector('Event[status="happening"]');
        const artist = event?.querySelector('Artist')?.getAttribute('name');
        const song = event?.querySelector('Song')?.getAttribute('title');
        const expireTime = event?.querySelector('Expire')?.getAttribute('Time');

        if (artist && song) {
            updateSongTitle(`${artist} - ${song}`);
            const nowPlayingLabel = document.querySelector('.now-playing');
            if (nowPlayingLabel) {
                // Visual feedback for live status
                nowPlayingLabel.textContent = '🎵 UŽIVO';
                nowPlayingLabel.style.color = 'var(--primary)';
                nowPlayingLabel.style.fontWeight = 'bold';
            }
        }

        return expireTime;
    }

    async function fetchHistory(proxyBase, timestamp) {
        // Fetch history
        const response = await fetch(proxyBase + encodeURIComponent(`https://radio-rab.hr/AirPlayHistory.xml?t=${timestamp}`));
        if (!response.ok) return;
        const str = await response.text();
        const xmlDoc = new DOMParser().parseFromString(str, "text/xml");

        // Items are in chronological order, so we take the last few for "most recent"
        // But typically history file has oldest at top? Let's check structure. 
        // Based on typical log: appending. So last items are newest?
        // Let's take the last 5 items and reverse them so newest is at top.
        const allSongs = Array.from(xmlDoc.querySelectorAll('Song'));
        const songs = allSongs.slice(-5).reverse();

        const listContainer = document.getElementById('playlist-items');
        const mainContainer = document.getElementById('playlist-container');

        if (songs.length > 0 && listContainer) {
            mainContainer.hidden = false;
            listContainer.innerHTML = '';

            songs.forEach(song => {
                const title = song.getAttribute('title');
                const artist = song.querySelector('Artist')?.getAttribute('name');
                const info = song.querySelector('Info');
                const startTime = info?.getAttribute('StartTime')?.substring(0, 5) || ''; // HH:MM

                if (title && artist) {
                    const item = document.createElement('div');
                    item.className = 'playlist-item';
                    item.innerHTML = `
                        <span class="playlist-time">${startTime}</span>
                        <div class="playlist-meta">
                            <span class="playlist-artist">${escapeHtml(artist)}</span>
                            <span class="playlist-song">${escapeHtml(title)}</span>
                        </div>
                    `;
                    listContainer.appendChild(item);
                }
            });
        }
    }

    async function fetchNext(proxyBase, timestamp) {
        const response = await fetch(proxyBase + encodeURIComponent(`https://radio-rab.hr/AirPlayNext.xml?t=${timestamp}`));
        if (!response.ok) return;
        const str = await response.text();
        const xmlDoc = new DOMParser().parseFromString(str, "text/xml");

        const nextSong = xmlDoc.querySelector('Event[status="coming up"] Song');

        if (nextSong) {
            const title = nextSong.getAttribute('title');
            const artist = nextSong.querySelector('Artist')?.getAttribute('name');
            const container = document.getElementById('next-up-container');

            if (title && artist && container) {
                container.hidden = false;
                document.getElementById('next-artist').textContent = artist;
                document.getElementById('next-song').textContent = title;
            }
        }
    }

    // Start polling immediately
    startMetadataUpdates();
}

// ===========================================
// DATE DISPLAY
// ===========================================
function initDateDisplay() {
    const dateEl = document.querySelector('.current-date');
    if (!dateEl) return;

    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('hr-HR', options);
}

// ===========================================
// SCROLL EFFECTS
// ===========================================
function initScrollEffects() {
    const nav = document.querySelector('.news-nav');
    if (!nav) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const scrolled = window.scrollY > 100;
                nav.style.background = scrolled
                    ? 'rgba(2, 6, 23, 0.95)'
                    : 'rgba(15, 23, 42, 0.85)';
                ticking = false;
            });
            ticking = true;
        }
    });
}

// ===========================================
// UTILITIES
// ===========================================
function escapeHtml(text) {
    if (!text) return '';

    // First decode any existing entities (e.g. &amp; -> &)
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    const decoded = textarea.value;

    // Then re-escape critical characters for display
    const div = document.createElement('div');
    div.textContent = decoded;
    return div.innerHTML;
}

// ===========================================
// READER MODE & SHARING
// ===========================================
function toggleReaderMode() {
    document.body.classList.toggle('reader-mode-active');

    // Smooth scroll to top of article if we just entered reader mode
    if (document.body.classList.contains('reader-mode-active')) {
        const article = document.querySelector('.main-feature');
        if (article) article.scrollIntoView({ behavior: 'smooth' });
    }
}

function shareArticle(method) {
    const url = window.location.href;
    const title = document.querySelector('.main-feature h2')?.textContent || 'Radio Rab';

    switch (method) {
        case 'copy':
            navigator.clipboard.writeText(url).then(() => {
                alert('Poveznica kopirana!');
            });
            break;
        case 'twitter':
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
            break;
        case 'facebook':
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
            break;
    }
}
