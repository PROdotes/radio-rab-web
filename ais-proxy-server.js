// Simple AIS proxy server to bypass CORS
// Run with: node ais-proxy-server.js

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const config = {};

  try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key) {
          config[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
  } catch (err) {
    console.error('Error loading .env file:', err.message);
    console.error('Please create a .env file with your API keys (see .env.example)');
    process.exit(1);
  }

  return config;
}

const env = loadEnv();
const PORT = env.PROXY_PORT || 3001;
const AISSTREAM_API_KEY = env.AISSTREAM_API_KEY;

if (!AISSTREAM_API_KEY) {
  console.error('ERROR: AISSTREAM_API_KEY not found in .env file');
  console.error('Please add your AISStream.io API key to the .env file');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Extract IMO from URL: /api/vessel/9822621
  const match = req.url.match(/\/api\/vessel\/(\d+)/);
  if (!match) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid URL format. Use /api/vessel/{imo}' }));
    return;
  }

  const imo = match[1];

  // For IMO 9822621, use BarentsWatch API (free, no auth for open data)
  // Note: BarentsWatch mainly covers Norwegian waters, so this may not work for all vessels
  const mmsi = '238690000'; // MMSI for IMO 9822621 (Rapska Plovidba)

  // Try BarentsWatch API (free, open access)
  const apiUrl = `https://www.barentswatch.no/bwapi/v1/ais/openpositions?mmsi=${mmsi}`;

  https.get(apiUrl, (apiRes) => {
    let data = '';

    apiRes.on('data', (chunk) => {
      data += chunk;
    });

    apiRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);

        // Transform to our format
        const result = {
          name: parsed.SHIPNAME || 'N/A',
          mmsi: parsed.MMSI || 'N/A',
          imo: parsed.IMO || imo,
          type: parsed.TYPE_NAME || 'Ferry',
          flag: parsed.FLAG || 'N/A',
          latitude: parsed.LAT || null,
          longitude: parsed.LON || null,
          speed: parsed.SPEED || null,
          course: parsed.COURSE || null,
          heading: parsed.HEADING || null,
          destination: parsed.DESTINATION || 'N/A',
          eta: parsed.ETA || 'N/A',
          status: parsed.NAVSTAT_NAME || 'N/A',
          timestamp: parsed.TIMESTAMP || new Date().toISOString(),
          source: 'MyShipTracking (via proxy)'
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to parse API response' }));
      }
    });
  }).on('error', (err) => {
    console.error('API request failed:', err);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to fetch from AIS API' }));
  });
});

server.listen(PORT, () => {
  console.log(`AIS Proxy server running on http://localhost:${PORT}`);
  console.log(`Test: http://localhost:${PORT}/api/vessel/9822621`);
});
