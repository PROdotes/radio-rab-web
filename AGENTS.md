# Radio Rab News Portal — Agent Guidelines

## Project Overview
This is a modern, static HTML/CSS/JavaScript news portal for Radio Rab, serving the island of Rab community. The project focuses on performance, accessibility, and user experience with a dark theme aesthetic.

## Build & Development Commands

**Note:** This is a static site with no build process. Files are served directly.

### Development
- **Start local server:** `python -m http.server 8000` or `npx serve .`
- **Open in browser:** Navigate to `http://localhost:8000`

### Testing
- **Manual testing:** Open in browser and test functionality
- **Accessibility testing:** Use browser dev tools Lighthouse audit
- **Responsive testing:** Test at mobile (375px), tablet (768px), desktop (1400px+)

### Validation
- **HTML validation:** W3C Validator on index.html
- **CSS validation:** W3C CSS Validation Service
- **JavaScript:** Check browser console for errors

## Code Style Guidelines

### JavaScript Architecture
```javascript
// Use functional programming with clear separation of concerns
const CONFIG = {
    // Centralized configuration object
    debug: false,
    itemsPerBatch: 9,
    urls: { /* external URLs */ }
};

const state = {
    // Global state management
    currentVisibleCount: 0,
    activeCategory: 'all',
    isLoading: false
};

// Initialization pattern
document.addEventListener('DOMContentLoaded', init);

function init() {
    // Initialize all components
    initNewsFeed();
    initNavigation();
    initRadioPlayer();
}
```

### Naming Conventions
- **Constants:** `UPPER_SNAKE_CASE` for CONFIG, state objects
- **Functions:** `camelCase` with descriptive names (`initNewsFeed`, `createNewsCard`)
- **Variables:** `camelCase` (`currentVisibleCount`, `activeCategory`)
- **DOM elements:** Use descriptive selectors (`#primary-feature-container`, `.news-card`)
- **CSS classes:** `kebab-case` for styles (`card-animate`, `feature-img-container`)

### Import/Export Patterns
- **No modules:** This is a static site using vanilla JavaScript
- **Single script:** All code in `script.js` loaded via `<script defer>` tag
- **External libraries:** Loaded via CDN in HTML head (Leaflet, Google Fonts)

### Error Handling
```javascript
// Use optional chaining for safe DOM queries
document.getElementById('newsletter-form')?.addEventListener('submit', handler);

// Debug logging utility
function debugLog(...args) {
    if (CONFIG.debug) {
        console.log(...args);
    }
}

// Graceful fallbacks for missing features
function initComponent() {
    const container = document.querySelector('#component .demo-placeholder');
    if (!container) return; // Already initialized or missing
    // ... initialization code
}
```

### HTML Structure
- **Semantic HTML5:** Use `<article>`, `<section>`, `<nav>`, `<main>` appropriately
- **Accessibility:** Include ARIA labels, skip links, alt text
- **Performance:** Load critical CSS inline, defer non-critical JS
- **Language:** Set `lang="hr"` for Croatian content

### CSS Architecture
```css
/* Design tokens in :root */
:root {
    --bg-dark: #020617;
    --primary: #3b82f6;
    --radius: 20px;
    --ease-out: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Component-based structure */
.component-name {
    /* Layout */
    /* Typography */
    /* Visuals */
}

/* Responsive with mobile-first */
@media (min-width: 768px) {
    /* Tablet styles */
}
```

### Data Patterns
- **Mock data:** Stored in `data.js` with realistic Croatian content
- **Categories:** Use predefined array `['LOKALNO', 'SPORT', 'KULTURA', 'TURIZAM', 'MORE', 'GASTRONOMIJA']`
- **Authors:** Use predefined Croatian names array
- **Images:** Use Unsplash URLs with descriptive seeds

### Performance Guidelines
- **Lazy loading:** Implement infinite scroll with Intersection Observer
- **Optimizations:** Use `document.createDocumentFragment()` for batch DOM updates
- **Animations:** CSS transitions with GPU acceleration (`transform3d`)
- **Images:** Use responsive images with proper sizing

### Security Best Practices
- **XSS prevention:** Use `escapeHtml()` for dynamic content
- **CSP:** Consider implementing Content Security Policy
- **External resources:** Use CDN with integrity hashes where possible

## File Structure
```
/
├── index.html          # Main HTML file
├── style.css           # All styles (design tokens, components, responsive)
├── script.js           # All JavaScript (config, state, components)
├── data.js             # Mock data and content
├── img/                # Image assets
├── docs/               # Project documentation
│   ├── blueprint_2026.md
│   └── funkcionalni_zahtjevi.md
└── .gitignore          # Git ignore rules
```

## Development Workflow
1. **Make changes** to relevant files
2. **Test locally** by refreshing browser
3. **Check console** for JavaScript errors
4. **Validate HTML/CSS** if structural changes made
5. **Test responsive** at different viewport sizes
6. **Test accessibility** with screen reader tools

## Component Initialization Pattern
```javascript
function initComponent() {
    const container = document.querySelector('#component .demo-placeholder');
    if (!container) return; // Skip if already initialized
    
    // Replace placeholder with actual content
    container.parentElement.innerHTML = `/* dynamic content */`;
}
```

## Event Handling
- Use event delegation for dynamic content
- Clean up intervals/timeouts in state management
- Use passive listeners for scroll events
- Implement proper focus management for modals

## Browser Compatibility
- **Target:** Modern browsers (ES6+)
- **Features:** Use optional chaining, template literals, arrow functions
- **Fallbacks:** Provide graceful degradation for older browsers
- **Testing:** Test in Chrome, Firefox, Safari, Edge
 
## GitHub Pages Test Hosting Alignment
- Deploy target: Use GitHub Pages (gh-pages) to host a test environment from the repo for quick validation.
- CI integration: A GitHub Actions workflow will validate, then deploy to gh-pages on main.
- Local guidance: How to run validations locally with npm (if available) or via the manual path if npm isn’t used.
- Data-driven MVP: Data-driven sections (hero, news, market, video) wired to mocks in data.js; no server needed for test hosting; static files served by GH Pages.
- What to ship to test hosting: MVP core plus small data bridges MARKET_ITEMS, VIDEO_ITEMS; keep placeholders for live data.
- Rollout plan: 1) CI validation, 2) GH Pages deployment, 3) UI polish, 4) blueprint features in future sprint.
