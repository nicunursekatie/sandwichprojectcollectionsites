// Configuration file for API keys and settings
// DO NOT commit this file with real API keys to public repositories

const CONFIG = {
  // Google Maps API Key
  // Get your key at: https://console.cloud.google.com/apis/credentials
  GOOGLE_MAPS_API_KEY: 'AIzaSyAtMtYniYf7JLp2vxqjCGiknYON6odSu_o',

  // Geographic bounds for Atlanta metro area (improves geocoding accuracy)
  ATLANTA_BOUNDS: {
    southwest: { lat: 33.4734, lng: -84.8882 },
    northeast: { lat: 34.1620, lng: -83.9937 }
  },

  // Design Tokens - Brand Colors (update once, use everywhere)
  COLORS: {
    primary: '#007E8C',      // Teal - Primary actions, headings
    secondary: '#236383',    // Navy - Secondary headings, text
    accent: '#FBAD3F',       // Orange - Highlights, badges
    accentAlt: '#47B3CB',    // Light teal - Buttons, accents
    danger: '#A31C41',       // Red - Warnings, errors

    // Grays
    gray900: '#333',
    gray600: '#666',
    grayBorder: '#e0e0e0',

    // Backgrounds
    bgLight: 'rgba(71, 179, 203, 0.05)',
    bgAccent: 'rgba(251, 173, 63, 0.05)',
  },

  // Design Tokens - Spacing (consistent gaps and padding)
  SPACING: {
    xs: '0.5rem',   // 8px
    sm: '0.75rem',  // 12px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    xxl: '3rem',    // 48px
  },

  // Design Tokens - Border Radius (consistent rounding)
  RADIUS: {
    sm: '8px',
    md: '12px',
    lg: '15px',
    xl: '20px',
  },

  // Error Messages (single source of truth)
  ERRORS: {
    locationDenied: {
      title: 'Location Access Needed',
      message: 'Please enter your ZIP code to find nearby hosts.',
    },
    noResults: {
      title: 'No Hosts Found',
      message: 'Try searching a wider area or check back later.',
    },
    geocodeFailed: {
      title: 'Address Not Found',
      message: 'Please try a different address or ZIP code.',
    },
  },

  // Data Version (increment when host data changes to force cache refresh)
  DATA_VERSION: '2025-11-10',
};

// Make config available globally
window.CONFIG = CONFIG;