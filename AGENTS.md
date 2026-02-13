# AGENTS.md - Radio Rab Web Development Guide

This document provides guidelines and instructions for AI agents working on the Radio Rab News Portal codebase.

## Project Overview

- **Project name**: Radio Rab Web
- **Type**: Static website/news portal
- **Tech stack**: Vanilla JavaScript, HTML, CSS, Leaflet.js (maps)
- **Deployment**: GitHub Pages (gh-pages)

---

## Commands

### Linting & Validation

```bash
# Run all linters (ESLint + HTMLHint + StyleLint)
npm run validate

# Run individual linters
npm run lint              # ESLint (JS files)
npm run lint-html        # HTMLHint (HTML files)
npm run lint-css         # StyleLint (style.css)
```

### Formatting

```bash
# Format all files (JS, CSS, HTML)
npm run format
```

### Deployment

```bash
# Deploy to GitHub Pages
npm run deploy
```

### Local Development

This is a static site. Open `index.html` directly in a browser or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node http-server
npx http-server -p 8000
```

**Note**: No test framework is currently configured.

---

## Code Style Guidelines

### General Principles

- Keep code simple and readable
- Use defensive programming with try/catch blocks
- Log errors gracefully using debug utilities
- Prefer explicit over implicit

### JavaScript Conventions

#### Naming

```javascript
// Variables and functions: camelCase
const currentCount = 0
function initMap() {}

// Constants: UPPER_SNAKE_CASE
const CONFIG = { itemsPerBatch: 9 }
const FERRY_COORDS = [44.7086, 14.8647]

// Global state object
const state = {
  mapInstance: null,
  isLoading: false,
}
```

#### Functions

```javascript
// Use JSDoc for public/exported functions
/**
 * Initialize the map component
 * @param {HTMLElement} container - DOM element for map
 * @returns {L.Map} Leaflet map instance
 */
function initMap(container) {}

// Use function declarations for top-level, arrow functions for callbacks
function handleClick(event) {}
items.forEach((item) => {})
```

#### Error Handling

```javascript
// Wrap risky operations in try/catch
try {
  const data = await fetch(url)
  return await data.json()
} catch (e) {
  debugWarn('Failed to fetch:', e)
  return null
}

// Allow empty catch for non-critical errors (eslint rule)
/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
try {
  layer.remove()
} catch (e) {
  /* ignore */
}
```

#### Debug Logging

```javascript
// Use debug utilities gated by CONFIG.debug
function debugLog(...args) {
  if (CONFIG.debug) {
    console.log(...args)
  }
}

// Always check for null/undefined
if (!mapInstance || !mapInstance.getCenter()) return
```

### CSS Conventions

- Use CSS custom properties (variables) for theming
- Follow the existing style.css structure
- Use meaningful class names

### HTML Conventions

- Use semantic HTML elements
- Include proper alt attributes for images
- Use data-\* attributes for JavaScript hooks

---

## Configuration

### CONFIG Object

All application settings live in the `CONFIG` object at the top of `script.js`:

```javascript
const CONFIG = {
  itemsPerBatch: 9,
  scrollThreshold: 200,
  debug: false,
  urls: {
    /* ... */
  },
  map: {
    /* ... */
  },
  ferry: {
    /* ... */
  },
}
```

### Local Configuration

For local development, copy `config.local.example.js` to `config.local.js`:

```bash
cp config.local.example.js config.local.js
```

---

## Workflow Requirements

This project uses the GSD (Get Stuff Done) workflow. Before writing code:

1. **Provide a Technical Brief**: Explain the objective, logic, scope, and verification steps
2. **Wait for Approval**: Do not write code until user says "Proceed" or "Go"
3. **Execute Surgically**: Make small, focused changes
4. **Verify**: Provide testing steps after implementation

---

## Important Files

| File              | Purpose                         |
| ----------------- | ------------------------------- |
| `script.js`       | Main application logic          |
| `data.js`         | Data loading utilities          |
| `style.css`       | Main stylesheet                 |
| `index.html`      | Main HTML page                  |
| `data/`           | JSON data files                 |
| `config.local.js` | Local overrides (not committed) |

---

## ESLint & StyleLint

The project has lenient linting rules. Key configurations:

- **ESLint**: Browser + ES2021 environment, ES modules
- **StyleLint**: Based on standard config, many rules disabled

Run `npm run validate` before committing to catch issues.

---

## Browser Compatibility

Target modern browsers (Chrome, Firefox, Safari, Edge). The code uses:

- ES2021 features (optional chaining, nullish coalescing)
- Leaflet.js for maps
- Fetch API for network requests
