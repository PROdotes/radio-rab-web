const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.AISSTREAM_API_KEY;
const TARGET_MMSI = '238690000'; // Rapska Plovidba Ferry
const TIMEOUT_MS = 15000; // 15 seconds max wait

if (!API_KEY) {
    console.error('!! AISSTREAM_API_KEY is missing');
    process.exit(1);
}

const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

const timeout = setTimeout(() => {
    console.log('!! Timeout waiting for ferry data');
    ws.terminate();
    process.exit(0); // Exit successfully to not break the workflow, just no data this time
}, TIMEOUT_MS);

ws.on('open', () => {
    console.log('✓ CACHING: Connected to AISStream');
    const subscription = {
        APIKey: API_KEY,
        BoundingBoxes: [[[44.5, 14.5], [45.0, 15.0]]],
        FiltersShipMMSI: [TARGET_MMSI],
        FilterMessageTypes: ["PositionReport"]
    };
    ws.send(JSON.stringify(subscription));
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data);
        const mmsi = String(message.MetaData?.MMSI || '');

        if (mmsi === TARGET_MMSI && message.Message?.PositionReport) {
            const pos = message.Message.PositionReport;
            const snapshot = {
                name: message.MetaData.ShipName,
                mmsi: mmsi,
                latitude: pos.Latitude,
                longitude: pos.Longitude,
                speed: pos.Sog,
                course: pos.Cog,
                heading: pos.TrueHeading,
                status: pos.NavigationalStatus,
                timestamp: new Date().toISOString(),
                source: 'GitHub Action Snapshot'
            };

            const filePath = path.join(__dirname, '../data/ais-snapshot.json');
            fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
            console.log('✓ SNAPSHOT SAVED:', snapshot);

            clearTimeout(timeout);
            ws.close();
            process.exit(0);
        }
    } catch (err) {
        console.error('Parse error:', err);
    }
});

ws.on('error', (err) => {
    console.error('!! WebSocket Error:', err);
    process.exit(1);
});
