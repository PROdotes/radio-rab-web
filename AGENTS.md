# AGENTS.md - Radio Rab Web Development Guide

Guidelines for AI agents working on the Radio Rab News Portal codebase.

## Project Overview

- **Type**: Static website/news portal (Vanilla JS, HTML, CSS, Leaflet.js)
- **Deployment**: GitHub Pages (gh-pages)

---

## Commands

### Linting & Validation

```bash
npm run validate     # Run all linters (ESLint + HTMLHint + StyleLint)
npm run lint        # ESLint (JS files)
npm run lint-html   # HTMLHint (HTML files)
npm run lint-css    # StyleLint (style.css)
npm run format      # Format all files (JS, CSS, HTML)
npm run deploy      # Deploy to GitHub Pages
```

### Local Development

```bash
python -m http.server 8000
# or
npx http-server -p 8000
```

### Testing

**Note**: No test framework configured. To add tests, consider Jest or Vitest.

---

## Code Style Guidelines

### General Principles

- Keep code simple and readable
- Use defensive programming with try/catch blocks
- Log errors gracefully using debug utilities
- Prefer explicit over implicit
- Use `eslint-disable` comments sparingly for third-party globals: `/* global L, lucide */`

### Naming Conventions

```javascript
// Variables/functions: camelCase
const currentCount = 0
function initMap() {}

// Constants: UPPER_SNAKE_CASE, CONFIG objects use camelCase
const CONFIG = { itemsPerBatch: 9 }
const FERRY_COORDS = [44.7086, 14.8647]

// Global state object
const state = { mapInstance: null, isLoading: false }
```

### Formatting (Prettier)

```json
{ "printWidth": 100, "singleQuote": true, "semi": false }
```

### JavaScript Conventions

**Imports & Dependencies**

- Use ES modules (`<script type="module">` in HTML)
- Declare third-party globals with `/* global L, lucide */` at file top
- Import local modules: `import { debugLog } from './utils.js'`

**Functions**

```javascript
// Use JSDoc for public/exported functions
/**
 * Initialize the map component
 * @param {HTMLElement} container - DOM element for map
 * @returns {L.Map} Leaflet map instance
 */
function initMap(container) {}

// Function declarations for top-level, arrow functions for callbacks
function handleClick(event) {}
items.forEach((item) => {})
```

**Error Handling**

```javascript
// Wrap risky operations in try/catch
try {
  const data = await fetch(url)
  return await data.json()
} catch (e) {
  debugWarn('Failed to fetch:', e)
  return null
}

// Allow empty catch for non-critical errors
/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
try {
  layer.remove()
} catch (e) {
  /* ignore */
}
```

**Null Checks**

```javascript
if (!mapInstance || !mapInstance.getCenter()) return
const lat = state?.ferryMarker?.getLatLng()?.lat
```

### CSS Conventions

- Use CSS custom properties (variables) for theming
- Follow existing style.css structure
- StyleLint extends `stylelint-config-standard` with many rules disabled

### HTML Conventions

- Use semantic HTML elements
- Include proper alt attributes for images
- Use `data-*` attributes for JavaScript hooks

---

## Configuration

### CONFIG Object

```javascript
const CONFIG = {
  itemsPerBatch: 9,
  scrollThreshold: 200,
  debug: false,
  urls: {
    /* API endpoints */
  },
  map: {
    /* Map settings */
  },
  ferry: {
    /* Ferry tracking settings */
  },
}
```

### Local Configuration

```bash
cp config.local.example.js config.local.js
```

---

## Workflow (GSD)

1. **Provide a Technical Brief**: Explain objective, logic, scope, verification steps
2. **Wait for Approval**: Do not write code until user says "Proceed" or "Go"
3. **Execute Surgically**: Make small, focused changes
4. **Verify**: Run `npm run validate` before committing

---

## Important Files

| File         | Purpose                  |
| ------------ | ------------------------ |
| `script.js`  | Main application entry   |
| `data.js`    | Data loading utilities   |
| `utils.js`   | Debug & helper functions |
| `style.css`  | Main stylesheet          |
| `index.html` | Main HTML page           |
| `data/`      | JSON data files          |

## Linter Configuration

**ESLint** (.eslintrc.json): Browser + ES2021, ES modules, `no-console: off`, `no-unused-vars: off`, empty catch allowed

**StyleLint** (.stylelintrc.json): Extends stylelint-config-standard, many formatting rules disabled

## Browser Compatibility

Target modern browsers (Chrome, Firefox, Safari, Edge). Uses ES2021 features, Leaflet.js, Fetch API.
