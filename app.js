const HostAvailabilityApp = () => {
  const [userAddress, setUserAddress] = React.useState('');
  const [searchInput, setSearchInput] = React.useState('');
  const [nameSearch, setNameSearch] = React.useState('');
  const [userCoords, setUserCoords] = React.useState(null);
  const [viewMode, setViewMode] = React.useState('proximity'); 
  const [filterArea, setFilterArea] = React.useState('all');
  const [selectedHost, setSelectedHost] = React.useState(null);
  const [geocoding, setGeocoding] = React.useState(false);
  const [map, setMap] = React.useState(null);
  const [mapLoaded, setMapLoaded] = React.useState(false);
  const [directionsService, setDirectionsService] = React.useState(null);
  const [directionsRenderer, setDirectionsRenderer] = React.useState(null);
  const [showingDirections, setShowingDirections] = React.useState(null);
  const [routeInfo, setRouteInfo] = React.useState(null);
  const [directionSteps, setDirectionSteps] = React.useState(null);
  const [showAllHostsOnMap, setShowAllHostsOnMap] = React.useState(false);
  const [showAdmin, setShowAdmin] = React.useState(false);
  const [editingHost, setEditingHost] = React.useState(null);
  const [highlightedHostId, setHighlightedHostId] = React.useState(null);
  const markersRef = React.useRef({});

  // Google Tag Manager tracking helper
  const trackEvent = (eventName, eventParams = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...eventParams
    });
  };

  // Scroll depth tracking
  React.useEffect(() => {
    const scrollDepths = { 25: false, 50: false, 75: false, 100: false };
    const sectionsViewed = {};

    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollPercent = (scrollTop / (documentHeight - windowHeight)) * 100;

      // Track scroll depth milestones
      [25, 50, 75, 100].forEach(depth => {
        if (scrollPercent >= depth && !scrollDepths[depth]) {
          scrollDepths[depth] = true;
          trackEvent('scroll_depth', {
            event_category: 'Engagement',
            event_label: `${depth}% Scrolled`,
            value: depth
          });
        }
      });

      // Track specific section views
      const sections = [
        { id: 'map', name: 'Map Section' },
        { id: 'root', name: 'Host List' }
      ];

      sections.forEach(section => {
        const element = document.getElementById(section.id);
        if (element && !sectionsViewed[section.id]) {
          const rect = element.getBoundingClientRect();
          const isInViewport = rect.top < windowHeight && rect.bottom > 0;

          if (isInViewport) {
            sectionsViewed[section.id] = true;
            trackEvent('section_view', {
              event_category: 'Engagement',
              event_label: section.name,
              section_id: section.id
            });
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    // Trigger once on mount to catch initial viewport
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Get next Wednesday's date (or today if it's Wednesday and still drop-off day)
  const getNextWednesday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 3 = Wednesday
    let daysUntilWednesday = (3 - dayOfWeek + 7) % 7;

    // If today is Wednesday (daysUntilWednesday === 0), return today
    // Otherwise return the next Wednesday
    const nextWednesday = new Date(today);
    nextWednesday.setDate(today.getDate() + daysUntilWednesday);

    return nextWednesday;
  };

  const nextWednesday = getNextWednesday();
  const dropOffDate = nextWednesday.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const dropOffDateShort = nextWednesday.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  // Initialize hosts from localStorage or use default data
  const getInitialHosts = () => {
    const DATA_VERSION = window.CONFIG?.DATA_VERSION || '2025-10-16';
    const savedVersion = localStorage.getItem('sandwichHostsVersion');
    const savedHosts = localStorage.getItem('sandwichHosts');

    // If version doesn't match, clear old data and use defaults
    if (savedHosts && savedVersion === DATA_VERSION) {
      return JSON.parse(savedHosts);
    }

    // Clear old data and set new version
    localStorage.setItem('sandwichHostsVersion', DATA_VERSION);

    // Default host data with actual coordinates from your spreadsheet
    return [
      { id: 1, name: 'Karen C.', area: 'Johns Creek', neighborhood: 'Glenn Abbey', lat: 34.0562454, lng: -84.2510305, phone: '404.451.7942', hours: '8 am to 8 pm', openTime: '08:00', closeTime: '20:00', notes: '', available: true },
      { id: 2, name: 'Nancy M.', area: 'Johns Creek', neighborhood: 'Chartwell', lat: 34.0190365, lng: -84.27345269999999, phone: '678.575.6898', hours: '8 am to 8 pm', openTime: '08:00', closeTime: '20:00', notes: '', available: true },
      { id: 3, name: 'Julie B.', area: 'Buckhead', lat: 33.8543082, lng: -84.3709417, phone: '404.808.2560', hours: '8 am to 8 pm', openTime: '08:00', closeTime: '20:00', notes: 'Please pull up driveway in back. Refrigerator in garage.', available: false },
      { id: 4, name: 'Kate D.', area: 'Chastain Park', lat: 33.8804237, lng: -84.4067199, phone: '404.271.4352', hours: '9 am to 5 pm', openTime: '09:00', closeTime: '17:00', notes: 'Please text prior to delivering to make sure host is available to receive sandwiches.', available: false },
      { id: 5, name: 'Jordan H.', area: 'Chamblee/Brookhaven', neighborhood: 'Sexton Woods near Keswick Park', lat: 33.8981194, lng: -84.31290740000001, phone: '770.789.7329', hours: '9 am to 5 pm', openTime: '09:00', closeTime: '17:00', notes: 'Please text when you arrive and /or ring doorbell.', available: true },
      { id: 6, name: 'Veronica P.', area: 'Dacula', lat: 33.97561, lng: -83.883747, phone: '470.509.5333', hours: '8 am to 7 pm', openTime: '08:00', closeTime: '19:00', notes: '', available: true },
      { id: 7, name: 'Lisa H.', area: 'Dunwoody', neighborhood: 'Brooke Farm', lat: 33.952725, lng: -84.290274, phone: '770.826.0457', hours: 'Wed 4-9pm, Thu 8-9:30am', openTime: '16:00', closeTime: '21:00', thursdayOpenTime: '08:00', thursdayCloseTime: '09:30', notes: '', available: true },
      { id: 8, name: 'Marcy L. & Stephanie', area: 'Dunwoody', neighborhood: 'Near Dunwoody Village', lat: 33.9463163, lng: -84.327786, phone: '678.596.9697', hours: '8 am to 8 pm', openTime: '08:00', closeTime: '20:00', notes: 'Sign in sheet and labels on front porch', available: true },
      { id: 9, name: 'Darren W.', area: 'Dunwoody', neighborhood: 'Dunwoody Club Forest', lat: 33.96450859999999, lng: -84.3151065, phone: '770.490.6206', hours: '8 am to 8 pm', openTime: '08:00', closeTime: '20:00', notes: '', available: true },
      { id: 10, name: 'Silke S.', area: 'East Cobb', lat: 34.0159666, lng: -84.44707, phone: '404.375.9541', hours: '9 am to 7 pm', openTime: '09:00', closeTime: '19:00', notes: 'Text once delivered', available: false },
      { id: 12, name: 'Vicki T.', area: 'East Cobb', neighborhood: 'East Hampton by The Avenues', lat: 34.0003401, lng: -84.417205, phone: '404.202.9108', hours: '9 am to 6:30 pm', openTime: '09:00', closeTime: '18:30', notes: 'Drop off in garage (fridge & sign in there).  Text Vicki once delivered', available: true },
      { id: 13, name: 'Rebecca H.', area: 'East Atlanta', neighborhood: 'Near Burgess Elementary School', lat: 33.7371671, lng: -84.33107059999999, phone: '847.687.9143', hours: '10 am to 6 pm', openTime: '10:00', closeTime: '18:00', notes: 'Text Rebecca once delivered', available: true },
      { id: 14, name: 'Sarah P.', area: 'Milton', neighborhood: 'Woodwinds at New Providence', lat: 34.116782, lng: -84.354432, phone: '816.308.2273', hours: '9 am to 8 pm', openTime: '09:00', closeTime: '20:00', notes: 'Text Sarah after drop-off', available: true },
      { id: 15, name: 'Laura B.', area: 'Oak Grove/Druid Hills', neighborhood: 'Sagamore Hills/Oak Grove', lat: 33.84245629999999, lng: -84.3039661, phone: '404.931.8774', hours: '8 am to 7 pm', openTime: '08:00', closeTime: '19:00', notes: '', available: true },
      { id: 16, name: 'Tracie N.', area: 'Peachtree Corners', neighborhood: 'Peachtree Station', lat: 33.9784128, lng: -84.23600920000001, phone: '770.315.9177', hours: '2 pm to 8 pm', openTime: '14:00', closeTime: '20:00', notes: '', available: true },
      { id: 17, name: 'Suzanna T.', area: 'Peachtree Corners', neighborhood: 'Amberfield', lat: 33.9815238, lng: -84.2278384, phone: '770.403.4821', hours: '2:30 pm to 8 pm', openTime: '14:30', closeTime: '20:00', notes: '', available: true },
      { id: 18, name: 'Renee V.', area: 'Peachtree Corners', neighborhood: 'Neely Farm', lat: 33.9837379, lng: -84.2589718, phone: '770.265.3563', hours: '2 pm to 8 pm', openTime: '14:00', closeTime: '20:00', notes: '', available: true },
      { id: 19, name: 'Carrey H.', area: 'Roswell', neighborhood: 'Willow Springs/Country Club of Roswell', lat: 34.0320203, lng: -84.2835501, phone: '314.363.2982', hours: '9 am to 7 pm', openTime: '09:00', closeTime: '19:00', notes: '', available: true },
      { id: 20, name: 'Jenny V.W.', area: 'Roswell', neighborhood: 'Lakeside at Ansley', lat: 34.0864211, lng: -84.4086078, phone: '703.403.0711', hours: '8 am to 6 pm', openTime: '08:00', closeTime: '18:00', notes: 'Tell the gatehouse guard you are going to Walter\'s home. Text Jenny when you arrive.', available: true },
      { id: 21, name: 'Jen C.', area: 'Sandy Springs', neighborhood: 'Riverside (off River Valley)', lat: 33.9311095, lng: -84.4050578, phone: '404.918.9933', hours: '8 am to 6 pm', openTime: '08:00', closeTime: '18:00', notes: '', available: true },
      { id: 22, name: 'Sarah K.', area: 'Sandy Springs', neighborhood: 'North Springs', lat: 33.9529678, lng: -84.3758284, phone: '404.455.6743', hours: '9 am to 5 pm', openTime: '09:00', closeTime: '17:00', notes: '', available: true },
      { id: 23, name: 'Alison T.', area: 'Sandy Springs', neighborhood: 'Declaire (just a smidge outside Perimeter)', lat: 33.91549, lng: -84.3968077, phone: '770.355.8876', hours: '9:30 am to 7 pm', openTime: '09:30', closeTime: '19:00', notes: '', available: false },
      { id: 24, name: 'Cynthia C.', area: 'Southwest Atlanta', neighborhood: 'Cascade Hills Subdivision ', lat: 33.7286854, lng: -84.5622846, phone: '678.860.6442', hours: '8 am to 7 pm', openTime: '08:00', closeTime: '19:00', notes: '', available: true },
      { id: 25, name: 'Jason S.', area: 'Suwanee/Johns Creek', neighborhood: 'Superior Play Systems', lat: 34.065908, lng: -84.160894, phone: '678.245.2110', hours: '7 am to 6 pm', openTime: '07:00', closeTime: '18:00', notes: '', available: true },
      { id: 26, name: 'Stacey & Jack G.', area: 'Virginia Highland', neighborhood: 'Virginia Highland/Morningside/Midtown HS', lat: 33.77723595, lng: -84.362274174978, phone: '404.451.7648', hours: '6pm-8pm', openTime: '18:00', closeTime: '20:00', notes: '', available: true },
      { id: 27, name: 'Della F.', area: 'Westminster/Milmar Neighborhood', lat: 33.83844, lng: -84.42356, phone: '404.556.0277', hours: '8 am to 7 pm', openTime: '08:00', closeTime: '19:00', notes: 'Text Della when you arrive. Garage door will be open. Leave sandwiches in the refrigerator.', available: false },
      { id: 28, name: 'Rayna N.', area: 'College Park', lat: 33.63388, lng: -84.53605, phone: '404.376.8028 ', hours: '8 am to 7 pm', openTime: '08:00', closeTime: '19:00', notes: 'Please text when you arrive. ', available: true },
      { id: 29, name: 'Ashley R.', area: 'Decatur', neighborhood: 'Diamond Head', lat: 33.82314, lng: -84.27547, phone: '678.480.8786', hours: '8 am to 8 pm', openTime: '08:00', closeTime: '20:00', notes: 'Deliver to fridge in carport', available: true },
      { id: 30, name: 'Judy T.', area: 'East Cobb', neighborhood: 'Indian Hills', lat: 33.967939, lng: -84.43849, phone: '404-683-5823', hours: '9 am to 6 pm', openTime: '09:00', closeTime: '18:00', notes: 'Ring doorbell', available: true },
      { id: 31, name: 'Kristina M.', area: 'Flowery Branch', neighborhood: 'Sterling on the Lake', lat: 34.1490957945782, lng: -83.8990866162653, phone: '678.372.7959', hours: '9 am to 5 pm', openTime: '09:00', closeTime: '17:00', notes: 'Drop off in clubhouse', available: true },
      { id: 32, name: 'Angie B.', area: 'Intown (Candler Park)', neighborhood: 'Candler Park', lat: 33.7633147, lng: -84.3440672755145, phone: '404.668.6886', hours: '8 am to 6 pm', openTime: '08:00', closeTime: '18:00', notes: '', available: true },
      { id: 33, name: 'Chet B.', area: 'Roswell', neighborhood: 'Horseshoe Bend', lat: 33.99208265, lng: -84.2910639180384, phone: '386.290.8930‬', hours: '9 am to 6 pm', openTime: '09:00', closeTime: '18:00', notes: '', available: true }
    ];
  };

  const [allHosts, setAllHosts] = React.useState(getInitialHosts());

  // Save hosts to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem('sandwichHosts', JSON.stringify(allHosts));
  }, [allHosts]);

  // Admin functions
  const addHost = (hostData) => {
    const newHost = {
      ...hostData,
      id: Math.max(...(allHosts || []).map(h => h.id)) + 1,
      lat: parseFloat(hostData.lat),
      lng: parseFloat(hostData.lng)
    };
    setAllHosts([...(allHosts || []), newHost]);
  };

  const updateHost = (hostId, hostData) => {
    setAllHosts((allHosts || []).map(host => 
      host.id === hostId 
        ? { ...hostData, id: hostId, lat: parseFloat(hostData.lat), lng: parseFloat(hostData.lng) }
        : host
    ));
  };

  const deleteHost = (hostId) => {
    setAllHosts((allHosts || []).filter(host => host.id !== hostId));
  };

  const toggleHostAvailability = (hostId) => {
    setAllHosts((allHosts || []).map(host => 
      host.id === hostId ? { ...host, available: !host.available } : host
    ));
  };

  const exportHosts = () => {
    trackEvent('admin_export_hosts', {
      event_category: 'Admin',
      event_label: 'Export Hosts JSON',
      host_count: (allHosts || []).length
    });
    
    const dataStr = JSON.stringify(allHosts, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `sandwich-hosts-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const copyAsCode = () => {
    trackEvent('admin_copy_code', {
      event_category: 'Admin',
      event_label: 'Copy Hosts as Code',
      host_count: (allHosts || []).length
    });
    
    const codeStr = `    return [\n${(allHosts || []).map(host =>
      `    { id: ${host.id}, name: '${host.name}', area: '${host.area}'${host.neighborhood ? `, neighborhood: '${host.neighborhood}'` : ''}, lat: ${host.lat}, lng: ${host.lng}, phone: '${host.phone}', hours: '${host.hours}', openTime: '${host.openTime}', closeTime: '${host.closeTime}'${host.thursdayOpenTime ? `, thursdayOpenTime: '${host.thursdayOpenTime}', thursdayCloseTime: '${host.thursdayCloseTime}'` : ''}${host.customDropoffDays ? `, customDropoffDays: '${host.customDropoffDays}'` : ''}, notes: '${host.notes}', available: ${host.available} }`
    ).join(',\n')}\n    ];`;

    navigator.clipboard.writeText(codeStr).then(() => {
      alert('Code copied to clipboard! Paste this into app.js lines 56-85 to replace the default host data.');
    }).catch(() => {
      // Fallback: show in a text area
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
      modal.innerHTML = `<div style="background:white;padding:20px;border-radius:8px;max-width:90%;max-height:80%;overflow:auto;"><h3>Copy this code:</h3><textarea style="width:600px;height:400px;font-family:monospace;font-size:12px;">${codeStr}</textarea><br><button onclick="this.parentElement.parentElement.remove()" style="margin-top:10px;padding:8px 16px;background:#007E8C;color:white;border:none;border-radius:4px;cursor:pointer;">Close</button></div>`;
      document.body.appendChild(modal);
    });
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
          trackEvent('admin_import_hosts', {
            event_category: 'Admin',
            event_label: 'Import Hosts JSON',
            host_count: importedHosts.length
          });
        } catch (error) {
          alert('Error importing file. Please check the format.');
          trackEvent('admin_import_error', {
            event_category: 'Admin',
            event_label: 'Import Failed'
          });
        }
      };
      reader.readAsText(file);
    }
  };

  // Only show available hosts
  const availableHosts = (allHosts || []).filter(h => h.available);
  const areas = [...new Set(availableHosts.map(h => h.area))].sort();

  // Use centralized distance calculation utility
  const calculateDistance = window.HostUtils?.calculateDistance || ((lat1, lon1, lat2, lon2) => '0.0');

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
      if (error.message) {
        console.error('Error message:', error.message);
      }
      alert('Error looking up address. Please check your internet connection and try again.');
      return false;
    } finally {
      setGeocoding(false);
    }
  };

  // Calculate host availability status
  const getHostAvailability = (host) => {
    if (!host.openTime || !host.closeTime) return null;

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 3 = Wednesday
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Check if today is Wednesday (drop-off day)
    const isDropOffDay = currentDay === 3;

    if (!isDropOffDay) {
      // Calculate days until Wednesday
      const daysUntilWednesday = (3 - currentDay + 7) % 7 || 7;
      return {
        status: 'closed-until-dropoff',
        message: `Opens ${daysUntilWednesday === 1 ? 'tomorrow' : `in ${daysUntilWednesday} days`} (Wednesday) at ${formatTime(host.openTime)}`,
        color: '#FBAD3F'
      };
    }

    // It's Wednesday - check if within operating hours
    if (currentTime < host.openTime) {
      const openDate = new Date();
      const [openHour, openMin] = host.openTime.split(':');
      openDate.setHours(parseInt(openHour), parseInt(openMin), 0);
      const hoursUntil = Math.floor((openDate - now) / (1000 * 60 * 60));
      const minutesUntil = Math.floor((openDate - now) / (1000 * 60)) % 60;

      return {
        status: 'opens-soon',
        message: hoursUntil > 0
          ? `Opens in ${hoursUntil}h ${minutesUntil}m`
          : `Opens in ${minutesUntil}m`,
        color: '#FBAD3F'
      };
    } else if (currentTime >= host.openTime && currentTime < host.closeTime) {
      const closeDate = new Date();
      const [closeHour, closeMin] = host.closeTime.split(':');
      closeDate.setHours(parseInt(closeHour), parseInt(closeMin), 0);
      const hoursUntil = Math.floor((closeDate - now) / (1000 * 60 * 60));
      const minutesUntil = Math.floor((closeDate - now) / (1000 * 60)) % 60;

      return {
        status: 'open',
        message: hoursUntil > 1
          ? `Open now - closes in ${hoursUntil}h ${minutesUntil}m`
          : `Open now - closes in ${minutesUntil}m`,
        color: '#28a745'
      };
    } else {
      return {
        status: 'closed',
        message: `Closed for today`,
        color: '#A31C41'
      };
    }
  };

  // Format time from 24hr to 12hr
  const formatTime = (time24) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'pm' : 'am';
    const hour12 = hour % 12 || 12;
    return minutes === '00' ? `${hour12}${ampm}` : `${hour12}:${minutes}${ampm}`;
  };

  // Get user's current location
  const getCurrentLocation = () => {
    trackEvent('get_current_location', {
      event_category: 'Location',
      event_label: 'Use Current Location Button'
    });
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setUserAddress('Current Location');
          setViewMode('proximity');
          
          trackEvent('location_success', {
            event_category: 'Location',
            event_label: 'Current Location Retrieved'
          });
        },
        (error) => {
          alert('Could not get your location. Please enter an address instead.');
          trackEvent('location_error', {
            event_category: 'Location',
            event_label: 'Location Permission Denied'
          });
        }
      );
    } else {
      alert('Location services not available. Please enter an address.');
      trackEvent('location_unavailable', {
        event_category: 'Location',
        event_label: 'Geolocation Not Supported'
      });
    }
  };

  const sortedHosts = React.useMemo(() => {
    if (!userCoords || viewMode !== 'proximity') return availableHosts;

    const sorted = availableHosts.map(host => ({
      ...host,
      distance: calculateDistance(userCoords.lat, userCoords.lng, host.lat, host.lng)
    })).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

    // Track the top 3 closest hosts for analytics
    if (sorted.length > 0) {
      trackEvent('proximity_search_results', {
        event_category: 'Search',
        event_label: 'Closest Hosts',
        closest_host: sorted[0].name,
        closest_host_area: sorted[0].area,
        closest_host_distance: sorted[0].distance.toFixed(2),
        second_closest: sorted[1]?.name || 'N/A',
        third_closest: sorted[2]?.name || 'N/A',
        search_location: userAddress
      });
    }

    return sorted;
  }, [userCoords, viewMode, availableHosts, userAddress]);

  const filteredHosts = React.useMemo(() => {
    let filtered = viewMode === 'proximity' ? sortedHosts : availableHosts;

    // Apply area filter in area view mode
    if (viewMode === 'area' && filterArea !== 'all') {
      filtered = filtered.filter(h => h.area === filterArea);
    }

    // Apply name search filter
    if (nameSearch.trim()) {
      const searchLower = nameSearch.toLowerCase();
      filtered = filtered.filter(h =>
        h.name.toLowerCase().includes(searchLower) ||
        h.area.toLowerCase().includes(searchLower) ||
        (h.neighborhood && h.neighborhood.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }, [filterArea, viewMode, sortedHosts, availableHosts, nameSearch]);

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    const success = await geocodeAddress(searchInput);
    if (success) {
      setUserAddress(searchInput);
      setViewMode('proximity');
    }
  };

  // Smart search that detects if input is an address or name/area filter
  const handleSmartSearch = async () => {
    if (!searchInput.trim()) return;

    const input = searchInput.trim();

    // Check if any host matches the input as a name or area
    const matchingHosts = availableHosts.filter(h =>
      h.name.toLowerCase().includes(input.toLowerCase()) ||
      h.area.toLowerCase().includes(input.toLowerCase()) ||
      (h.neighborhood && h.neighborhood.toLowerCase().includes(input.toLowerCase()))
    );

    // Heuristics to detect if it's likely an address:
    // - Contains numbers (street address or ZIP)
    // - Contains common address keywords
    // - Is a 5-digit ZIP code
    const hasNumbers = /\d/.test(input);
    const isZipCode = /^\d{5}$/.test(input);
    const hasAddressKeywords = /\b(street|st|road|rd|drive|dr|avenue|ave|lane|ln|way|court|ct|circle|blvd|boulevard|parkway|pkwy)\b/i.test(input);

    const looksLikeAddress = isZipCode || hasNumbers || hasAddressKeywords;

    // If it matches hosts AND doesn't look like an address, use name search
    if (matchingHosts.length > 0 && !looksLikeAddress) {
      setNameSearch(input);
      setUserCoords(null);
      setUserAddress('');
      setViewMode('list');
      
      trackEvent('search_by_name', {
        event_category: 'Search',
        event_label: 'Name/Area Filter',
        search_term: input
      });
    } else {
      // Try geocoding as an address
      const success = await geocodeAddress(input);
      if (success) {
        setUserAddress(input);
        setNameSearch(''); // Clear any name filter
        setViewMode('proximity');
        
        trackEvent('search_by_address', {
          event_category: 'Search',
          event_label: 'Address Geocoded',
          search_term: input
        });
      } else {
        // Geocoding failed, fall back to name search if we have matches
        if (matchingHosts.length > 0) {
          setNameSearch(input);
          setUserCoords(null);
          setUserAddress('');
          setViewMode('list');
          
          trackEvent('search_fallback', {
            event_category: 'Search',
            event_label: 'Geocode Failed - Used Name Search',
            search_term: input
          });
        }
      }
    }
  };

  // Initialize Google Map
  const initializeMap = React.useCallback(() => {
    if (!window.google || map) return;

    // Calculate map center: use user location if available, otherwise center on Atlanta
    const atlBounds = window.CONFIG?.ATLANTA_BOUNDS || {
      southwest: { lat: 33.4734, lng: -84.8882 },
      northeast: { lat: 34.1620, lng: -83.9937 }
    };
    const atlCenter = {
      lat: (atlBounds.southwest.lat + atlBounds.northeast.lat) / 2,
      lng: (atlBounds.southwest.lng + atlBounds.northeast.lng) / 2
    };
    const mapCenter = userCoords || atlCenter;
    const mapZoom = userCoords ? 11 : 10;

    const mapInstance = new window.google.maps.Map(document.getElementById('map'), {
      center: mapCenter,
      zoom: mapZoom,
      mapId: 'SANDWICH_DROP_OFF_MAP',
      styles: [
        {
          featureType: 'poi',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    // Add user location marker only if we have user coordinates
    if (userCoords) {
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

      new google.maps.marker.AdvancedMarkerElement({
        position: userCoords,
        map: mapInstance,
        title: 'Your Location',
        content: userMarkerContent
      });
    }

    // Prepare host data: sort by distance if user coords available, otherwise show all
    let hostsToShowOnMap;
    let hostsWithDistance;

    if (userCoords) {
      hostsWithDistance = availableHosts.map(host => ({
        ...host,
        distance: calculateDistance(userCoords.lat, userCoords.lng, host.lat, host.lng)
      })).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      hostsToShowOnMap = showAllHostsOnMap ? hostsWithDistance : hostsWithDistance.slice(0, 3);
    } else {
      // No user location - show all hosts without distance sorting
      hostsToShowOnMap = availableHosts;
      hostsWithDistance = availableHosts;
    }

    // Clear previous markers
    markersRef.current = {};

    // Add host markers with numbered labels
    hostsToShowOnMap.forEach((host, index) => {
      const rank = hostsWithDistance.findIndex(h => h.id === host.id) + 1;

      // Determine marker styling based on whether we have user location
      let markerColor = '#007E8C'; // Default teal
      let badgeColor = '#007E8C';
      let badgeTextColor = '#FFFFFF';

      if (userCoords) {
        // With user location, use ranking colors
        markerColor = '#A31C41'; // Default red
        badgeColor = '#FFFFFF';
        badgeTextColor = '#236383';

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
      }

      // Create host marker content
      const hostMarkerContent = document.createElement('div');

      if (userCoords) {
        // Show numbered markers with distance when user location is known
        hostMarkerContent.innerHTML = `
          <div class="marker-wrapper" style="
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            transition: transform 0.2s ease;
          ">
            <!-- Numbered badge -->
            <div class="marker-badge" style="
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
              transition: transform 0.2s ease, box-shadow 0.2s ease;
            ">
              ${rank}
            </div>
            <!-- Info label -->
            <div class="marker-label" style="
              background: white;
              border: 2px solid ${markerColor};
              border-radius: 8px;
              padding: 4px 8px;
              font-size: 11px;
              font-weight: bold;
              color: #236383;
              white-space: nowrap;
              box-shadow: 0 2px 6px rgba(0,0,0,0.2);
              transition: transform 0.2s ease, box-shadow 0.2s ease;
            ">
              ${host.distance}mi
            </div>
          </div>
        `;
      } else {
        // Show simple markers without distance when no user location
        hostMarkerContent.innerHTML = `
          <div class="marker-wrapper" style="
            width: 32px;
            height: 32px;
            background: ${badgeColor};
            border: 3px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          ">
            <div style="
              width: 12px;
              height: 12px;
              background: white;
              border-radius: 50%;
            "></div>
          </div>
        `;
      }

      const markerTitle = userCoords
        ? `#${rank}: ${host.name} - ${host.distance} miles away`
        : host.name;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: host.lat, lng: host.lng },
        map: mapInstance,
        title: markerTitle,
        content: hostMarkerContent
      });

      // Store marker reference
      markersRef.current[host.id] = { marker, content: hostMarkerContent };

      // Add click listener to show host info
      marker.addListener('click', () => {
        setSelectedHost(host);
        setHighlightedHostId(host.id);
        trackEvent('map_marker_click', {
          event_category: 'Map',
          event_label: 'Marker Clicked',
          host_name: host.name,
          host_area: host.area,
          rank: rank
        });
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

  // Load Google Maps API on component mount
  React.useEffect(() => {
    if (mapLoaded) return;

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
  }, [GOOGLE_MAPS_API_KEY, mapLoaded]);

  // Reset map when toggle changes
  React.useEffect(() => {
    if (map) {
      setMap(null); // Force map re-initialization
    }
  }, [showAllHostsOnMap]);

  // Reset map when user coordinates change (to re-center and add user marker)
  const prevUserCoords = React.useRef(userCoords);
  React.useEffect(() => {
    if (userCoords && prevUserCoords.current !== userCoords && map) {
      setMap(null); // Force map re-initialization with new user location
    }
    prevUserCoords.current = userCoords;
  }, [userCoords, map]);

  // Initialize map when API is loaded AND map div exists (works with or without user location)
  React.useEffect(() => {
    if (mapLoaded && viewMode !== 'list') {
      // Check if map element exists in DOM before initializing
      const mapElement = document.getElementById('map');
      if (mapElement) {
        // Small delay to ensure DOM element is fully ready
        setTimeout(initializeMap, 100);
      }
    }
  }, [mapLoaded, userCoords, viewMode, initializeMap]);

  // Handle marker highlighting when highlightedHostId changes
  React.useEffect(() => {
    // Remove highlight from all markers
    Object.values(markersRef.current).forEach(({ content }) => {
      const wrapper = content.querySelector('.marker-wrapper');
      const badge = content.querySelector('.marker-badge');
      const label = content.querySelector('.marker-label');

      if (wrapper) {
        wrapper.style.transform = 'scale(1)';
      }
      if (badge) {
        badge.style.transform = 'scale(1)';
        badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      }
      if (label) {
        label.style.transform = 'scale(1)';
        label.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
      }
    });

    // Apply highlight to the selected marker
    if (highlightedHostId && markersRef.current[highlightedHostId]) {
      const { content, marker } = markersRef.current[highlightedHostId];
      const wrapper = content.querySelector('.marker-wrapper');
      const badge = content.querySelector('.marker-badge');
      const label = content.querySelector('.marker-label');

      if (wrapper) {
        wrapper.style.transform = 'scale(1.3)';
      }
      if (badge) {
        badge.style.transform = 'scale(1.3)';
        badge.style.boxShadow = '0 4px 16px rgba(251, 173, 63, 0.8)';
      }
      if (label) {
        label.style.transform = 'scale(1.3)';
        label.style.boxShadow = '0 4px 12px rgba(251, 173, 63, 0.6)';
      }

      // Pan map to marker
      if (map && marker) {
        map.panTo(marker.position);
      }
    }
  }, [highlightedHostId, map]);

  // Show driving directions on map
  const showDirections = (host) => {
    if (!directionsService || !directionsRenderer || !userCoords) return;

    trackEvent('show_directions', {
      event_category: 'Directions',
      event_label: 'Show Route on Map',
      host_name: host.name,
      host_area: host.area
    });

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
          hostName: host.name,
          hostAddress: `${host.area}${host.neighborhood ? ' - ' + host.neighborhood : ''}`,
          hostPhone: host.phone
        });

        // Extract turn-by-turn directions
        setDirectionSteps(leg.steps.map(step => ({
          instruction: step.instructions,
          distance: step.distance.text,
          duration: step.duration.text
        })));
        
        trackEvent('directions_calculated', {
          event_category: 'Directions',
          event_label: 'Route Displayed',
          host_name: host.name,
          distance: leg.distance.text,
          duration: leg.duration.text
        });
      } else {
        alert('Could not calculate driving directions. Please use the external map links instead.');
        trackEvent('directions_error', {
          event_category: 'Directions',
          event_label: 'Route Calculation Failed',
          host_name: host.name
        });
      }
    });
  };

  // Clear directions from map
  const clearDirections = () => {
    if (directionsRenderer) {
      directionsRenderer.setDirections({ routes: [] });
      setShowingDirections(null);
      setRouteInfo(null);
      setDirectionSteps(null);
    }
  };

  // Open Google Maps with directions
  const openGoogleMapsDirections = (host) => {
    trackEvent('open_google_maps', {
      event_category: 'External Navigation',
      event_label: 'Google Maps',
      host_name: host.name,
      host_area: host.area
    });
    
    if (userCoords) {
      const url = `https://www.google.com/maps/dir/${userCoords.lat},${userCoords.lng}/${host.lat},${host.lng}`;
      window.open(url, '_blank');
    } else {
      // Fallback to destination only
      const url = `https://www.google.com/maps/search/?api=1&query=${host.lat},${host.lng}`;
      window.open(url, '_blank');
    }
  };

  // Email directions
  const emailDirections = () => {
    if (!routeInfo || !directionSteps) return;

    trackEvent('email_directions', {
      event_category: 'Directions',
      event_label: 'Email Directions',
      host_name: routeInfo.hostName,
      distance: routeInfo.distance,
      duration: routeInfo.duration
    });

    const subject = encodeURIComponent(`Directions to ${routeInfo.hostName} - Sandwich Drop-Off`);

    // Create plain text directions
    let body = `Directions to ${routeInfo.hostName}\n`;
    body += `Location: ${routeInfo.hostAddress}\n`;
    body += `Phone: ${routeInfo.hostPhone}\n`;
    body += `\nTotal Distance: ${routeInfo.distance}\n`;
    body += `Estimated Time: ${routeInfo.duration}\n`;
    body += `\n--- Turn-by-Turn Directions ---\n\n`;

    directionSteps.forEach((step, index) => {
      // Strip HTML tags from instructions
      const plainText = step.instruction.replace(/<[^>]*>/g, '');
      body += `${index + 1}. ${plainText} (${step.distance})\n`;
    });

    body += `\nDrop-off Date: ${dropOffDate}\n`;
    body += `\nView on Google Maps: https://www.google.com/maps/dir/${userCoords.lat},${userCoords.lng}/${availableHosts.find(h => h.id === routeInfo.hostId).lat},${availableHosts.find(h => h.id === routeInfo.hostId).lng}`;

    const mailtoLink = `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Announcement Banner */}
        <div className="mb-6 p-6 rounded-2xl" style={{backgroundColor: '#FFF3CD', border: '3px solid #FBAD3F'}}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 text-3xl">
              ⚠️
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2" style={{color: '#A31C41'}}>
                Important: Hosts NOT Collecting This Week
              </h2>
              <p className="text-lg font-semibold mb-2" style={{color: '#236383'}}>
                The following hosts are <strong>NOT available</strong> for drop-offs this week:
              </p>
              <p className="text-lg font-bold" style={{color: '#A31C41'}}>
                Silke S.<br />
                Julie B.<br />
                Alison T.<br />
                Della F.<br />
                Kate D.

              </p>
              <p className="text-base mt-2" style={{color: '#007E8C'}}>
                <b>Availability for hosts may change until Monday, please check back Monday morning for official host availability for Wednesday 11/5.</b><br />
                Please choose a different host from the available list below.
              </p>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl premium-card-header p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight" style={{letterSpacing: '-0.02em'}}>
                Sandwich Drop-Off Locations
              </h1>
              <p className="text-2xl font-bold mb-2" style={{color: '#007E8C'}}>
                {dropOffDate}
              </p>
              <p className="text-lg font-semibold" style={{color: '#A31C41'}}>
                We only collect sandwiches on Wednesdays (some hosts may accept early Thursday AM drop-offs).
              </p>
            </div>
            <button
              onClick={() => {
                const password = prompt('Enter admin password:');
                if (password === 'sandwich2024') {  // Change this password
                  setShowAdmin(true);
                } else if (password !== null) {
                  alert('Incorrect password');
                }
              }}
              className="text-sm px-4 py-2 rounded-lg font-medium transition-all hover:shadow-md"
              style={{backgroundColor: '#A31C41', color: 'white'}}
              title="Admin: Manage hosts for next week"
            >
              🔧 Manage Hosts
            </button>
          </div>

          {/* Sign-in Reminder */}
          <div className="p-5 mb-6 rounded-xl" style={{background: 'linear-gradient(135deg, #FFF9E6 0%, #FFF4D6 100%)', border: '2px solid #FBAD3F', boxShadow: '0 2px 8px rgba(251, 173, 63, 0.15)'}}>
            <div className="flex items-start gap-3">
              <div className="text-2xl flex-shrink-0">📝</div>
              <div>
                <h3 className="text-lg font-bold mb-1" style={{color: '#A31C41'}}>
                  Don't Forget to Sign In!
                </h3>
                <p className="text-base font-medium" style={{color: '#236383'}}>
                  Please record your sandwich type, count, and contact info on the sign-in sheet at your host home.
                </p>
              </div>
            </div>
          </div>

          {/* Smart Search Section */}
          <div className="info-box p-6 mb-6">
            <label className="block text-xl font-semibold mb-3" style={{color: '#236383'}}>
              Search for Locations
            </label>
            <p className="text-base mb-3" style={{color: '#007E8C'}}>
              Enter an address to find nearest hosts, or search by name/area to filter the list
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <input
                type="text"
                placeholder="Enter address, ZIP code, host name, or area..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSmartSearch()}
                className="flex-1 px-5 py-4 premium-input rounded-xl text-base"
                disabled={geocoding}
              />
              <button
                onClick={handleSmartSearch}
                disabled={geocoding || !searchInput.trim()}
                className="btn-primary px-8 py-4 text-white rounded-xl font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <i className="lucide-search w-5 h-5 mr-2"></i>
                {geocoding ? 'Searching...' : 'Search'}
              </button>
            </div>
            <button
              onClick={getCurrentLocation}
              className="text-base font-medium hover:underline flex items-center transition-all"
              style={{color: '#007E8C'}}
            >
              <i className="lucide-locate w-5 h-5 mr-2"></i>
              Use my current location
            </button>
            {userAddress && userCoords && (
              <div className="mt-4 p-4 rounded-lg" style={{backgroundColor: 'rgba(71, 179, 203, 0.1)'}}>
                <p className="text-base font-medium" style={{color: '#236383'}}>
                  📍 Showing hosts near: <span className="font-semibold">{userAddress}</span>
                </p>
              </div>
            )}
            {nameSearch && !userCoords && (
              <div className="mt-4 p-4 rounded-lg" style={{backgroundColor: 'rgba(71, 179, 203, 0.1)'}}>
                <p className="text-base font-medium" style={{color: '#236383'}}>
                  🔍 Filtering by: <span className="font-semibold">{nameSearch}</span>
                  <button
                    onClick={() => { setNameSearch(''); setSearchInput(''); }}
                    className="ml-2 text-sm underline hover:no-underline"
                    style={{color: '#007E8C'}}
                  >
                    Clear
                  </button>
                </p>
              </div>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setViewMode('list');
                trackEvent('view_mode_change', {
                  event_category: 'View',
                  event_label: 'List View Selected'
                });
              }}
              className={`view-toggle-btn px-6 py-3 rounded-xl font-medium transition-all ${
                viewMode === 'list' || viewMode === 'proximity' ? 'active' : ''
              }`}
              style={{
                backgroundColor: viewMode === 'list' || viewMode === 'proximity' ? '#007E8C' : undefined,
                color: viewMode === 'list' || viewMode === 'proximity' ? 'white' : undefined
              }}
            >
              📋 List View
            </button>
            <button
              onClick={() => {
                setViewMode('map');
                trackEvent('view_mode_change', {
                  event_category: 'View',
                  event_label: 'Map View Selected'
                });
              }}
              className={`view-toggle-btn px-6 py-3 rounded-xl font-medium transition-all ${
                viewMode === 'map' ? 'active' : ''
              }`}
              style={{
                backgroundColor: viewMode === 'map' ? '#007E8C' : undefined,
                color: viewMode === 'map' ? 'white' : undefined
              }}
            >
              🗺️ Map View
            </button>
          </div>

        </div>

        {/* Map and/or List */}
        <div className={`grid grid-cols-1 ${viewMode === 'list' ? '' : 'lg:grid-cols-2 lg:items-start'} gap-6`}>
          {/* Map View */}
          {viewMode !== 'list' && (
            <div className="bg-white rounded-2xl premium-card overflow-hidden">
            <div className="p-6 border-b" style={{borderColor: 'rgba(71, 179, 203, 0.15)'}}>
              <h2 className="text-xl font-bold mb-3" style={{color: '#236383'}}>
                🗺️ Drop-Off Locations Map
              </h2>
              {userCoords ? (
                <>
                  <div className="flex flex-wrap gap-3 mb-3">
                    <span className="inline-flex items-center text-base font-medium" style={{color: '#236383'}}>
                      <span className="w-5 h-5 rounded-full mr-2 border-2 border-white shadow-sm" style={{backgroundColor: '#47B3CB'}}></span>
                      Your location
                    </span>
                    <span className="inline-flex items-center text-base font-medium" style={{color: '#236383'}}>
                      <span className="w-5 h-5 rounded-full mr-2 border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold" style={{backgroundColor: '#FBBF24', color: '#000'}}>1</span>
                      Closest
                    </span>
                    <span className="inline-flex items-center text-base font-medium" style={{color: '#236383'}}>
                      <span className="w-5 h-5 rounded-full mr-2 border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold" style={{backgroundColor: '#9CA3AF', color: '#000'}}>2</span>
                      2nd Closest
                    </span>
                    <span className="inline-flex items-center text-base font-medium" style={{color: '#236383'}}>
                      <span className="w-5 h-5 rounded-full mr-2 border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold" style={{backgroundColor: '#F59E0B', color: '#000'}}>3</span>
                      3rd Closest
                    </span>
                    <span className="inline-flex items-center text-base font-medium" style={{color: '#236383'}}>
                      <span className="w-5 h-5 rounded-full mr-2 border-2 border-white shadow-sm" style={{backgroundColor: '#A31C41'}}></span>
                      Other hosts
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-3" style={{color: '#007E8C'}}>
                    💡 Click any marker to see host details and get directions
                  </p>

                  {/* Toggle for showing all hosts on map */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const newValue = !showAllHostsOnMap;
                        setShowAllHostsOnMap(newValue);
                        trackEvent('map_hosts_toggle', {
                          event_category: 'Map',
                          event_label: newValue ? 'Show All Hosts' : 'Showing Closest 3'
                        });
                      }}
                      className="premium-badge px-4 py-2 rounded-xl font-semibold text-sm transition-all hover:shadow-md"
                      style={{
                        backgroundColor: showAllHostsOnMap ? '#007E8C' : 'white',
                        color: showAllHostsOnMap ? 'white' : '#007E8C',
                        border: `2px solid ${showAllHostsOnMap ? '#007E8C' : 'rgba(0, 126, 140, 0.3)'}`
                      }}
                    >
                      {showAllHostsOnMap ? `Showing All ${availableHosts.length} Hosts` : 'Show Closest 3 Hosts'}
                    </button>
                    <button
                      onClick={() => {
                        const newValue = !showAllHostsOnMap;
                        setShowAllHostsOnMap(newValue);
                        trackEvent('map_hosts_toggle', {
                          event_category: 'Map',
                          event_label: newValue ? 'Show All Hosts' : 'Show Closest 3'
                        });
                      }}
                      className="text-xs font-semibold hover:underline transition-all"
                      style={{color: '#007E8C'}}
                    >
                      {showAllHostsOnMap ? '← Show Only Closest 3' : 'Show All Hosts →'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap gap-3 mb-3">
                    <span className="inline-flex items-center text-base font-medium" style={{color: '#236383'}}>
                      <span className="w-5 h-5 rounded-full mr-2 border-2 border-white shadow-sm" style={{backgroundColor: '#007E8C'}}></span>
                      All Sandwich Drop-Off Locations
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-3" style={{color: '#007E8C'}}>
                    💡 Enter your address or use location to see distances and get directions
                  </p>
                </>
              )}

                {showingDirections && routeInfo && (
                  <div className="mt-3 p-4 rounded-lg" style={{backgroundColor: '#E6F7FF', borderColor: '#007E8C', border: '1px solid'}}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-medium" style={{color: '#007E8C'}}>
                        Route to {routeInfo.hostName}
                      </span>
                      <button
                        onClick={clearDirections}
                        className="text-sm px-3 py-2 rounded"
                        style={{backgroundColor: '#FBAD3F', color: 'white'}}
                      >
                        Clear Route
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm" style={{color: '#236383'}}>
                        <span className="font-medium">{routeInfo.duration}</span> • {routeInfo.distance}
                      </div>
                      <button
                        onClick={() => openGoogleMapsDirections(availableHosts.find(h => h.id === showingDirections))}
                        className="text-sm px-4 py-2 rounded flex items-center"
                        style={{backgroundColor: '#007E8C', color: 'white'}}
                      >
                        <i className="lucide-external-link w-4 h-4 mr-1"></i>
                        Open in Google Maps
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <div id="map" className="h-96 lg:h-[calc(100vh-400px)]"></div>
              </div>

              {/* Turn-by-Turn Directions */}
              {directionSteps && routeInfo && (
                <div className="border-t" style={{borderColor: 'rgba(71, 179, 203, 0.15)'}}>
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold" style={{color: '#236383'}}>
                        📍 Turn-by-Turn Directions
                      </h3>
                      <button
                        onClick={emailDirections}
                        className="text-sm px-4 py-2 rounded-lg font-medium text-white flex items-center"
                        style={{backgroundColor: '#007E8C'}}
                        title="Email these directions to yourself"
                      >
                        <i className="lucide-mail w-4 h-4 mr-1.5"></i>
                        Email Directions
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
                      {directionSteps.map((step, index) => (
                        <div key={index} className="flex gap-3 p-3 rounded-lg" style={{backgroundColor: 'rgba(71, 179, 203, 0.05)'}}>
                          <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white" style={{backgroundColor: '#007E8C'}}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div
                              className="text-sm font-medium mb-1"
                              style={{color: '#236383'}}
                              dangerouslySetInnerHTML={{__html: step.instruction}}
                            />
                            <div className="text-xs font-medium" style={{color: '#007E8C'}}>
                              {step.distance} • {step.duration}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

            {/* Host List */}
            {viewMode !== 'map' && (
              <div className="space-y-4 lg:max-h-[1400px] lg:overflow-y-auto">
            {userCoords && viewMode === 'proximity' && (
              <div className="distance-banner p-4 mb-2">
                <div className="flex items-center">
                  <i className="lucide-map-pin w-5 h-5 mr-2.5" style={{color: '#007E8C'}}></i>
                  <span className="text-base font-semibold" style={{color: '#236383'}}>
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
                  className={`bg-white rounded-2xl premium-card p-6 hover:shadow-md transition-shadow cursor-pointer ${
                    userCoords && viewMode === 'proximity' && index < 3
                      ? `top-host-card top-host-${index + 1}`
                      : ''
                  } ${highlightedHostId === host.id ? 'ring-4 ring-yellow-400' : ''}`}
                  onClick={() => {
                    setHighlightedHostId(host.id);
                    trackEvent('host_card_click', {
                      event_category: 'Host List',
                      event_label: 'Host Card Clicked',
                      host_name: host.name,
                      host_area: host.area
                    });
                    // Scroll map into view if on mobile
                    if (viewMode !== 'list' && window.innerWidth < 768) {
                      document.getElementById('map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                >
                  <div className="flex gap-5 items-start">
                    {/* Only show map thumbnail if map view is NOT active */}
                    {!userCoords && (
                      <div className="flex-shrink-0" style={{width: '85px'}}>
                        {GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY_HERE' ? (
                          <img
                            src={`https://maps.googleapis.com/maps/api/staticmap?center=${host.lat},${host.lng}&zoom=15&size=85x85&maptype=roadmap&markers=color:red%7C${host.lat},${host.lng}&key=${GOOGLE_MAPS_API_KEY}`}
                            alt={`Map of ${host.name}`}
                            className="rounded-lg border border-gray-200 shadow-sm"
                            style={{width: '85px', height: '85px', objectFit: 'cover'}}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="rounded-lg border border-gray-200 shadow-sm flex items-center justify-center"
                          style={{
                            width: '85px',
                            height: '85px',
                            backgroundColor: '#f8f9fa',
                            display: GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE' ? 'flex' : 'none'
                          }}
                        >
                          <div className="text-center text-xs" style={{color: '#236383'}}>
                            <i className="lucide-map-pin w-4 h-4 mx-auto mb-1"></i>
                            <div className="font-semibold text-xs">{host.area}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          {userCoords && viewMode === 'proximity' && index < 3 && (
                            <span className={`w-8 h-8 rank-badge rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                              index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                            }`}>
                              {index + 1}
                            </span>
                          )}
                          <h3 className="font-bold text-2xl whitespace-nowrap">{host.name}</h3>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {userCoords && (
                            <button
                              onClick={() => showingDirections === host.id ? clearDirections() : showDirections(host)}
                              className="btn-primary px-6 py-3 rounded-xl font-medium text-white text-sm flex items-center whitespace-nowrap"
                              style={{backgroundColor: showingDirections === host.id ? '#A31C41' : '#FBAD3F'}}
                              title={showingDirections === host.id ? 'Clear route from map' : 'Show route on the map'}
                            >
                              <i className="lucide-route w-4 h-4 mr-1.5"></i>
                              {showingDirections === host.id ? 'Clear Route' : 'Show Route on Map'}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedHost(host);
                              trackEvent('get_directions_click', {
                                event_category: 'Directions',
                                event_label: 'Get Directions Button',
                                host_name: host.name,
                                host_area: host.area
                              });
                            }}
                            className="btn-primary px-6 py-3 rounded-xl font-medium text-white text-sm flex items-center whitespace-nowrap"
                            style={{backgroundColor: '#007E8C'}}
                            title="Get directions to this host in Apple or Google Maps"
                          >
                            <i className="lucide-navigation w-4 h-4 mr-1.5"></i>
                            Get Directions
                          </button>
                        </div>
                      </div>

                      <p className="text-lg font-medium mb-4" style={{color: '#236383'}}>
                        📍 {host.area}{host.neighborhood ? ` - ${host.neighborhood}` : ''}
                      </p>

                      <div className="space-y-4 text-base">
                        <div className="info-box p-4">
                          <div className="flex items-start">
                            <i className="lucide-clock w-5 h-5 mr-2 mt-0.5" style={{color: '#007E8C'}}></i>
                            <div className="flex-1">
                              <div className="font-semibold mb-1" style={{color: '#236383'}}>Drop-off Hours</div>
                              <div className="font-medium mb-2" style={{color: '#007E8C'}}>{host.hours}</div>
                              {host.customDropoffDays && (
                                <div className="mb-2 p-2 rounded-lg" style={{backgroundColor: 'rgba(251, 173, 63, 0.1)', border: '1px solid #FBAD3F'}}>
                                  <div className="text-sm font-semibold" style={{color: '#A31C41'}}>
                                    ⭐ {host.customDropoffDays}
                                  </div>
                                </div>
                              )}
                              {/* Availability Status */}
                              {(() => {
                                const availability = getHostAvailability(host);
                                if (!availability) return null;
                                return (
                                  <div
                                    className="inline-block px-3 py-1 rounded-lg text-sm font-bold mt-1"
                                    style={{backgroundColor: availability.color, color: 'white'}}
                                  >
                                    {availability.message}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        <div className="info-box p-4">
                          <div className="flex items-center">
                            <i className="lucide-phone w-5 h-5 mr-2" style={{color: '#007E8C'}}></i>
                            <div>
                              <span className="font-semibold" style={{color: '#236383'}}>Contact: </span>
                              <a 
                                href={`tel:${host.phone.replace(/[^0-9]/g, '')}`} 
                                className="hover:underline font-semibold" 
                                style={{color: '#007E8C'}}
                                onClick={() => {
                                  trackEvent('call_host', {
                                    event_category: 'Contact',
                                    event_label: 'Phone Call',
                                    host_name: host.name,
                                    host_area: host.area
                                  });
                                }}
                              >
                                {host.phone}
                              </a>
                            </div>
                          </div>
                        </div>

                        {host.distance && (
                          <div className="info-box p-4">
                            <div className="flex items-center">
                              <i className="lucide-car w-5 h-5 mr-2" style={{color: '#007E8C'}}></i>
                              <div>
                                <span className="font-semibold" style={{color: '#236383'}}>Distance: </span>
                                <span className="font-medium" style={{color: '#007E8C'}}>{host.distance} miles</span>
                                {routeInfo && routeInfo.hostId === host.id && (
                                  <span className="font-medium" style={{color: '#007E8C'}}> • {routeInfo.duration}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                {host.notes && (
                  <div className="mt-4 warning-box p-4">
                    <div className="flex items-start">
                      <i className="lucide-alert-circle w-5 h-5 mr-3 flex-shrink-0 mt-0.5" style={{color: '#FBAD3F'}}></i>
                      <div>
                        <div className="font-bold mb-1.5 text-base" style={{color: '#A31C41'}}>⚠️ Special Instructions</div>
                        <div className="text-base font-medium" style={{color: '#236383'}}>{host.notes}</div>
                      </div>
                    </div>
                  </div>
                )}
                  </div>
                </div>
              </div>
              ))
            )}
              </div>
            )}
        </div>
        
        {/* Directions Modal */}
        {selectedHost && (
          <div className="modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedHost(null)}>
            <div className="modal-content bg-white rounded-2xl p-8 max-w-md w-full premium-card-header" onClick={e => e.stopPropagation()}>
              <h3 className="text-2xl font-bold mb-2" style={{color: '#236383'}}>{selectedHost.name}</h3>
              <p className="text-lg font-medium mb-2" style={{color: '#007E8C'}}>📍 {selectedHost.area}{selectedHost.neighborhood ? ` - ${selectedHost.neighborhood}` : ''}</p>
              {selectedHost.distance && (
                <div className="premium-badge px-4 py-2 mb-6 inline-block rounded-xl">
                  <p className="text-base font-semibold" style={{color: '#007E8C'}}>
                    <i className="lucide-map-pin w-5 h-5 mr-1.5 inline"></i>
                    {selectedHost.distance} miles away
                    {routeInfo && routeInfo.hostId === selectedHost.id && (
                      <span> • {routeInfo.duration} drive</span>
                    )}
                  </p>
                </div>
              )}
              <div className="space-y-3">
                <a
                  href={`https://maps.apple.com/?daddr=${selectedHost.lat},${selectedHost.lng}`}
                  className="btn-primary block w-full px-6 py-3.5 text-white rounded-xl font-semibold text-center transition-all"
                  style={{backgroundColor: '#007E8C'}}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    trackEvent('open_apple_maps', {
                      event_category: 'External Navigation',
                      event_label: 'Apple Maps',
                      host_name: selectedHost.name,
                      host_area: selectedHost.area
                    });
                  }}
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
                  onClick={() => {
                    const coords = `${selectedHost.lat}, ${selectedHost.lng}`;
                    trackEvent('copy_coordinates', {
                      event_category: 'Directions',
                      event_label: 'Copy Coordinates',
                      host_name: selectedHost.name,
                      host_area: selectedHost.area
                    });
                    navigator.clipboard.writeText(coords).then(() => {
                      alert(`Coordinates copied to clipboard:\n${coords}`);
                    }).catch(() => {
                      alert(`Coordinates:\n${coords}`);
                    });
                  }}
                  className="btn-primary block w-full px-6 py-3.5 text-white rounded-xl font-semibold text-center transition-all"
                  style={{backgroundColor: '#FBAD3F'}}
                >
                  📋 Copy Coordinates
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

        {/* Resources Section - Moved to bottom for better UX */}
        <div className="max-w-4xl mx-auto mt-8 px-4">
          <div className="info-box p-5 mb-6" style={{background: 'linear-gradient(135deg, rgba(251, 173, 63, 0.05) 0%, rgba(35, 99, 131, 0.05) 100%)', border: '2px solid rgba(251, 173, 63, 0.3)'}}>
            <h3 className="text-xl font-bold mb-2" style={{color: '#236383'}}>
              📚 Sandwich Making Resources
            </h3>
            <p className="text-base mb-3" style={{color: '#007E8C'}}>
              Everything you need to make safe, delicious sandwiches for our community
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <a
                href="https://images.squarespace-cdn.com/content/644c1a7612e58c4d658841f5/65728819-6fb4-49af-a3ac-c98e11e3ac07/20240622-TSP-Deli+Sandwich+Making+101.png?content-type=image%2Fpng"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-lg hover:shadow-lg transition-all"
                style={{backgroundColor: 'white', border: '1.5px solid #e0e0e0'}}
                onClick={() => trackEvent('resource_click', {event_category: 'Resources', event_label: 'Deli Sandwich Guide'})}
              >
                <div className="text-2xl">🥪</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-base" style={{color: '#236383'}}>Deli Sandwich Making 101</div>
                  <div className="text-sm" style={{color: '#666'}}>Step-by-step guide</div>
                </div>
              </a>
              <a
                href="https://images.squarespace-cdn.com/content/644c1a7612e58c4d658841f5/145e50cb-547e-4f35-b703-e69c39d6d309/20250622-TSP-PBJ+Sandwich+Making+101.png?content-type=image%2Fpng"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-lg hover:shadow-lg transition-all"
                style={{backgroundColor: 'white', border: '1.5px solid #e0e0e0'}}
                onClick={() => trackEvent('resource_click', {event_category: 'Resources', event_label: 'PBJ Sandwich Guide'})}
              >
                <div className="text-2xl">🥜</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-base" style={{color: '#236383'}}>PB&J Sandwich Making 101</div>
                  <div className="text-sm" style={{color: '#666'}}>Quick & easy instructions</div>
                </div>
              </a>
              <a
                href="https://static1.squarespace.com/static/644c1a7612e58c4d658841f5/t/689e37912777ae317d08033a/1755199378103/20250205-TSP-Food%2BSafety%2BVolunteers.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-lg hover:shadow-lg transition-all"
                style={{backgroundColor: 'white', border: '1.5px solid #e0e0e0'}}
                onClick={() => trackEvent('resource_click', {event_category: 'Resources', event_label: 'Food Safety Guidelines'})}
              >
                <div className="text-2xl">🧼</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-base" style={{color: '#236383'}}>Food Safety Guidelines</div>
                  <div className="text-sm" style={{color: '#666'}}>Keep everyone safe & healthy</div>
                </div>
              </a>
              <a
                href="https://nicunursekatie.github.io/sandwichinventory/inventorycalculator.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-lg hover:shadow-lg transition-all"
                style={{backgroundColor: 'white', border: '1.5px solid #e0e0e0'}}
                onClick={() => trackEvent('resource_click', {event_category: 'Resources', event_label: 'Shopping Planner'})}
              >
                <div className="text-2xl">🛒</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-base" style={{color: '#236383'}}>Shopping Planner Tool</div>
                  <div className="text-sm" style={{color: '#666'}}>Budget & plan your supplies</div>
                </div>
              </a>
            </div>
          </div>
        </div>

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
                  <h3 className="font-semibold mb-3" style={{color: '#236383'}}>📁 Backup & Deploy</h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={exportHosts}
                      className="px-4 py-2 rounded-lg font-medium text-white"
                      style={{backgroundColor: '#007E8C'}}
                    >
                      📤 Export JSON
                    </button>
                    <label className="px-4 py-2 rounded-lg font-medium text-white cursor-pointer" style={{backgroundColor: '#FBAD3F'}}>
                      📥 Import JSON
                      <input
                        type="file"
                        accept=".json"
                        onChange={importHosts}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={copyAsCode}
                      className="px-4 py-2 rounded-lg font-medium text-white"
                      style={{backgroundColor: '#A31C41'}}
                      title="Copy as code to paste into app.js"
                    >
                      📋 Copy as Code
                    </button>
                  </div>
                  <p className="text-xs mt-2" style={{color: '#236383'}}>
                    Use "Copy as Code" to update the default host data in app.js
                  </p>
                </div>

                {/* Add New Host Button */}
                <div className="mb-6">
                  <button
                    onClick={() => setEditingHost({ id: 'new', name: '', area: '', neighborhood: '', lat: '', lng: '', phone: '', hours: '', openTime: '08:00', closeTime: '20:00', notes: '', available: true })}
                    className="px-6 py-3 rounded-xl font-semibold text-white"
                    style={{backgroundColor: '#007E8C'}}
                  >
                    ➕ Add New Host
                  </button>
                </div>

                {/* Hosts List */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg mb-3" style={{color: '#236383'}}>All Hosts ({(allHosts || []).length})</h3>
                  {(allHosts || []).map(host => (
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
                            <p><strong>Area:</strong> {host.area}{host.neighborhood ? ` - ${host.neighborhood}` : ''}</p>
                            <p><strong>Phone:</strong> {host.phone}</p>
                            <p><strong>Hours:</strong> {host.hours}</p>
                            <p><strong>Location:</strong> {host.lat}, {host.lng}</p>
                            {host.notes && <p><strong>Notes:</strong> {host.notes}</p>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleHostAvailability(host.id)}
                            className="px-3 py-2 rounded-lg text-sm font-medium text-white"
                            style={{
                              backgroundColor: host.available ? '#FBAD3F' : '#007E8C'
                            }}
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
            <div className="modal-content bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto premium-card-header" onClick={e => e.stopPropagation()}>
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
                    neighborhood: formData.get('neighborhood'),
                    lat: formData.get('lat'),
                    lng: formData.get('lng'),
                    phone: formData.get('phone'),
                    hours: formData.get('hours'),
                    openTime: formData.get('openTime'),
                    closeTime: formData.get('closeTime'),
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
                      <label className="block font-semibold mb-2" style={{color: '#236383'}}>Area</label>
                      <input
                        type="text"
                        name="area"
                        defaultValue={editingHost.area}
                        required
                        className="w-full px-4 py-3 premium-input rounded-xl"
                        placeholder="e.g., Alpharetta"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-2" style={{color: '#236383'}}>Neighborhood (optional)</label>
                      <input
                        type="text"
                        name="neighborhood"
                        defaultValue={editingHost.neighborhood}
                        className="w-full px-4 py-3 premium-input rounded-xl"
                        placeholder="e.g., Glenn Abbey"
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
                      <label className="block font-semibold mb-2" style={{color: '#236383'}}>Drop-off Hours (Display Text)</label>
                      <input
                        type="text"
                        name="hours"
                        defaultValue={editingHost.hours}
                        required
                        className="w-full px-4 py-3 premium-input rounded-xl"
                        placeholder="8 am to 8 pm"
                      />
                      <p className="text-sm mt-1" style={{color: '#007E8C'}}>This is shown to users as-is</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold mb-2" style={{color: '#236383'}}>Wednesday Open Time</label>
                        <input
                          type="time"
                          name="openTime"
                          defaultValue={editingHost.openTime}
                          required
                          className="w-full px-4 py-3 premium-input rounded-xl"
                          placeholder="08:00"
                        />
                        <p className="text-xs mt-1" style={{color: '#007E8C'}}>24-hour format</p>
                      </div>
                      <div>
                        <label className="block font-semibold mb-2" style={{color: '#236383'}}>Wednesday Close Time</label>
                        <input
                          type="time"
                          name="closeTime"
                          defaultValue={editingHost.closeTime}
                          required
                          className="w-full px-4 py-3 premium-input rounded-xl"
                          placeholder="20:00"
                        />
                        <p className="text-xs mt-1" style={{color: '#007E8C'}}>24-hour format</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold mb-2" style={{color: '#236383'}}>Thursday Open Time (optional)</label>
                        <input
                          type="time"
                          name="thursdayOpenTime"
                          defaultValue={editingHost.thursdayOpenTime}
                          className="w-full px-4 py-3 premium-input rounded-xl"
                          placeholder="08:00"
                        />
                        <p className="text-xs mt-1" style={{color: '#007E8C'}}>For hosts accepting Thursday drop-offs</p>
                      </div>
                      <div>
                        <label className="block font-semibold mb-2" style={{color: '#236383'}}>Thursday Close Time (optional)</label>
                        <input
                          type="time"
                          name="thursdayCloseTime"
                          defaultValue={editingHost.thursdayCloseTime}
                          className="w-full px-4 py-3 premium-input rounded-xl"
                          placeholder="09:30"
                        />
                        <p className="text-xs mt-1" style={{color: '#007E8C'}}>Leave blank if not available Thursday</p>
                      </div>
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