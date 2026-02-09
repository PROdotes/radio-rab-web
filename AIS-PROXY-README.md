# AIS Data Proxy Server

This proxy server allows you to fetch live AIS vessel data without CORS restrictions.

## Why is this needed?

Public AIS APIs block direct browser requests due to CORS (Cross-Origin Resource Sharing) security policies. The proxy server runs on your machine and fetches data on behalf of your website.

## Quick Start

### 1. Start the proxy server

```bash
node ais-proxy-server.js
```

You should see:
```
AIS Proxy server running on http://localhost:3001
Test: http://localhost:3001/api/vessel/9822621
```

### 2. Open your website

Open `index.html` in your browser. The site will automatically:
- Try to fetch live data from the proxy server
- Fall back to static vessel registry data if proxy is offline

### 3. Test it works

Click on the ferry icon on the map. If the proxy is running, you'll see:
- **Real-time position** (latitude/longitude)
- **Current speed** (in knots)
- **Course and heading**
- **Live navigation status**
- Source: "MyShipTracking (via proxy)"

If the proxy is offline, you'll see:
- Static vessel information
- Source: "Vessel Registry (proxy offline)"

## How it works

```
Your Browser → Proxy Server (localhost:3001) → AIS API (MyShipTracking)
            ← ← ←
```

The proxy:
1. Receives request from your browser
2. Fetches data from MyShipTracking API
3. Adds CORS headers to allow browser access
4. Returns the data to your browser

## Alternative Solutions

### Option 1: Cloud Function (Serverless)
Deploy to Vercel, Netlify Functions, or Cloudflare Workers:

```javascript
// Vercel example: /api/vessel/[imo].js
export default async function handler(req, res) {
  const { imo } = req.query;
  const response = await fetch(`https://api.myshiptracking.com/vessels/imo-${imo}.json`);
  const data = await response.json();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(data);
}
```

### Option 2: Use AISHub with API Key
Sign up at https://www.aishub.net for a free account and use their authenticated API.

### Option 3: Backend Integration
Integrate into your existing backend (PHP, Python, etc.):

**Python (Flask) example:**
```python
from flask import Flask, jsonify
import requests

@app.route('/api/vessel/<imo>')
def get_vessel(imo):
    response = requests.get(f'https://api.myshiptracking.com/vessels/imo-{imo}.json')
    data = response.json()
    return jsonify(data)
```

## Troubleshooting

**"Failed to fetch"**: Make sure the proxy server is running (`node ais-proxy-server.js`)

**Port 3001 already in use**: Change PORT in `ais-proxy-server.js` and update the URL in `script.js`

**No data returned**: The vessel might not be broadcasting AIS, or the API might be down

## Production Deployment

For production, deploy the proxy to:
- **Vercel/Netlify**: Serverless functions (free tier available)
- **Heroku**: Free dyno available
- **DigitalOcean/AWS**: VPS or Lambda

Update the proxy URL in `script.js`:
```javascript
const proxyUrl = `https://your-domain.com/api/vessel/${imo}`;
```
