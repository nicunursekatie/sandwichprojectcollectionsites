const HostAvailabilityApp = () => {
  const [userAddress, setUserAddress] = React.useState('');
  const [searchInput, setSearchInput] = React.useState('');
  const [userCoords, setUserCoords] = React.useState(null);
  const [viewMode, setViewMode] = React.useState('proximity'); 
  const [filterArea, setFilterArea] = React.useState('all');
  const [selectedHost, setSelectedHost] = React.useState(null);
  const [geocoding, setGeocoding] = React.useState(false);
  const [showMap, setShowMap] = React.useState(false);
  const [map, setMap] = React.useState(null);
  const [mapLoaded, setMapLoaded] = React.useState(false);
  
  // Real host data with actual coordinates from your spreadsheet
  // October 1st availability merged with coordinate data
  const allHosts = [
    // Available October 1st
    { id: 1, name: 'Karen C.', area: 'Johns Creek', lat: 34.0562454, lng: -84.2510305, phone: '404.451.7942', hours: '8 am to 8 pm', notes: '', available: true },
    { id: 2, name: 'Nancy M.', area: 'Johns Creek', lat: 34.0190365, lng: -84.27345269999999, phone: '678.575.6898', hours: '8 am to 8 pm', notes: '', available: true },
    { id: 3, name: 'Julie B.', area: 'Buckhead', lat: 33.8543082, lng: -84.3709417, phone: '404.808.2560', hours: '8 am to 8 pm', notes: 'Pull up driveway in back. Fridge in garage.', available: true },
    { id: 4, name: 'Kate D.', area: 'Chastain Park', lat: 33.8804237, lng: -84.4067199, phone: '404.271.4352', hours: '9 am to 5 pm', notes: 'Text prior to delivering.', available: true },
    { id: 5, name: 'Jordan H.', area: 'Chamblee/Brookhaven', lat: 33.8981194, lng: -84.31290740000001, phone: '770.789.7329', hours: '9 am to 5 pm', notes: 'Text when arrive / ring doorbell.', available: true },
    { id: 6, name: 'Veronica P.', area: 'Dacula', lat: 33.97561, lng: -83.883747, phone: '470.509.5333', hours: '8 am to 7 pm', notes: '', available: true },
    { id: 7, name: 'Lisa H.', area: 'Dunwoody', lat: 33.952725, lng: -84.290274, phone: '770.826.0457', hours: 'Wed 4-9pm, Thu 8-9:30am', notes: '', available: true },
    { id: 8, name: 'Marcy L. & Stephanie', area: 'Dunwoody', lat: 33.9463163, lng: -84.327786, phone: '678.596.9697', hours: '8 am to 8 pm', notes: 'Sign-in sheet on porch', available: true },
    { id: 9, name: 'Darren W.', area: 'Dunwoody', lat: 33.96450859999999, lng: -84.3151065, phone: '770.490.6206', hours: '8 am to 8 pm', notes: '', available: true },
    { id: 10, name: 'Silke S.', area: 'East Cobb', lat: 34.0159666, lng: -84.44707, phone: '404.375.9541', hours: '9 am to 7 pm', notes: 'Text once delivered', available: true },
    { id: 11, name: 'Judy T.', area: 'East Cobb', lat: 33.9686877, lng: -84.4395437, phone: '404.683.5823', hours: '9 am to 6 pm', notes: 'Ring doorbell', available: true },
    { id: 12, name: 'Vicki T.', area: 'East Cobb', lat: 34.0003401, lng: -84.417205, phone: '404.202.9108', hours: '9 am to 6:30 pm', notes: 'Drop in garage. Text once delivered.', available: true },
    { id: 13, name: 'Rebecca H.', area: 'East Atlanta', lat: 33.7371671, lng: -84.33107059999999, phone: '847.687.9143', hours: '10 am to 6 pm', notes: 'Text once delivered', available: true },
    { id: 14, name: 'Sarah P.', area: 'Milton', lat: 34.116464, lng: -84.3544469, phone: '816.308.2273', hours: '9 am to 8 pm', notes: 'Text after drop-off', available: true },
    { id: 15, name: 'Laura B.', area: 'Oak Grove/Druid Hills', lat: 33.84245629999999, lng: -84.3039661, phone: '404.931.8774', hours: '8 am to 7 pm', notes: '', available: true },
    { id: 16, name: 'Tracie N.', area: 'Peachtree Corners', lat: 33.9784128, lng: -84.23600920000001, phone: '770.315.9177', hours: '2 pm to 8 pm', notes: '', available: true },
    { id: 17, name: 'Suzanna T.', area: 'Peachtree Corners', lat: 33.9815238, lng: -84.2278384, phone: '770.403.4821', hours: '2:30 pm to 8 pm', notes: '', available: true },
    { id: 18, name: 'Renee V.', area: 'Peachtree Corners', lat: 33.9837379, lng: -84.2589718, phone: '770.265.3563', hours: '2 pm to 8 pm', notes: '', available: true },
    { id: 19, name: 'Carrey H.', area: 'Roswell', lat: 34.0320203, lng: -84.2835501, phone: '314.363.2982', hours: '9 am to 7 pm', notes: '', available: true },
    { id: 20, name: 'Jenny V.W.', area: 'Roswell', lat: 34.0864211, lng: -84.4086078, phone: '703.403.0711', hours: '8 am to 6 pm', notes: 'Tell gate: going to Walter home. Text on arrival.', available: true },
    { id: 21, name: 'Jen C.', area: 'Sandy Springs', lat: 33.9311095, lng: -84.4050578, phone: '404.918.9933', hours: '8 am to 6 pm', notes: '', available: true },
    { id: 22, name: 'Sarah K.', area: 'Sandy Springs', lat: 33.9529678, lng: -84.3758284, phone: '404.455.6743', hours: '9 am to 5 pm', notes: '', available: true },
    { id: 23, name: 'Allison T.', area: 'Sandy Springs', lat: 33.91549, lng: -84.3968077, phone: '770.355.8876', hours: '9:30 am to 7 pm', notes: '', available: true },
    { id: 24, name: 'Cynthia C.', area: 'Southwest Atlanta', lat: 33.7286854, lng: -84.5622846, phone: '678.860.6442', hours: '8 am to 7 pm', notes: '', available: true },
    { id: 25, name: 'Jason S.', area: 'Suwanee/Johns Creek', lat: 34.065908, lng: -84.160894, phone: '678.245.2110', hours: '7 am to 6 pm', notes: 'Business location', available: true },
    { id: 26, name: 'Stacey & Jack G.', area: 'Virginia Highland', lat: 33.77723595, lng: -84.362274174978, phone: '404.451.7648', hours: '8am-noon / 5-8pm', notes: '', available: true },
  ];

  // Only show available hosts
  const availableHosts = allHosts.filter(h => h.available);
  const areas = [...new Set(availableHosts.map(h => h.area))].sort();
  
  // Calculate real distance using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance.toFixed(1);
  };

  // Get Google Maps API key from config
  const GOOGLE_MAPS_API_KEY = window.CONFIG?.GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE';
  
  // Geocode address using Google Maps Geocoding API
  const geocodeAddress = async (address) => {
    setGeocoding(true);
    try {
      // Check if API key is set
      if (GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE') {
        alert('Google Maps API key not configured. Please add your API key to use address lookup.');
        return false;
      }
      
      // Using Google Maps Geocoding API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=us&bounds=33.4734,-84.8882|34.1620,-83.9937&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        setUserCoords({
          lat: location.lat,
          lng: location.lng
        });
        return true;
      } else if (data.status === 'ZERO_RESULTS') {
        alert('Could not find that address. Please check the spelling and try again.');
        return false;
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        alert('Too many requests. Please try again in a moment.');
        return false;
      } else if (data.status === 'REQUEST_DENIED') {
        if (data.error_message && data.error_message.includes('referer restrictions')) {
          alert(`API Key Issue: The Geocoding API doesn't support HTTP referrer restrictions.
          
To fix this:
1. Go to Google Cloud Console → Credentials
2. Edit your API key
3. Under "Application restrictions", select "None"
4. Keep "API restrictions" set to "Geocoding API" only
5. Save the changes

This is safe because your API key is already restricted to only the Geocoding API.`);
        } else {
          alert(`API key error: ${data.error_message || 'Please check your Google Maps API configuration.'}`);
        }
        return false;
      } else {
        alert(`Geocoding failed: ${data.status} - ${data.error_message || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Error looking up address. Please check your internet connection and try again.');
      return false;
    } finally {
      setGeocoding(false);
    }
  };

  // Get user's current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setUserAddress('Current Location');
          setViewMode('proximity');
        },
        (error) => {
          alert('Could not get your location. Please enter an address instead.');
        }
      );
    } else {
      alert('Location services not available. Please enter an address.');
    }
  };

  const sortedHosts = React.useMemo(() => {
    if (!userCoords || viewMode !== 'proximity') return availableHosts;
    
    return availableHosts.map(host => ({
      ...host,
      distance: calculateDistance(userCoords.lat, userCoords.lng, host.lat, host.lng)
    })).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
  }, [userCoords, viewMode, availableHosts]);

  const filteredHosts = React.useMemo(() => {
    if (viewMode === 'proximity') return sortedHosts;
    
    let filtered = availableHosts;
    if (filterArea !== 'all') {
      filtered = filtered.filter(h => h.area === filterArea);
    }
    return filtered;
  }, [filterArea, viewMode, sortedHosts, availableHosts]);

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    const success = await geocodeAddress(searchInput);
    if (success) {
      setUserAddress(searchInput);
      setViewMode('proximity');
    }
  };

  // Initialize Google Map
  const initializeMap = React.useCallback(() => {
    if (!userCoords || !window.google || map) return;

    const mapInstance = new window.google.maps.Map(document.getElementById('map'), {
      center: userCoords,
      zoom: 11,
      styles: [
        {
          featureType: 'poi',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    // Add user location marker (blue)
    new window.google.maps.Marker({
      position: userCoords,
      map: mapInstance,
      title: 'Your Location',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="white" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" fill="white"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(24, 24),
        anchor: new window.google.maps.Point(12, 12)
      }
    });

    // Add host markers (red)
    availableHosts.forEach(host => {
      const distance = calculateDistance(userCoords.lat, userCoords.lng, host.lat, host.lng);
      
      const marker = new window.google.maps.Marker({
        position: { lat: host.lat, lng: host.lng },
        map: mapInstance,
        title: `${host.name} - ${distance} miles away`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EF4444" stroke="white" stroke-width="1"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(24, 24),
          anchor: new window.google.maps.Point(12, 24)
        }
      });

      // Add click listener to show host info
      marker.addListener('click', () => {
        setSelectedHost(host);
      });
    });

    setMap(mapInstance);
  }, [userCoords, availableHosts, map]);

  // Load Google Maps API
  React.useEffect(() => {
    if (mapLoaded || !showMap) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry`;
    script.onload = () => {
      setMapLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      // Clean up script if component unmounts
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [showMap, GOOGLE_MAPS_API_KEY]);

  // Initialize map when API is loaded and map view is shown
  React.useEffect(() => {
    if (mapLoaded && showMap && userCoords) {
      // Small delay to ensure DOM element exists
      setTimeout(initializeMap, 100);
    }
  }, [mapLoaded, showMap, userCoords, initializeMap]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sandwich Drop-Off Locations</h1>
          <p className="text-gray-600 mb-6">October 1, 2025 • {availableHosts.length} hosts available</p>
          
          {/* Address Search */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Find hosts near you
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Enter address, neighborhood, or ZIP"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={geocoding}
              />
              <button
                onClick={handleSearch}
                disabled={geocoding}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center disabled:opacity-50"
              >
                <i className="lucide-search w-4 h-4 mr-2"></i>
                {geocoding ? 'Searching...' : 'Search'}
              </button>
            </div>
            <button
              onClick={getCurrentLocation}
              className="text-sm text-blue-600 hover:underline flex items-center"
            >
              <i className="lucide-locate w-3 h-3 mr-1"></i>
              Use my current location
            </button>
            {userAddress && userCoords && (
              <p className="text-sm text-gray-600 mt-2">
                Showing hosts near: <span className="font-medium">{userAddress}</span>
              </p>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowMap(false); setViewMode('proximity'); }}
              className={`px-4 py-2 rounded-lg ${!showMap && viewMode === 'proximity' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              {userCoords ? 'Nearest First' : 'All Hosts'}
            </button>
            <button
              onClick={() => { setShowMap(false); setViewMode('area'); }}
              className={`px-4 py-2 rounded-lg ${!showMap && viewMode === 'area' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              By Area
            </button>
            {userCoords && (
              <button
                onClick={() => setShowMap(true)}
                className={`px-4 py-2 rounded-lg ${showMap ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'} flex items-center`}
              >
                <i className="lucide-map w-4 h-4 mr-2"></i>
                Map View
              </button>
            )}
          </div>

          {/* Area Filter (only show in area view) */}
          {viewMode === 'area' && (
            <select 
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="mt-4 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Areas</option>
              {areas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          )}
        </div>

        {/* Map View */}
        {showMap && userCoords && (
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Host Locations Map</h2>
              <p className="text-sm text-gray-600">Your location (blue) and sandwich hosts (red)</p>
            </div>
            <div id="map" className="h-96 rounded-b-lg"></div>
          </div>
        )}

        {/* Host List */}
        {!showMap && (
          <div className="space-y-3">
            {userCoords && viewMode === 'proximity' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <div className="flex items-center">
                  <i className="lucide-map-pin w-4 h-4 text-green-600 mr-2"></i>
                  <span className="text-sm font-medium text-green-800">
                    Hosts sorted by distance from your location
                  </span>
                </div>
              </div>
            )}
          {filteredHosts.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center text-gray-500">
              No hosts found in this area.
            </div>
          ) : (
            filteredHosts.map((host, index) => (
              <div 
                key={host.id} 
                className={`bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow ${
                  userCoords && viewMode === 'proximity' && index < 3 
                    ? 'ring-2 ring-blue-200 bg-blue-50' 
                    : ''
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {userCoords && viewMode === 'proximity' && index < 3 && (
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                        }`}>
                          {index + 1}
                        </span>
                      )}
                      <h3 className="font-semibold text-lg">{host.name}</h3>
                      {host.distance && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                          {host.distance} mi
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {host.area}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedHost(host)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center"
                  >
                    <i className="lucide-navigation w-3 h-3 mr-1"></i>
                    Directions
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center text-gray-700">
                    <i className="lucide-clock w-4 h-4 mr-2 text-gray-400"></i>
                    {host.hours}
                  </div>
                  <div className="flex items-center text-gray-700">
                    <i className="lucide-phone w-4 h-4 mr-2 text-gray-400"></i>
                    <a href={`tel:${host.phone.replace(/[^0-9]/g, '')}`} className="text-blue-600 hover:underline">
                      {host.phone}
                    </a>
                  </div>
                </div>
                
                {host.notes && (
                  <div className="mt-3 p-2 bg-amber-50 rounded text-sm text-gray-700 flex items-start">
                    <i className="lucide-alert-circle w-4 h-4 mr-2 text-amber-600 flex-shrink-0 mt-0.5"></i>
                    {host.notes}
                  </div>
                )}
              </div>
            ))
          )}
          </div>
        )}

        {/* Directions Modal */}
        {selectedHost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedHost(null)}>
            <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">{selectedHost.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{selectedHost.area}</p>
              <div className="space-y-3">
                <a 
                  href={`https://maps.apple.com/?daddr=${selectedHost.lat},${selectedHost.lng}`}
                  className="block w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-center"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in Apple Maps
                </a>
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedHost.lat},${selectedHost.lng}`}
                  className="block w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-center"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in Google Maps
                </a>
                <button 
                  onClick={() => setSelectedHost(null)}
                  className="block w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-center"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Render the app
ReactDOM.render(<HostAvailabilityApp />, document.getElementById('root'));