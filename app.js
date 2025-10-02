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
  const [directionsService, setDirectionsService] = React.useState(null);
  const [directionsRenderer, setDirectionsRenderer] = React.useState(null);
  const [showingDirections, setShowingDirections] = React.useState(null);
  const [routeInfo, setRouteInfo] = React.useState(null);
  const [showAllHostsOnMap, setShowAllHostsOnMap] = React.useState(false);
  const [showAdmin, setShowAdmin] = React.useState(false);
  const [editingHost, setEditingHost] = React.useState(null);
  
  // Initialize hosts from localStorage or use default data
  const getInitialHosts = () => {
    const savedHosts = localStorage.getItem('sandwichHosts');
    if (savedHosts) {
      return JSON.parse(savedHosts);
    }
    // Default host data with actual coordinates from your spreadsheet
    return [
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
  };

  const [allHosts, setAllHosts] = React.useState(getInitialHosts);

  // Save hosts to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem('sandwichHosts', JSON.stringify(allHosts));
  }, [allHosts]);

  // Admin functions
  const addHost = (hostData) => {
    const newHost = {
      ...hostData,
      id: Math.max(...allHosts.map(h => h.id)) + 1,
      lat: parseFloat(hostData.lat),
      lng: parseFloat(hostData.lng)
    };
    setAllHosts([...allHosts, newHost]);
  };

  const updateHost = (hostId, hostData) => {
    setAllHosts(allHosts.map(host => 
      host.id === hostId 
        ? { ...hostData, id: hostId, lat: parseFloat(hostData.lat), lng: parseFloat(hostData.lng) }
        : host
    ));
  };

  const deleteHost = (hostId) => {
    setAllHosts(allHosts.filter(host => host.id !== hostId));
  };

  const toggleHostAvailability = (hostId) => {
    setAllHosts(allHosts.map(host => 
      host.id === hostId ? { ...host, available: !host.available } : host
    ));
  };

  const exportHosts = () => {
    const dataStr = JSON.stringify(allHosts, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `sandwich-hosts-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importHosts = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedHosts = JSON.parse(e.target.result);
          setAllHosts(importedHosts);
          alert('Hosts imported successfully!');
        } catch (error) {
          alert('Error importing file. Please check the format.');
        }
      };
      reader.readAsText(file);
    }
  };

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
      mapId: 'SANDWICH_DROP_OFF_MAP',
      styles: [
        {
          featureType: 'poi',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    // Create user location marker content (blue)
    const userMarkerContent = document.createElement('div');
    userMarkerContent.innerHTML = `
      <div style="
        width: 24px; 
        height: 24px; 
        background: #47B3CB; 
        border: 3px solid white; 
        border-radius: 50%; 
        position: relative;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        <div style="
          width: 8px; 
          height: 8px; 
          background: white; 
          border-radius: 50%; 
          position: absolute; 
          top: 50%; 
          left: 50%; 
          transform: translate(-50%, -50%);
        "></div>
      </div>
    `;

    // Add user location marker (blue)
    new google.maps.marker.AdvancedMarkerElement({
      position: userCoords,
      map: mapInstance,
      title: 'Your Location',
      content: userMarkerContent
    });

    // Sort hosts by distance and determine which to show on map
    const hostsWithDistance = availableHosts.map(host => ({
      ...host,
      distance: calculateDistance(userCoords.lat, userCoords.lng, host.lat, host.lng)
    })).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

    const hostsToShowOnMap = showAllHostsOnMap ? hostsWithDistance : hostsWithDistance.slice(0, 3);

    // Add host markers with numbered labels
    hostsToShowOnMap.forEach((host, index) => {
      const rank = hostsWithDistance.findIndex(h => h.id === host.id) + 1;

      // Determine marker color based on rank
      let markerColor = '#A31C41'; // Default red
      let badgeColor = '#FFFFFF';
      let badgeTextColor = '#236383';

      if (rank === 1) {
        markerColor = '#FBBF24'; // Gold
        badgeColor = '#FBBF24';
        badgeTextColor = '#000000';
      } else if (rank === 2) {
        markerColor = '#9CA3AF'; // Silver
        badgeColor = '#9CA3AF';
        badgeTextColor = '#000000';
      } else if (rank === 3) {
        markerColor = '#F59E0B'; // Bronze
        badgeColor = '#F59E0B';
        badgeTextColor = '#000000';
      }

      // Create host marker content with numbered label
      const hostMarkerContent = document.createElement('div');
      hostMarkerContent.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
        ">
          <!-- Numbered badge -->
          <div style="
            width: 32px;
            height: 32px;
            background: ${badgeColor};
            border: 3px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            color: ${badgeTextColor};
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            margin-bottom: 4px;
          ">
            ${rank}
          </div>
          <!-- Info label -->
          <div style="
            background: white;
            border: 2px solid ${markerColor};
            border-radius: 8px;
            padding: 4px 8px;
            font-size: 11px;
            font-weight: bold;
            color: #236383;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          ">
            ${host.distance}mi
          </div>
        </div>
      `;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: host.lat, lng: host.lng },
        map: mapInstance,
        title: `#${rank}: ${host.name} - ${host.distance} miles away`,
        content: hostMarkerContent
      });

      // Add click listener to show host info
      marker.addListener('click', () => {
        setSelectedHost(host);
      });
    });

    // Initialize directions service and renderer
    const directionsServiceInstance = new google.maps.DirectionsService();
    const directionsRendererInstance = new google.maps.DirectionsRenderer({
      map: mapInstance,
      panel: null, // We'll handle this ourselves
      polylineOptions: {
        strokeColor: '#007E8C',
        strokeWeight: 4,
        strokeOpacity: 0.8
      },
      markerOptions: {
        visible: false // Hide default markers since we have custom ones
      }
    });
    
    setDirectionsService(directionsServiceInstance);
    setDirectionsRenderer(directionsRendererInstance);

    setMap(mapInstance);
  }, [userCoords, availableHosts, map, showAllHostsOnMap]);

  // Load Google Maps API
  React.useEffect(() => {
    if (mapLoaded || !showMap) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker,geometry`;
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

  // Reset map when toggle changes
  React.useEffect(() => {
    if (map && showAllHostsOnMap !== undefined) {
      setMap(null); // Force map re-initialization
    }
  }, [showAllHostsOnMap]);

  // Initialize map when API is loaded and map view is shown
  React.useEffect(() => {
    if (mapLoaded && showMap && userCoords) {
      // Small delay to ensure DOM element exists
      setTimeout(initializeMap, 100);
    }
  }, [mapLoaded, showMap, userCoords, initializeMap]);

  // Show driving directions on map
  const showDirections = (host) => {
    if (!directionsService || !directionsRenderer || !userCoords) return;

    const request = {
      origin: userCoords,
      destination: { lat: host.lat, lng: host.lng },
      travelMode: google.maps.TravelMode.DRIVING,
    };

    directionsService.route(request, (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);
        setShowingDirections(host.id);
        
        // Extract route information
        const route = result.routes[0];
        const leg = route.legs[0];
        setRouteInfo({
          hostId: host.id,
          duration: leg.duration.text,
          distance: leg.distance.text,
          hostName: host.name
        });
      } else {
        alert('Could not calculate driving directions. Please use the external map links instead.');
      }
    });
  };

  // Clear directions from map
  const clearDirections = () => {
    if (directionsRenderer) {
      directionsRenderer.setDirections({ routes: [] });
      setShowingDirections(null);
      setRouteInfo(null);
    }
  };

  // Open Google Maps with directions
  const openGoogleMapsDirections = (host) => {
    if (userCoords) {
      const url = `https://www.google.com/maps/dir/${userCoords.lat},${userCoords.lng}/${host.lat},${host.lng}`;
      window.open(url, '_blank');
    } else {
      // Fallback to destination only
      const url = `https://www.google.com/maps/search/?api=1&query=${host.lat},${host.lng}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl premium-card-header p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight" style={{letterSpacing: '-0.02em'}}>
            Sandwich Drop-Off Locations
          </h1>
          <div className="flex justify-between items-center mb-8">
            <p className="text-lg" style={{color: '#236383'}}>
              <span className="font-semibold">Tuesday, October 1, 2025</span>
              <span className="mx-2">•</span>
              <span className="font-medium">{availableHosts.length} hosts available</span>
            </p>
            <button
              onClick={() => setShowAdmin(true)}
              className="text-sm px-4 py-2 rounded-lg font-medium transition-all hover:shadow-md"
              style={{backgroundColor: '#A31C41', color: 'white'}}
              title="Admin: Manage hosts for next week"
            >
              🔧 Manage Hosts
            </button>
          </div>
          
          {/* Address Search */}
          <div className="info-box p-6 mb-6">
            <label className="block text-base font-semibold mb-2" style={{color: '#236383'}}>
              Find Locations Near You
            </label>
            <p className="text-sm mb-4" style={{color: '#007E8C'}}>
              Enter your address to see hosts sorted by distance
            </p>
            <div className="flex gap-3 mb-3">
              <input
                type="text"
                placeholder="Enter address, neighborhood, or ZIP code"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-5 py-3 premium-input rounded-xl text-base"
                disabled={geocoding}
              />
              <button
                onClick={handleSearch}
                disabled={geocoding}
                className="btn-primary px-8 py-3 text-white rounded-xl font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="lucide-search w-4 h-4 mr-2"></i>
                {geocoding ? 'Searching...' : 'Search'}
              </button>
            </div>
            <button
              onClick={getCurrentLocation}
              className="text-sm font-medium hover:underline flex items-center transition-all"
              style={{color: '#007E8C'}}
            >
              <i className="lucide-locate w-4 h-4 mr-1.5"></i>
              Use my current location
            </button>
            {userAddress && userCoords && (
              <div className="mt-4 p-3 rounded-lg" style={{backgroundColor: 'rgba(71, 179, 203, 0.1)'}}>
                <p className="text-sm font-medium" style={{color: '#236383'}}>
                  📍 Showing hosts near: <span className="font-semibold">{userAddress}</span>
                </p>
              </div>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => { setShowMap(false); setViewMode('proximity'); }}
              className={`view-toggle-btn px-6 py-3 rounded-xl font-medium transition-all ${
                !showMap && viewMode === 'proximity' ? 'active' : ''
              }`}
              style={{
                backgroundColor: !showMap && viewMode === 'proximity' ? '#007E8C' : undefined,
                color: !showMap && viewMode === 'proximity' ? 'white' : undefined
              }}
            >
              {userCoords ? '📍 Nearest First' : '📋 All Hosts'}
            </button>
            <button
              onClick={() => { setShowMap(false); setViewMode('area'); }}
              className={`view-toggle-btn px-6 py-3 rounded-xl font-medium transition-all ${
                !showMap && viewMode === 'area' ? 'active' : ''
              }`}
              style={{
                backgroundColor: !showMap && viewMode === 'area' ? '#007E8C' : undefined,
                color: !showMap && viewMode === 'area' ? 'white' : undefined
              }}
            >
              🏘️ By Area
            </button>
            {userCoords && (
              <button
                onClick={() => setShowMap(true)}
                className={`view-toggle-btn px-6 py-3 rounded-xl font-medium flex items-center transition-all ${
                  showMap ? 'active' : ''
                }`}
                style={{
                  backgroundColor: showMap ? '#007E8C' : undefined,
                  color: showMap ? 'white' : undefined
                }}
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
              className="mt-4 px-5 py-3 premium-input rounded-xl font-medium text-base"
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
          <div className="bg-white rounded-2xl premium-card mb-8 overflow-hidden">
            <div className="p-6 border-b" style={{borderColor: 'rgba(71, 179, 203, 0.15)'}}>
              <h2 className="text-xl font-bold mb-3" style={{color: '#236383'}}>
                🗺️ Drop-Off Locations Map
              </h2>
              <div className="flex flex-wrap gap-4 mb-2">
                <span className="inline-flex items-center text-sm font-medium" style={{color: '#236383'}}>
                  <span className="w-4 h-4 rounded-full mr-2 border-2 border-white shadow-sm" style={{backgroundColor: '#47B3CB'}}></span>
                  Your location
                </span>
                <span className="inline-flex items-center text-sm font-medium" style={{color: '#236383'}}>
                  <span className="w-4 h-4 rounded-full mr-2 border-2 border-white shadow-sm" style={{backgroundColor: '#A31C41'}}></span>
                  Drop-off hosts
                </span>
              </div>
              <p className="text-xs font-medium mb-3" style={{color: '#007E8C'}}>
                💡 Click any marker to see host details and get directions
              </p>

              {/* Toggle for showing all hosts on map */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAllHostsOnMap(!showAllHostsOnMap)}
                  className="premium-badge px-4 py-2 rounded-xl font-semibold text-sm transition-all hover:shadow-md"
                  style={{
                    backgroundColor: showAllHostsOnMap ? '#007E8C' : 'white',
                    color: showAllHostsOnMap ? 'white' : '#007E8C',
                    border: `2px solid ${showAllHostsOnMap ? '#007E8C' : 'rgba(0, 126, 140, 0.3)'}`
                  }}
                >
                  {showAllHostsOnMap ? `Showing All ${availableHosts.length} Hosts` : 'Showing Closest 3 Hosts'}
                </button>
                <button
                  onClick={() => setShowAllHostsOnMap(!showAllHostsOnMap)}
                  className="text-xs font-semibold hover:underline transition-all"
                  style={{color: '#007E8C'}}
                >
                  {showAllHostsOnMap ? '← Show Only Closest 3' : 'Show All Hosts →'}
                </button>
              </div>

              {showingDirections && routeInfo && (
                <div className="mt-3 p-3 rounded-lg" style={{backgroundColor: '#E6F7FF', borderColor: '#007E8C', border: '1px solid'}}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium" style={{color: '#007E8C'}}>
                      Route to {routeInfo.hostName}
                    </span>
                    <button
                      onClick={clearDirections}
                      className="text-xs px-2 py-1 rounded" 
                      style={{backgroundColor: '#FBAD3F', color: 'white'}}
                    >
                      Clear Route
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs" style={{color: '#236383'}}>
                      <span className="font-medium">{routeInfo.duration}</span> • {routeInfo.distance}
                    </div>
                    <button
                      onClick={() => openGoogleMapsDirections(availableHosts.find(h => h.id === showingDirections))}
                      className="text-xs px-3 py-1 rounded flex items-center"
                      style={{backgroundColor: '#007E8C', color: 'white'}}
                    >
                      <i className="lucide-external-link w-3 h-3 mr-1"></i>
                      Open in Google Maps
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div id="map" className="h-96"></div>
          </div>
        )}

        {/* Host List */}
        {!showMap && (
          <div className="space-y-4">
            {userCoords && viewMode === 'proximity' && (
              <div className="distance-banner p-4 mb-2">
                <div className="flex items-center">
                  <i className="lucide-map-pin w-5 h-5 mr-2.5" style={{color: '#007E8C'}}></i>
                  <span className="text-sm font-semibold" style={{color: '#236383'}}>
                    Hosts sorted by distance from your location
                  </span>
                </div>
              </div>
            )}
          {filteredHosts.length === 0 ? (
            <div className="bg-white rounded-2xl premium-card p-12 text-center">
              <p className="text-lg font-medium text-gray-500">No hosts found in this area.</p>
            </div>
          ) : (
            filteredHosts.map((host, index) => (
              <div
                key={host.id}
                className={`bg-white rounded-2xl premium-card p-6 hover:shadow-md transition-shadow flex ${
                  userCoords && viewMode === 'proximity' && index < 3
                    ? `top-host-card top-host-${index + 1}`
                    : ''
                }`}
              >
                {/* Small map view for each host */}
                <div className="flex-shrink-0 mr-6" style={{width: '120px'}}>
                  {GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY_HERE' ? (
                    <img
                      src={`https://maps.googleapis.com/maps/api/staticmap?center=${host.lat},${host.lng}&zoom=14&size=120x120&maptype=roadmap&markers=color:red%7C${host.lat},${host.lng}&key=${GOOGLE_MAPS_API_KEY}`}
                      alt={`Map of ${host.name}`}
                      className="rounded-xl border border-gray-200 shadow-sm"
                      style={{width: '120px', height: '120px', objectFit: 'cover'}}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="rounded-xl border border-gray-200 shadow-sm flex items-center justify-center"
                    style={{
                      width: '120px', 
                      height: '120px', 
                      backgroundColor: '#f8f9fa',
                      display: GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE' ? 'flex' : 'none'
                    }}
                  >
                    <div className="text-center text-xs" style={{color: '#236383'}}>
                      <i className="lucide-map-pin w-6 h-6 mx-auto mb-1"></i>
                      <div className="font-semibold">{host.area}</div>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {userCoords && viewMode === 'proximity' && index < 3 && (
                          <span className={`w-8 h-8 rank-badge rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                          }`}>
                            {index + 1}
                          </span>
                        )}
                        <h3 className="font-bold text-xl">{host.name}</h3>
                        {host.distance && (
                          <span className="premium-badge px-3 py-1.5 text-sm font-semibold rounded-full" style={{backgroundColor: '#E6F7FF', color: '#007E8C'}}>
                            {host.distance} mi
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium mb-3" style={{color: '#236383'}}>
                        📍 {host.area}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {userCoords && showMap && (
                        <button
                          onClick={() => showingDirections === host.id ? clearDirections() : showDirections(host)}
                          className="btn-primary px-5 py-2.5 rounded-xl font-medium text-white text-xs flex items-center"
                          style={{backgroundColor: showingDirections === host.id ? '#A31C41' : '#FBAD3F'}}
                        >
                          <i className="lucide-route w-3 h-3 mr-1"></i>
                          {showingDirections === host.id ? 'Clear Route' : 'Show Route'}
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedHost(host)}
                        className="btn-primary px-5 py-2.5 rounded-xl font-medium text-white text-sm flex items-center"
                        style={{backgroundColor: '#007E8C'}}
                      >
                        <i className="lucide-navigation w-3 h-3 mr-1"></i>
                        Directions
                      </button>
                    </div>
                  </div>
                  {/* ...existing code... */}
                  <div className="space-y-3 text-sm">
                    {/* ...existing code... */}
                  </div>
                  {/* ...existing code... */}
                </div>

                <div className="space-y-3 text-sm">
                  <div className="info-box p-4">
                    <div className="flex items-start">
                      <i className="lucide-clock w-4 h-4 mr-2 mt-0.5" style={{color: '#007E8C'}}></i>
                      <div>
                        <div className="font-semibold mb-1" style={{color: '#236383'}}>Drop-off Hours - Tuesday, Oct 1st</div>
                        <div className="font-medium" style={{color: '#007E8C'}}>{host.hours}</div>
                      </div>
                    </div>
                  </div>

                  <div className="info-box p-4">
                    <div className="flex items-center">
                      <i className="lucide-phone w-4 h-4 mr-2" style={{color: '#007E8C'}}></i>
                      <div>
                        <span className="font-semibold" style={{color: '#236383'}}>Contact: </span>
                        <a href={`tel:${host.phone.replace(/[^0-9]/g, '')}`} className="hover:underline font-semibold" style={{color: '#007E8C'}}>
                          {host.phone}
                        </a>
                      </div>
                    </div>
                  </div>

                  {userCoords && (
                    <div className="info-box p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <i className="lucide-car w-4 h-4 mr-2" style={{color: '#007E8C'}}></i>
                          <div>
                            <span className="font-semibold" style={{color: '#236383'}}>Distance: </span>
                            <span className="font-medium" style={{color: '#007E8C'}}>{host.distance} miles</span>
                            {routeInfo && routeInfo.hostId === host.id && (
                              <span className="font-medium" style={{color: '#007E8C'}}> • {routeInfo.duration}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => openGoogleMapsDirections(host)}
                          className="btn-primary text-xs px-5 py-2.5 rounded-xl font-medium flex items-center"
                          style={{backgroundColor: '#007E8C', color: 'white'}}
                        >
                          <i className="lucide-external-link w-3 h-3 mr-1"></i>
                          Maps
                        </button>
                      </div>
                    </div>
                  )}
                </div>


                {host.notes && (
                  <div className="mt-4 warning-box p-4">
                    <div className="flex items-start">
                      <i className="lucide-alert-circle w-5 h-5 mr-3 flex-shrink-0 mt-0.5" style={{color: '#FBAD3F'}}></i>
                      <div>
                        <div className="font-bold mb-1.5" style={{color: '#A31C41'}}>⚠️ Special Instructions</div>
                        <div className="text-sm font-medium" style={{color: '#236383'}}>{host.notes}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          </div>
        )}

        {/* Directions Modal */}
        {selectedHost && (
          <div className="modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedHost(null)}>
            <div className="modal-content bg-white rounded-2xl p-8 max-w-md w-full premium-card-header" onClick={e => e.stopPropagation()}>
              <h3 className="text-2xl font-bold mb-2" style={{color: '#236383'}}>{selectedHost.name}</h3>
              <p className="text-base font-medium mb-2" style={{color: '#007E8C'}}>📍 {selectedHost.area}</p>
              {selectedHost.distance && (
                <div className="premium-badge px-4 py-2 mb-6 inline-block rounded-xl">
                  <p className="text-sm font-semibold" style={{color: '#007E8C'}}>
                    <i className="lucide-map-pin w-4 h-4 mr-1.5 inline"></i>
                    {selectedHost.distance} miles away
                    {routeInfo && routeInfo.hostId === selectedHost.id && (
                      <span> • {routeInfo.duration} drive</span>
                    )}
                  </p>
                </div>
              )}
              <div className="space-y-3">
                {userCoords && (
                  <button
                    onClick={() => {
                      setShowMap(true);
                      showDirections(selectedHost);
                      setSelectedHost(null);
                    }}
                    className="btn-secondary block w-full px-6 py-3.5 text-white rounded-xl font-semibold text-center transition-all"
                    style={{backgroundColor: '#FBAD3F'}}
                  >
                    🗺️ Show Route on Map
                  </button>
                )}
                <a
                  href={`https://maps.apple.com/?daddr=${selectedHost.lat},${selectedHost.lng}`}
                  className="btn-primary block w-full px-6 py-3.5 text-white rounded-xl font-semibold text-center transition-all"
                  style={{backgroundColor: '#007E8C'}}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🍎 Open in Apple Maps
                </a>
                <button
                  onClick={() => openGoogleMapsDirections(selectedHost)}
                  className="btn-primary block w-full px-6 py-3.5 text-white rounded-xl font-semibold text-center transition-all"
                  style={{backgroundColor: '#A31C41'}}
                >
                  🌎 Open in Google Maps
                </button>
                <button
                  onClick={() => setSelectedHost(null)}
                  className="view-toggle-btn block w-full px-6 py-3.5 rounded-xl font-semibold text-center transition-all"
                  style={{backgroundColor: 'white', color: '#236383', border: '2px solid rgba(71, 179, 203, 0.3)'}}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Modal */}
        {showAdmin && (
          <div className="modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowAdmin(false)}>
            <div className="modal-content bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto premium-card-header" onClick={e => e.stopPropagation()}>
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold" style={{color: '#236383'}}>🔧 Admin: Manage Hosts</h2>
                  <button
                    onClick={() => setShowAdmin(false)}
                    className="text-2xl px-3 py-1 rounded-lg hover:bg-gray-100"
                    style={{color: '#A31C41'}}
                  >
                    ×
                  </button>
                </div>

                {/* Import/Export Controls */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <h3 className="font-semibold mb-3" style={{color: '#236383'}}>📁 Backup & Restore</h3>
                  <div className="flex gap-3">
                    <button
                      onClick={exportHosts}
                      className="px-4 py-2 rounded-lg font-medium text-white"
                      style={{backgroundColor: '#007E8C'}}
                    >
                      📤 Export Data
                    </button>
                    <label className="px-4 py-2 rounded-lg font-medium text-white cursor-pointer" style={{backgroundColor: '#FBAD3F'}}>
                      📥 Import Data
                      <input
                        type="file"
                        accept=".json"
                        onChange={importHosts}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Add New Host Button */}
                <div className="mb-6">
                  <button
                    onClick={() => setEditingHost({ id: 'new', name: '', area: '', lat: '', lng: '', phone: '', hours: '', notes: '', available: true })}
                    className="px-6 py-3 rounded-xl font-semibold text-white"
                    style={{backgroundColor: '#007E8C'}}
                  >
                    ➕ Add New Host
                  </button>
                </div>

                {/* Hosts List */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg mb-3" style={{color: '#236383'}}>All Hosts ({allHosts.length})</h3>
                  {allHosts.map(host => (
                    <div key={host.id} className={`p-4 rounded-xl border-2 ${host.available ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-bold text-lg">{host.name}</h4>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              host.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {host.available ? '✅ Available' : '❌ Unavailable'}
                            </span>
                          </div>
                          <div className="text-sm space-y-1" style={{color: '#236383'}}>
                            <p><strong>Area:</strong> {host.area}</p>
                            <p><strong>Phone:</strong> {host.phone}</p>
                            <p><strong>Hours:</strong> {host.hours}</p>
                            <p><strong>Location:</strong> {host.lat}, {host.lng}</p>
                            {host.notes && <p><strong>Notes:</strong> {host.notes}</p>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleHostAvailability(host.id)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium text-white ${
                              host.available ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'
                            }`}
                          >
                            {host.available ? '💤 Disable' : '✅ Enable'}
                          </button>
                          <button
                            onClick={() => setEditingHost(host)}
                            className="px-3 py-2 rounded-lg text-sm font-medium text-white"
                            style={{backgroundColor: '#FBAD3F'}}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete ${host.name}? This cannot be undone.`)) {
                                deleteHost(host.id);
                              }
                            }}
                            className="px-3 py-2 rounded-lg text-sm font-medium text-white"
                            style={{backgroundColor: '#A31C41'}}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Host Modal */}
        {editingHost && (
          <div className="modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setEditingHost(null)}>
            <div className="modal-content bg-white rounded-2xl max-w-2xl w-full premium-card-header" onClick={e => e.stopPropagation()}>
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-6" style={{color: '#236383'}}>
                  {editingHost.id === 'new' ? '➕ Add New Host' : `✏️ Edit ${editingHost.name}`}
                </h3>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const hostData = {
                    name: formData.get('name'),
                    area: formData.get('area'),
                    lat: formData.get('lat'),
                    lng: formData.get('lng'),
                    phone: formData.get('phone'),
                    hours: formData.get('hours'),
                    notes: formData.get('notes'),
                    available: formData.get('available') === 'on'
                  };
                  
                  if (editingHost.id === 'new') {
                    addHost(hostData);
                  } else {
                    updateHost(editingHost.id, hostData);
                  }
                  setEditingHost(null);
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block font-semibold mb-2" style={{color: '#236383'}}>Name</label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={editingHost.name}
                        required
                        className="w-full px-4 py-3 premium-input rounded-xl"
                        placeholder="e.g., Karen C."
                      />
                    </div>
                    
                    <div>
                      <label className="block font-semibold mb-2" style={{color: '#236383'}}>Area/Neighborhood</label>
                      <input
                        type="text"
                        name="area"
                        defaultValue={editingHost.area}
                        required
                        className="w-full px-4 py-3 premium-input rounded-xl"
                        placeholder="e.g., Johns Creek"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold mb-2" style={{color: '#236383'}}>Latitude</label>
                        <input
                          type="number"
                          step="any"
                          name="lat"
                          defaultValue={editingHost.lat}
                          required
                          className="w-full px-4 py-3 premium-input rounded-xl"
                          placeholder="34.0562454"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-2" style={{color: '#236383'}}>Longitude</label>
                        <input
                          type="number"
                          step="any"
                          name="lng"
                          defaultValue={editingHost.lng}
                          required
                          className="w-full px-4 py-3 premium-input rounded-xl"
                          placeholder="-84.2510305"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block font-semibold mb-2" style={{color: '#236383'}}>Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        defaultValue={editingHost.phone}
                        required
                        className="w-full px-4 py-3 premium-input rounded-xl"
                        placeholder="404.451.7942"
                      />
                    </div>
                    
                    <div>
                      <label className="block font-semibold mb-2" style={{color: '#236383'}}>Drop-off Hours</label>
                      <input
                        type="text"
                        name="hours"
                        defaultValue={editingHost.hours}
                        required
                        className="w-full px-4 py-3 premium-input rounded-xl"
                        placeholder="8 am to 8 pm"
                      />
                    </div>
                    
                    <div>
                      <label className="block font-semibold mb-2" style={{color: '#236383'}}>Special Instructions (optional)</label>
                      <textarea
                        name="notes"
                        defaultValue={editingHost.notes}
                        className="w-full px-4 py-3 premium-input rounded-xl"
                        rows="3"
                        placeholder="Text prior to delivering, ring doorbell, etc."
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="available"
                        defaultChecked={editingHost.available}
                        className="mr-3 w-5 h-5"
                      />
                      <label className="font-semibold" style={{color: '#236383'}}>Available this week</label>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-8">
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 rounded-xl font-semibold text-white"
                      style={{backgroundColor: '#007E8C'}}
                    >
                      {editingHost.id === 'new' ? '➕ Add Host' : '💾 Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingHost(null)}
                      className="px-6 py-3 rounded-xl font-semibold"
                      style={{backgroundColor: 'white', color: '#236383', border: '2px solid rgba(71, 179, 203, 0.3)'}}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
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