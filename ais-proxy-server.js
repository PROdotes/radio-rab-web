// Simple AIS proxy server to bypass CORS
// Run with: node ais-proxy-server.js

const http = require('http');
const https = require('https');

const PORT = 3001;

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

  // Try MyShipTracking API
  const apiUrl = `https://api.myshiptracking.com/vessels/imo-${imo}.json`;

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
