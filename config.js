// Configuration file for API keys and settings
// DO NOT commit this file with real API keys to public repositories

const CONFIG = {
  // Google Maps API Key
  // Get your key at: https://console.cloud.google.com/apis/credentials
  GOOGLE_MAPS_API_KEY: 'YOUR_API_KEY_HERE',
  
  // Geographic bounds for Atlanta metro area (improves geocoding accuracy)
  ATLANTA_BOUNDS: {
    southwest: { lat: 33.4734, lng: -84.8882 },
    northeast: { lat: 34.1620, lng: -83.9937 }
  }
};

// Make config available globally
window.CONFIG = CONFIG;