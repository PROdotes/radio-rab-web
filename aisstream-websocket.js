// AISStream.io WebSocket client for real-time AIS data
// This runs in the browser and connects directly to AISStream

class AISStreamClient {
  constructor(apiKey, mmsi) {
    this.apiKey = apiKey;
    this.mmsi = mmsi;
    this.ws = null;
    this.latestData = null;
    this.onDataCallback = null;
  }

  connect() {
    console.log('Connecting to AISStream.io...');
    console.log('Using API key:', this.apiKey.substring(0, 10) + '...');

    try {
      this.ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      return;
    }

    this.ws.onopen = () => {
      console.log('✓ Connected to AISStream.io');

      // Subscribe to specific vessel by MMSI
      const subscription = {
        APIKey: this.apiKey,
        BoundingBoxes: [
          // Croatian Adriatic region
          [[44.5, 14.5], [45.0, 15.0]]
        ],
        FilterMessageTypes: ['PositionReport']
      };

      this.ws.send(JSON.stringify(subscription));
      console.log(`Subscribed to MMSI: ${this.mmsi} in Croatian waters`);
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        // Check if this is our vessel
        if (message.MetaData?.MMSI === parseInt(this.mmsi)) {
          const posReport = message.Message?.PositionReport;

          if (posReport) {
            this.latestData = {
              name: message.MetaData.ShipName || 'RAPSKA PLOVIDBA',
              mmsi: message.MetaData.MMSI,
              imo: message.MetaData.IMO || '9822621',
              type: this.getShipType(message.MetaData.ShipType),
              flag: message.MetaData.FLAG || 'Croatia',
              latitude: posReport.Latitude,
              longitude: posReport.Longitude,
              speed: posReport.Sog, // Speed over ground
              course: posReport.Cog, // Course over ground
              heading: posReport.TrueHeading,
              destination: message.MetaData.Destination || 'Stinica ⇄ Mišnjak',
              eta: message.MetaData.Eta || 'N/A',
              status: this.getNavStatus(posReport.NavigationalStatus),
              timestamp: message.MetaData.time_utc,
              source: 'AISStream.io (Live)'
            };

            console.log('✓ Received AIS update:', this.latestData);

            if (this.onDataCallback) {
              this.onDataCallback(this.latestData);
            }
          }
        }
      } catch (err) {
        console.error('Error parsing AIS message:', err);
      }
    };

    this.ws.onerror = (error) => {
      console.error('AISStream WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('AISStream connection closed. Reconnecting in 5s...');
      setTimeout(() => this.connect(), 5000);
    };
  }

  onData(callback) {
    this.onDataCallback = callback;
  }

  getLatestData() {
    return this.latestData;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  getShipType(typeCode) {
    // AIS ship type codes
    if (typeCode >= 60 && typeCode <= 69) return 'Passenger Ship';
    if (typeCode >= 70 && typeCode <= 79) return 'Cargo Ship';
    return 'Passenger/Ro-Ro Cargo Ship';
  }

  getNavStatus(status) {
    const statuses = {
      0: 'Under way using engine',
      1: 'At anchor',
      2: 'Not under command',
      3: 'Restricted maneuverability',
      4: 'Constrained by draught',
      5: 'Moored',
      6: 'Aground',
      7: 'Engaged in fishing',
      8: 'Under way sailing',
      15: 'Not defined'
    };
    return statuses[status] || 'Unknown';
  }
}

// Export for use in main script
if (typeof window !== 'undefined') {
  window.AISStreamClient = AISStreamClient;
}
