const HostAvailabilityApp = () => {
  const [userAddress, setUserAddress] = React.useState('');
  const [searchInput, setSearchInput] = React.useState('');
  const [nameSearch, setNameSearch] = React.useState('');
  const [userCoords, setUserCoords] = React.useState(null);
  const [viewMode, setViewMode] = React.useState('proximity');
  const [filterArea, setFilterArea] = React.useState('all');
  const [mapTooltip, setMapTooltip] = React.useState(null);
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
  const [directionsMenuOpen, setDirectionsMenuOpen] = React.useState(null);
  const [directionsMenuPosition, setDirectionsMenuPosition] = React.useState({ top: 0, left: 0 });
  const [mapTooltipMenuOpen, setMapTooltipMenuOpen] = React.useState(false);
  const [initialMapCenter, setInitialMapCenter] = React.useState(null);
  const [initialMapZoom, setInitialMapZoom] = React.useState(null);
  const [hostDriveTimes, setHostDriveTimes] = React.useState({});
  const [showFeedback, setShowFeedback] = React.useState(false);
  const [feedbackRating, setFeedbackRating] = React.useState(0);
  const [feedbackText, setFeedbackText] = React.useState('');
  const [feedbackEmail, setFeedbackEmail] = React.useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = React.useState(false);
  const directionsButtonRef = React.useRef(null);
  const hostIdsRef = React.useRef('');
  const markersRef = React.useRef({});

  // Google Tag Manager tracking helper
  const trackEvent = (eventName, eventParams = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...eventParams
    });
  };

  // Close directions menu when clicking outside and update position on scroll/resize
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (directionsMenuOpen !== null) {
        // Check if click is on the button or inside the portal dropdown
        const menuContainer = event.target.closest('[data-directions-menu]');
        const portalDropdown = event.target.closest('.fixed.bg-white.rounded-lg.shadow-xl');
        if (!menuContainer && !portalDropdown) {
          setDirectionsMenuOpen(null);
        }
      }
      if (mapTooltipMenuOpen) {
        const menuContainer = event.target.closest('[data-map-tooltip-menu]');
        if (!menuContainer) {
          setMapTooltipMenuOpen(false);
        }
      }
    };

    const updateMenuPosition = () => {
      if (directionsMenuOpen !== null && directionsButtonRef.current) {
        const buttonRect = directionsButtonRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const dropdownWidth = 280; // min-width
        const dropdownHeight = 200; // approximate height
        
        let left = buttonRect.left;
        let top = buttonRect.bottom + 4;
        
        // Ensure dropdown doesn't go off right edge
        if (left + dropdownWidth > viewportWidth - 16) {
          left = viewportWidth - dropdownWidth - 16;
        }
        // Ensure dropdown doesn't go off left edge
        if (left < 16) {
          left = 16;
        }
        // If dropdown would go off bottom, show above button instead
        if (top + dropdownHeight > viewportHeight - 16) {
          top = buttonRect.top - dropdownHeight - 4;
        }
        // Ensure dropdown doesn't go off top edge
        if (top < 16) {
          top = 16;
        }
        
        setDirectionsMenuPosition({ top, left });
      }
    };
    
    if (directionsMenuOpen !== null || mapTooltipMenuOpen) {
      // Use setTimeout to avoid immediate closure when opening
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        // Update position on scroll/resize for mobile
        window.addEventListener('scroll', updateMenuPosition, true);
        window.addEventListener('resize', updateMenuPosition);
      }, 0);
      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
        window.removeEventListener('scroll', updateMenuPosition, true);
        window.removeEventListener('resize', updateMenuPosition);
      };
    }
  }, [directionsMenuOpen, mapTooltipMenuOpen]);

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

  const helperRefs = window.AppHelpers || {};
  const getNextWednesday = helperRefs.getNextWednesday || (() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 3 = Wednesday
    const daysUntilWednesday = (3 - dayOfWeek + 7) % 7;
    const nextWednesday = new Date(today);
    nextWednesday.setDate(today.getDate() + daysUntilWednesday);
    return nextWednesday;
  });
  const formatTime = helperRefs.formatTime || ((time24) => {
    if (!time24 || typeof time24 !== 'string') return '';
    const [hours, minutes = '00'] = time24.split(':');
    const hour = parseInt(hours, 10);
    if (Number.isNaN(hour)) return time24;
    const ampm = hour >= 12 ? 'pm' : 'am';
    const hour12 = hour % 12 || 12;
    return minutes === '00' ? `${hour12}${ampm}` : `${hour12}:${minutes}${ampm}`;
  });
  const getDateWithTime = helperRefs.getDateWithTime || ((baseDate, timeString) => {
    const date = new Date(baseDate);
    if (!timeString) {
      date.setHours(9, 0, 0, 0);
      return date;
    }
    const [hoursRaw, minutesRaw] = timeString.split(':');
    const hours = parseInt(hoursRaw, 10);
    const minutes = parseInt(minutesRaw ?? '0', 10);
    date.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0, 0, 0);
    return date;
  });
  const formatDateForICS = helperRefs.formatDateForICS || ((date) => {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  });
  const formatDateForICSUtc = helperRefs.formatDateForICSUtc || ((date) => {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
  });
  const escapeICSValue = helperRefs.escapeICSValue || ((value = '') =>
    String(value)
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;')
  );
  const buildCalendarEvent = helperRefs.buildCalendarEvent;

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

  // Initialize hosts from Firestore
  const [allHosts, setAllHosts] = React.useState([]);
  const [hostsLoading, setHostsLoading] = React.useState(true);

  // Load hosts from Firestore on mount
  React.useEffect(() => {
    const loadHosts = async () => {
      try {
        const snapshot = await db.collection('hosts').get();
        const hostsData = [];
        snapshot.forEach(doc => {
          hostsData.push({ ...doc.data(), id: doc.data().id });
        });
        // Sort by ID
        hostsData.sort((a, b) => a.id - b.id);
        setAllHosts(hostsData);
        setHostsLoading(false);
      } catch (error) {
        console.error('Error loading hosts:', error);
        setHostsLoading(false);
      }
    };

    loadHosts();
  }, []);

  // Legacy code - keep structure but don't use
  const getInitialHosts = () => {
    // This function is no longer used - hosts come from Firestore
    const defaultHosts = [
      { id: 1, name: 'Karen C.', area: 'Johns Creek', neighborhood: 'Glenn Abbey', lat: 34.0562454, lng: -84.2510305, phone: '404.451.7942', hours: '8 am to 8 pm', openTime: '08:00', closeTime: '20:00', notes: '', available: true },
      { id: 2, name: 'Nancy M.', area: 'Johns Creek', neighborhood: 'Chartwell', lat: 34.0190365, lng: -84.27345269999999, phone: '678.575.6898', hours: '8 am to 8 pm', openTime: '08:00', closeTime: '20:00', notes: '', available: true },
      { id: 3, name: 'Julie B.', area: 'Buckhead', lat: 33.8543082, lng: -84.3709417, phone: '404.808.2560', hours: '8 am to 8 pm', openTime: '08:00', closeTime: '20:00', notes: 'Please pull up driveway in back. Refrigerator in garage.', available: true },
      { id: 4, name: 'Kate D.', area: 'Chastain Park', lat: 33.8804237, lng: -84.4067199, phone: '404.271.4352', hours: '9 am to 5 pm', openTime: '09:00', closeTime: '17:00', notes: 'Please text prior to delivering to make sure host is available to receive sandwiches.', available: true },
      { id: 5, name: 'Jordan H.', area: 'Chamblee/Brookhaven', neighborhood: 'Sexton Woods near Keswick Park', lat: 33.8981194, lng: -84.31290740000001, phone: '770.789.7329', hours: '9 am to 5 pm', openTime: '09:00', closeTime: '17:00', notes: 'Please text when you arrive and /or ring doorbell.', available: true },
      { id: 6, name: 'Veronica P.', area: 'Dacula', lat: 33.97561, lng: -83.883747, phone: '470.509.5333', hours: '8 am to 7 pm', openTime: '08:00', closeTime: '19:00', notes: '', available: true },
      { id: 7, name: 'Lisa H.', area: 'Dunwoody', neighborhood: 'Brooke Farm', lat: 33.952725, lng: -84.290274, phone: '770.826.0457', hours: 'Wed 4-9pm, Thu 8-9:30am', openTime: '16:00', closeTime: '21:00', thursdayOpenTime: '08:00', thursdayCloseTime: '09:30', notes: '', available: true },
      { id: 8, name: 'Marcy L. & Stephanie', area: 'Dunwoody', neighborhood: 'Near Dunwoody Village', lat: 33.9463163, lng: -84.327786, phone: '678.596.9697', hours: '8 am to 8 pm', openTime: '08:00', closeTime: '20:00', notes: 'Sign in sheet and labels on front porch', available: true },
      { id: 9, name: 'Darren W.', area: 'Dunwoody', neighborhood: 'Dunwoody Club Forest', lat: 33.96450859999999, lng: -84.3151065, phone: '770.490.6206', hours: '8 am to 8 pm', openTime: '08:00', closeTime: '20:00', notes: '', available: true },
      { id: 10, name: 'Silke S.', area: 'East Cobb', lat: 34.0159666, lng: -84.44707, phone: '404.375.9541', hours: '9 am to 7 pm', openTime: '09:00', closeTime: '19:00', notes: 'Text once delivered', available: true },
      { id: 12, name: 'Vicki T.', area: 'East Cobb', neighborhood: 'East Hampton by The Avenues', lat: 34.0003401, lng: -84.417205, phone: '404.202.9108', hours: '9 am to 6:30 pm', openTime: '09:00', closeTime: '18:30', notes: 'Drop off in garage (fridge & sign in there).  Text Vicki once delivered', available: true },
      { id: 13, name: 'Rebecca H.', area: 'East Atlanta', neighborhood: 'Near Burgess Elementary School', lat: 33.753746, lng: -84.386330, phone: '847.687.9143', hours: '10 am to 6 pm', openTime: '10:00', closeTime: '18:00', notes: 'Text Rebecca once delivered', available: true },
      { id: 14, name: 'Sarah P.', area: 'Milton', neighborhood: 'Woodwinds at New Providence', lat: 34.116782, lng: -84.354432, phone: '816.308.2273', hours: '9 am to 8 pm', openTime: '09:00', closeTime: '20:00', notes: 'Text Sarah after drop-off', available: true },
      { id: 15, name: 'Laura B.', area: 'Oak Grove/Druid Hills', neighborhood: 'Sagamore Hills/Oak Grove', lat: 33.84245629999999, lng: -84.3039661, phone: '404.931.8774', hours: '8 am to 7 pm', openTime: '08:00', closeTime: '19:00', notes: '', available: true },
      { id: 16, name: 'Tracie N.', area: 'Peachtree Corners', neighborhood: 'Peachtree Station', lat: 33.9784128, lng: -84.23600920000001, phone: '770.315.9177', hours: '2 pm to 8 pm', openTime: '14:00', closeTime: '20:00', notes: '', available: true },
      { id: 17, name: 'Suzanna T.', area: 'Peachtree Corners', neighborhood: 'Amberfield', lat: 33.9815238, lng: -84.2278384, phone: '770.403.4821', hours: '2:30 pm to 8 pm', openTime: '14:30', closeTime: '20:00', notes: '', available: true },
      { id: 18, name: 'Renee V.', area: 'Peachtree Corners', neighborhood: 'Neely Farm', lat: 33.9837379, lng: -84.2589718, phone: '770.265.3563', hours: '2 pm to 8 pm', openTime: '14:00', closeTime: '20:00', notes: '', available: true },
      { id: 19, name: 'Carrey H.', area: 'Roswell', neighborhood: 'Willow Springs/Country Club of Roswell', lat: 34.0320203, lng: -84.2835501, phone: '314.363.2982', hours: '9 am to 7 pm', openTime: '09:00', closeTime: '19:00', notes: '', available: false },
      { id: 20, name: 'Jenny V.W.', area: 'Roswell', neighborhood: 'Lakeside at Ansley', lat: 34.0864211, lng: -84.4086078, phone: '703.403.0711', hours: '8 am to 6 pm', openTime: '08:00', closeTime: '18:00', notes: 'Tell the gatehouse guard you are going to Walter\'s home. Text Jenny when you arrive.', available: false },
      { id: 21, name: 'Jen C.', area: 'Sandy Springs', neighborhood: 'Riverside (off River Valley)', lat: 33.9311095, lng: -84.4050578, phone: '404.918.9933', hours: '8 am to 6 pm', openTime: '08:00', closeTime: '18:00', notes: '', available: true },
      { id: 22, name: 'Sarah K.', area: 'Sandy Springs', neighborhood: 'North Springs', lat: 33.9529678, lng: -84.3758284, phone: '404.455.6743', hours: '9 am to 5 pm', openTime: '09:00', closeTime: '17:00', notes: '', available: true },
      { id: 23, name: 'Allison T.', area: 'Sandy Springs', neighborhood: 'Declaire (just a smidge outside Perimeter)', lat: 33.91549, lng: -84.3968077, phone: '770.355.8876', hours: '9:30 am to 7 pm', openTime: '09:30', closeTime: '19:00', notes: '', available: false },
      { id: 24, name: 'Cynthia C.', area: 'Southwest Atlanta', neighborhood: 'Cascade Hills Subdivision ', lat: 33.7286854, lng: -84.5622846, phone: '678.860.6442', hours: '8 am to 7 pm', openTime: '08:00', closeTime: '19:00', notes: '', available: true },
      { id: 25, name: 'Jason S.', area: 'Suwanee/Johns Creek', neighborhood: 'Superior Play Systems', lat: 34.065908, lng: -84.160894, phone: '678.245.2110', hours: '7 am to 6 pm', openTime: '07:00', closeTime: '18:00', notes: '', available: true },
      { id: 26, name: 'Stacey & Jack G.', area: 'Virginia Highland', neighborhood: 'Virginia Highland/Morningside/Midtown HS', lat: 33.77723595, lng: -84.362274174978, phone: '404.451.7648', hours: '6pm-8pm', openTime: '18:00', closeTime: '20:00', notes: '', available: false },
      { id: 27, name: 'Della F.', area: 'Westminster/Milmar Neighborhood', lat: 33.83844, lng: -84.42356, phone: '404.556.0277', hours: '8 am to 7 pm', openTime: '08:00', closeTime: '19:00', notes: 'Text Della when you arrive. Garage door will be open. Leave sandwiches in the refrigerator.', available: true },
      { id: 28, name: 'Rayna N.', area: 'College Park', lat: 33.63388, lng: -84.53605, phone: '404.376.8028 ', hours: '8 am to 7 pm', openTime: '08:00', closeTime: '19:00', notes: 'Please text when you arrive. ', available: true },
      { id: 29, name: 'Ashley R.', area: 'Decatur', neighborhood: 'Diamond Head', lat: 33.82314, lng: -84.27547, phone: '678.480.8786', hours: '8 am to 8 pm', openTime: '08:00', closeTime: '20:00', notes: 'Deliver to fridge in carport', available: true },
      { id: 30, name: 'Judy T.', area: 'East Cobb', neighborhood: 'Indian Hills', lat: 33.967939, lng: -84.43849, phone: '404-683-5823', hours: '9 am to 6 pm', openTime: '09:00', closeTime: '18:00', notes: 'Ring doorbell', available: true },
      { id: 31, name: 'Kristina M.', area: 'Flowery Branch', neighborhood: 'Sterling on the Lake', lat: 34.1490957945782, lng: -83.8990866162653, phone: '678.372.7959', hours: '9 am to 5 pm', openTime: '09:00', closeTime: '17:00', notes: 'Drop off in clubhouse', available: true },
      { id: 32, name: 'Angie B.', area: 'Intown (Candler Park)', neighborhood: 'Candler Park', lat: 33.7633147, lng: -84.3440672755145, phone: '404.668.6886', hours: '8 am to 6 pm', openTime: '08:00', closeTime: '18:00', notes: '', available: true },
      { id: 33, name: 'Chet B.', area: 'Roswell', neighborhood: 'Horseshoe Bend', lat: 33.99208265, lng: -84.2910639180384, phone: '386.290.8930‬', hours: '9 am to 6 pm', openTime: '09:00', closeTime: '18:00', notes: '', available: true }
    ];
    
    // Return all hosts (including inactive) so admin management is possible after a version update
    return defaultHosts;
  };

  // Admin functions - now save to Firestore
  const addHost = async (hostData) => {
    const newHost = {
      ...hostData,
      id: Math.max(...(allHosts || []).map(h => h.id)) + 1,
      lat: parseFloat(hostData.lat),
      lng: parseFloat(hostData.lng)
    };

    try {
      await db.collection('hosts').doc(String(newHost.id)).set(newHost);
      setAllHosts([...(allHosts || []), newHost]);
    } catch (error) {
      console.error('Error adding host:', error);
      alert('Error adding host. Please try again.');
    }
  };

  const updateHost = async (hostId, hostData) => {
    const updatedHost = { ...hostData, id: hostId, lat: parseFloat(hostData.lat), lng: parseFloat(hostData.lng) };

    try {
      await db.collection('hosts').doc(String(hostId)).set(updatedHost);
      setAllHosts((allHosts || []).map(host =>
        host.id === hostId ? updatedHost : host
      ));
    } catch (error) {
      console.error('Error updating host:', error);
      alert('Error updating host. Please try again.');
    }
  };

  const deleteHost = async (hostId) => {
    try {
      await db.collection('hosts').doc(String(hostId)).delete();
      setAllHosts((allHosts || []).filter(host => host.id !== hostId));
    } catch (error) {
      console.error('Error deleting host:', error);
      alert('Error deleting host. Please try again.');
    }
  };

  const toggleHostAvailability = async (hostId) => {
    const host = allHosts.find(h => h.id === hostId);
    if (!host) return;

    const updatedHost = { ...host, available: !host.available };

    try {
      await db.collection('hosts').doc(String(hostId)).set(updatedHost);
      setAllHosts((allHosts || []).map(h =>
        h.id === hostId ? updatedHost : h
      ));
    } catch (error) {
      console.error('Error toggling host availability:', error);
      alert('Error updating host availability. Please try again.');
    }
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

  const CALENDAR_TIMEZONE = 'America/New_York';

  const handleAddToCalendar = (host) => {
    let event;

    if (typeof buildCalendarEvent === 'function') {
      event = buildCalendarEvent(host, {
        baseDate: nextWednesday,
        timezone: CALENDAR_TIMEZONE
      });
    } else {
      const eventStart = getDateWithTime(nextWednesday, host.openTime);
      let eventEnd = host.closeTime
        ? getDateWithTime(nextWednesday, host.closeTime)
        : new Date(eventStart.getTime() + 60 * 60 * 1000);

      if (eventEnd <= eventStart) {
        eventEnd = new Date(eventStart.getTime() + 30 * 60 * 1000);
      }

      const summary = `Sandwich Drop-Off: ${host.name}`;
      const descriptionParts = [
        `Area: ${host.area}`,
        host.neighborhood ? `Neighborhood: ${host.neighborhood}` : null,
        host.notes ? `Notes: ${host.notes}` : null,
        `Drop-off hours: ${host.hours || formatTime(host.openTime)}`
      ].filter(Boolean);
      const description = descriptionParts.join('\n');
      const location = host.neighborhood
        ? `${host.neighborhood}, ${host.area}`
        : host.area;

      const icsLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//The Sandwich Project//Host Availability//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${host.id}-${formatDateForICS(eventStart)}@sandwichproject.org`,
        `DTSTAMP:${formatDateForICSUtc(new Date())}`,
        `DTSTART;TZID=${CALENDAR_TIMEZONE}:${formatDateForICS(eventStart)}`,
        `DTEND;TZID=${CALENDAR_TIMEZONE}:${formatDateForICS(eventEnd)}`,
        `SUMMARY:${escapeICSValue(summary)}`,
        `DESCRIPTION:${escapeICSValue(description)}`,
        `LOCATION:${escapeICSValue(location)}`,
        'END:VEVENT',
        'END:VCALENDAR'
      ];

      event = {
        summary,
        icsContent: icsLines.join('\r\n'),
        fileName: `${summary.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')}.ics`
      };
    }

    const blob = new Blob([event.icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = event.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    trackEvent('add_to_calendar', {
      event_category: 'Calendar',
      event_label: 'Add to Calendar',
      host_name: host.name,
      host_area: host.area
    });
  };
  
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

    // Prioritize name/area matching - if input matches a host, use name search first
    if (matchingHosts.length > 0) {
      setNameSearch(input);
      setUserCoords(null);
      setUserAddress('');
      setViewMode('list');
      
      trackEvent('search_by_name', {
        event_category: 'Search',
        event_label: 'Name/Area Filter',
        search_term: input
      });
      return; // Exit early - don't try geocoding if we found a name match
    }

    // Heuristics to detect if it's likely an address:
    // - Contains numbers (street address or ZIP)
    // - Contains common address keywords
    // - Is a 5-digit ZIP code
    const hasNumbers = /\d/.test(input);
    const isZipCode = /^\d{5}$/.test(input);
    const hasAddressKeywords = /\b(street|st|road|rd|drive|dr|avenue|ave|lane|ln|way|court|ct|circle|blvd|boulevard|parkway|pkwy)\b/i.test(input);

    const looksLikeAddress = isZipCode || hasNumbers || hasAddressKeywords;

    // If it looks like an address, try geocoding
    if (looksLikeAddress) {
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
      }
      // If geocoding fails and no matches, user will see "No hosts found"
    } else {
      // Doesn't look like address and no name match - try geocoding anyway as fallback
      const success = await geocodeAddress(input);
      if (success) {
        setUserAddress(input);
        setNameSearch('');
        setViewMode('proximity');
        
        trackEvent('search_by_address', {
          event_category: 'Search',
          event_label: 'Address Geocoded (Fallback)',
          search_term: input
        });
      }
      // If geocoding fails, user will see "No hosts found"
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

    // Store initial map state for reset
    setInitialMapCenter(mapCenter);
    setInitialMapZoom(mapZoom);

    if (!window.google || !window.google.maps) {
      console.error('Google Maps API not loaded');
      return;
    }

    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('Map element not found');
      return;
    }

    const mapInstance = new window.google.maps.Map(mapElement, {
      center: mapCenter,
      zoom: mapZoom,
      mapId: 'SANDWICH_DROP_OFF_MAP'
    });

    // Store initial values in closure for reset functionality
    const savedMapCenter = mapCenter;
    const savedMapZoom = mapZoom;

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

      // Add click listener to show tooltip
      marker.addListener('click', (e) => {
        setMapTooltip(host);
        setHighlightedHostId(host.id);

        // Zoom in and center on the clicked marker
        mapInstance.setZoom(14);
        mapInstance.panTo({ lat: host.lat, lng: host.lng });

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

    // Close tooltip and reset map view when clicking on the map (not on a marker)
    mapInstance.addListener('click', () => {
      setMapTooltip(null);
      setHighlightedHostId(null);
      setMapTooltipMenuOpen(false);
      // Reset map to initial view
      mapInstance.setCenter(savedMapCenter);
      mapInstance.setZoom(savedMapZoom);
    });

    setMap(mapInstance);
  }, [userCoords, availableHosts, map, showAllHostsOnMap]);

  // Load Google Maps API on component mount
  React.useEffect(() => {
    if (mapLoaded) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker,geometry&loading=async`;
    script.async = true;
    script.defer = true;
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
    if (viewMode === 'list') {
      // When switching to list-only view, clear the map to allow re-initialization later
      setMap(null);
    } else if (mapLoaded) {
      // Check if map element exists in DOM before initializing
      const mapElement = document.getElementById('map');
      if (mapElement && !map) {
        // Small delay to ensure DOM element is fully ready
        setTimeout(initializeMap, 100);
      }
    }
  }, [mapLoaded, userCoords, viewMode, initializeMap, map]);

  // Memoize host IDs string to prevent unnecessary recalculations
  const hostIdsString = React.useMemo(() => {
    return availableHosts.map(h => h.id).sort().join(',');
  }, [availableHosts]);

  // Calculate drive times for all hosts when user enters address
  React.useEffect(() => {
    // Early return if conditions aren't met
    if (!userCoords || !directionsService || !availableHosts.length || !window.google || !window.google.maps) {
      return;
    }

    // Skip if we already calculated for these hosts
    if (hostIdsRef.current === hostIdsString) {
      return;
    }

    hostIdsRef.current = hostIdsString;

    const origin = { lat: userCoords.lat, lng: userCoords.lng };
    let completedRequests = 0;
    const totalRequests = availableHosts.length;
    const newDriveTimes = {};

    // Calculate drive time for each host
    availableHosts.forEach(host => {
      const destination = { lat: host.lat, lng: host.lng };

      directionsService.route(
        {
          origin: origin,
          destination: destination,
          travelMode: window.google.maps.TravelMode.DRIVING
        },
        (result, status) => {
          completedRequests++;
          if (status === 'OK' && result && result.routes && result.routes[0]) {
            const duration = result.routes[0].legs[0].duration.text;
            newDriveTimes[host.id] = duration;
          }

          // Only update state once all requests are complete
          if (completedRequests === totalRequests) {
            setHostDriveTimes(newDriveTimes);
          }
        }
      );
    });
  }, [userCoords, directionsService, hostIdsString, availableHosts]);

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
    if (!directionsService || !directionsRenderer || !userCoords) {
      alert('Please enter your address first to get directions.');
      return;
    }

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

        // Scroll to the directions panel after a brief delay
        setTimeout(() => {
          const directionsPanel = document.querySelector('[data-directions-panel]');
          if (directionsPanel) {
            directionsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);

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
    setDirectionsMenuOpen(null);
  };

  // Open Apple Maps with directions
  const openAppleMapsDirections = (host) => {
    trackEvent('open_apple_maps', {
      event_category: 'External Navigation',
      event_label: 'Apple Maps',
      host_name: host.name,
      host_area: host.area
    });
    
    const url = `https://maps.apple.com/?daddr=${host.lat},${host.lng}`;
    window.open(url, '_blank');
    setDirectionsMenuOpen(null);
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

  // Show loading state while fetching hosts
  if (hostsLoading) {
    return (
      <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🥪</div>
          <p className="text-xl font-bold" style={{color: '#007E8C'}}>Loading hosts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl premium-card-header p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1 mb-3 sm:mb-0">
              <img
                src="LOGOS/CMYK_PRINT_TSP-01-01.jpg"
                alt="The Sandwich Project Logo"
                className="h-12 sm:h-16 md:h-20 w-auto object-contain mx-auto sm:mx-0"
              />
              <div className="text-center sm:text-left">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 tracking-tight" style={{letterSpacing: '-0.02em'}}>
                  <b>The Sandwich Project</b> Host Finder Tool
                </h1>
                <p className="text-base sm:text-xl font-bold mb-1 sm:mb-2" style={{color: '#007E8C'}}>
                  {dropOffDate}
                </p>
                <p className="text-sm sm:text-base md:text-lg font-semibold mb-1 sm:mb-2" style={{color: '#236383'}}>
                  We collect on Wednesdays <span className="text-xs sm:text-sm font-normal" style={{color: '#666'}}>(some hosts accept early Thursday AM drop-offs)</span>
                </p>
                <p className="text-xs sm:text-sm">
                  <button
                    onClick={() => {
                      document.getElementById('resources-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="text-blue-600 underline hover:no-underline font-medium"
                  >
                    Need sandwich-making guides?
                  </button>
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const password = prompt('Enter admin password:');
                if (password === 'sandwich2024') {
                  setShowAdmin(true);
                } else if (password !== null) {
                  alert('Incorrect password');
                }
              }}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:shadow-md hidden sm:block self-start"
              style={{backgroundColor: '#A31C41', color: 'white'}}
              title="Admin: Manage hosts for next week"
            >
              🔧 Admin
            </button>
          </div>

          {/* Visual How-to Steps */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-center gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-5 px-3 sm:px-4 py-3" style={{background: 'linear-gradient(135deg, #F0F9FA 0%, #E6F7F9 100%)', borderRadius: '12px'}}>
            <div className="flex items-center gap-2 sm:gap-3 justify-center sm:justify-start">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-white text-sm sm:text-lg shadow-md flex-shrink-0" style={{backgroundColor: '#007E8C'}}>1</div>
              <span className="text-sm sm:text-base md:text-lg font-bold" style={{color: '#236383'}}>Enter your address</span>
            </div>
            <span className="text-xl sm:text-2xl font-bold hidden sm:inline" style={{color: '#007E8C'}}>→</span>
            <div className="flex items-center gap-2 sm:gap-3 justify-center sm:justify-start">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-white text-sm sm:text-lg shadow-md flex-shrink-0" style={{backgroundColor: '#007E8C'}}>2</div>
              <span className="text-sm sm:text-base md:text-lg font-bold" style={{color: '#236383'}}>View your 3 nearest hosts</span>
            </div>
            <span className="text-xl sm:text-2xl font-bold hidden sm:inline" style={{color: '#007E8C'}}>→</span>
            <div className="flex items-center gap-2 sm:gap-3 justify-center sm:justify-start">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-white text-sm sm:text-lg shadow-md flex-shrink-0" style={{backgroundColor: '#007E8C'}}>3</div>
              <span className="text-sm sm:text-base md:text-lg font-bold" style={{color: '#236383'}}>Click "Show Route" or "Get Directions"</span>
            </div>
          </div>

          {/* Smart Search Section */}
          <div className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="e.g., 123 Peachtree St, Atlanta, GA or 30308"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSmartSearch()}
                  className="w-full px-4 sm:px-5 py-4 sm:py-5 pr-10 sm:pr-12 premium-input rounded-xl text-base sm:text-lg border-2 transition-all"
                  style={{borderColor: '#007E8C'}}
                  disabled={geocoding}
                  autoFocus
                />
                {searchInput && (
                  <button
                    onClick={() => {
                      setSearchInput('');
                      setNameSearch('');
                      setUserCoords(null);
                      setUserAddress('');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center"
                  >
                    ×
                  </button>
                )}
              </div>
              <button
                onClick={handleSmartSearch}
                disabled={geocoding || !searchInput.trim()}
                className="btn-primary px-6 sm:px-8 py-4 sm:py-5 text-white rounded-xl font-bold text-base sm:text-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-lg hover:shadow-xl transition-all touch-manipulation w-full sm:w-auto"
                style={{backgroundColor: '#007E8C', minHeight: '52px'}}
              >
                <i className="lucide-search w-5 h-5 sm:w-6 sm:h-6 mr-2"></i>
                {geocoding ? 'Searching...' : 'Search'}
              </button>
            </div>
            <button
              onClick={getCurrentLocation}
              className="w-full sm:w-auto px-5 sm:px-6 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all hover:shadow-md touch-manipulation"
              style={{backgroundColor: '#FBAD3F', color: 'white', minHeight: '52px'}}
            >
              <i className="lucide-locate w-4 h-4 sm:w-5 sm:h-5"></i>
              Use My Current Location
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

            {/* Collapsible Alerts Below Search */}
            <div className="mt-4 space-y-2">
              {/* Hosts NOT Available - Collapsible */}
              <details className="group">
                <summary className="cursor-pointer list-none p-3 rounded-lg text-sm font-bold" style={{backgroundColor: '#FEE2E2', color: '#991B1B', border: '2px solid #DC2626'}}>
                  <span className="inline-flex items-center gap-2">
                    <span className="group-open:rotate-90 transition-transform">▶</span>
                    Hosts NOT available this week (click to expand)
                  </span>
                </summary>
                <div className="p-4 mt-2 rounded-lg" style={{backgroundColor: '#FEF2F2', border: '2px solid #FCA5A5'}}>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-base font-bold" style={{color: '#991B1B'}}>
                      <span className="w-2 h-2 rounded-full" style={{backgroundColor: '#DC2626'}}></span>
                      Jenny V.W.
                    </li>
                    <li className="flex items-center gap-2 text-base font-bold" style={{color: '#991B1B'}}>
                      <span className="w-2 h-2 rounded-full" style={{backgroundColor: '#DC2626'}}></span>
                      Carrey H.
                    </li>
                    <li className="flex items-center gap-2 text-base font-bold" style={{color: '#991B1B'}}>
                      <span className="w-2 h-2 rounded-full" style={{backgroundColor: '#DC2626'}}></span>
                      Stacey & Jack G.
                    </li>
                  </ul>
                </div>
              </details>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => {
                setViewMode('list');
                trackEvent('view_mode_change', {
                  event_category: 'View',
                  event_label: 'List View Selected'
                });
              }}
              className={`view-toggle-btn px-6 py-3 rounded-xl font-medium transition-all ${
                viewMode === 'list' ? 'active' : ''
              }`}
              style={{
                backgroundColor: viewMode === 'list' ? '#007E8C' : undefined,
                color: viewMode === 'list' ? 'white' : undefined
              }}
            >
              📋 List Only
            </button>
            <button
              onClick={() => {
                setViewMode('proximity');
                trackEvent('view_mode_change', {
                  event_category: 'View',
                  event_label: 'Split View Selected'
                });
              }}
              className={`view-toggle-btn px-6 py-3 rounded-xl font-medium transition-all ${
                viewMode === 'proximity' ? 'active' : ''
              }`}
              style={{
                backgroundColor: viewMode === 'proximity' ? '#007E8C' : undefined,
                color: viewMode === 'proximity' ? 'white' : undefined
              }}
            >
              📍 Map + List
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
              🗺️ Map Only
            </button>
          </div>

        </div>

        {/* Map and/or List */}
        <div className={`grid grid-cols-1 ${viewMode === 'proximity' ? 'lg:grid-cols-2 lg:items-start' : ''} gap-6`}>
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

                {/* Map Tooltip */}
                {mapTooltip && (
                  <div
                    className="absolute bg-white rounded-xl shadow-2xl p-3 z-10 border-2"
                    style={{
                      top: '20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      minWidth: '300px',
                      maxWidth: '340px',
                      borderColor: '#007E8C',
                      boxShadow: '0 10px 40px rgba(0, 126, 140, 0.3)'
                    }}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="text-lg font-bold mb-1" style={{color: '#236383'}}>
                          {mapTooltip.name}
                        </h4>
                        <p className="text-sm font-medium" style={{color: '#007E8C'}}>
                          {mapTooltip.neighborhood ? mapTooltip.neighborhood : mapTooltip.area}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMapTooltip(null);
                          setHighlightedHostId(null);
                          setMapTooltipMenuOpen(false);
                          if (map && initialMapCenter && initialMapZoom !== null) {
                            map.setCenter(initialMapCenter);
                            map.setZoom(initialMapZoom);
                          }
                        }}
                        className="text-gray-400 hover:text-gray-600 ml-2 text-2xl leading-none"
                        title="Close"
                      >
                        ×
                      </button>
                    </div>

                    {/* Distance & Drive Time - Always show if user has location */}
                    {userCoords && (() => {
                      const distance = mapTooltip.distance || calculateDistance(
                        userCoords.lat,
                        userCoords.lng,
                        mapTooltip.lat,
                        mapTooltip.lng
                      ).toFixed(1);
                      return (
                        <div className="mb-2 py-2 px-3 rounded-lg" style={{backgroundColor: '#E6F7F9'}}>
                          <p className="text-sm font-bold" style={{color: '#007E8C'}}>
                            {distance} miles{hostDriveTimes[mapTooltip.id] ? ` · ${hostDriveTimes[mapTooltip.id]} drive` : ''}
                          </p>
                        </div>
                      );
                    })()}

                    {/* Hours */}
                    <div className="mb-2">
                      <p className="text-sm mb-1">
                        <span className="font-semibold" style={{color: '#236383'}}>Hours: </span>
                        <span style={{color: '#007E8C'}}>{mapTooltip.hours}</span>
                      </p>
                      <p className="text-xs" style={{color: '#666'}}>
                        Opens Wednesday at {formatTime(mapTooltip.openTime)}
                      </p>
                    </div>

                    {/* Special Instructions - Higher contrast */}
                    {mapTooltip.notes && (
                      <div className="mb-2 p-2 rounded-lg" style={{backgroundColor: '#FFF9E6', border: '2px solid #FBAD3F'}}>
                        <p className="text-xs">
                          <span className="font-semibold" style={{color: '#A31C41'}}>⚠️ </span>
                          <span style={{color: '#666'}}>{mapTooltip.notes}</span>
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-2">
                      <div className="relative" data-map-tooltip-menu>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMapTooltipMenuOpen(!mapTooltipMenuOpen);
                          }}
                          className="block w-full px-4 py-3 text-white rounded-lg font-bold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2"
                          style={{backgroundColor: '#007E8C'}}
                        >
                          <i className="lucide-navigation w-4 h-4"></i>
                          <span>Get Directions</span>
                          <i className={`lucide-chevron-down w-3 h-3 transition-transform ${mapTooltipMenuOpen ? 'rotate-180' : ''}`}></i>
                        </button>
                        {mapTooltipMenuOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border-2 z-[100] overflow-hidden min-w-[300px]" style={{borderColor: '#007E8C'}}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                showDirections(mapTooltip);
                                setMapTooltipMenuOpen(false);
                                setMapTooltip(null);
                              }}
                              className="w-full px-5 py-4 hover:bg-gray-50 flex flex-col items-center justify-center gap-2 transition-colors text-center"
                            >
                              <div className="flex items-center justify-center gap-3 mb-1">
                                <i className="lucide-route w-6 h-6" style={{color: '#007E8C'}}></i>
                                <div className="font-bold text-base" style={{color: '#236383'}}>Show Directions In-App</div>
                              </div>
                              <div className="text-sm text-gray-600">View turn-by-turn directions below map</div>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openGoogleMapsDirections(mapTooltip);
                                setMapTooltipMenuOpen(false);
                              }}
                              className="w-full px-5 py-4 hover:bg-gray-50 flex flex-col items-center justify-center gap-2 transition-colors text-center border-t" style={{borderColor: '#e0e0e0'}}
                            >
                              <div className="flex items-center justify-center gap-3 mb-1">
                                <i className="lucide-map w-6 h-6" style={{color: '#007E8C'}}></i>
                                <div className="font-bold text-base" style={{color: '#236383'}}>Open in Google Maps</div>
                              </div>
                              <div className="text-sm text-gray-600">Navigate with Google Maps app</div>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openAppleMapsDirections(mapTooltip);
                                setMapTooltipMenuOpen(false);
                              }}
                              className="w-full px-5 py-4 hover:bg-gray-50 flex flex-col items-center justify-center gap-2 transition-colors text-center border-t" style={{borderColor: '#e0e0e0'}}>
                              <div className="flex items-center justify-center gap-3 mb-1">
                                <i className="lucide-map-pin w-6 h-6" style={{color: '#007E8C'}}></i>
                                <div className="font-bold text-base" style={{color: '#236383'}}>Open in Apple Maps</div>
                              </div>
                              <div className="text-sm text-gray-600">Navigate with Apple Maps app</div>
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const hostCard = document.querySelector(`[data-host-id="${mapTooltip.id}"]`);
                          if (hostCard) {
                            hostCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                          setMapTooltip(null);
                        }}
                        className="block w-full px-4 py-2 rounded-lg font-medium text-center text-sm transition-all hover:bg-opacity-80"
                        style={{backgroundColor: '#F0F9FA', color: '#007E8C', border: '1.5px solid rgba(0, 126, 140, 0.3)'}}
                      >
                        View Full Details
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Turn-by-Turn Directions */}
              {directionSteps && routeInfo && (
                <div className="border-t" style={{borderColor: 'rgba(71, 179, 203, 0.15)'}} data-directions-panel>
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
                  data-host-id={host.id}
                  className={`bg-white rounded-2xl premium-card p-6 md:p-8 transition-all border-2 border-transparent ${
                    // Only add hover effects and cursor pointer on desktop (md breakpoint and up)
                    'md:hover:shadow-xl md:hover:scale-[1.02] md:cursor-pointer md:hover:border-blue-200'
                  } ${
                    userCoords && viewMode === 'proximity' && index < 3
                      ? `top-host-card top-host-${index + 1}`
                      : ''
                  } ${highlightedHostId === host.id ? 'ring-4 ring-yellow-400 shadow-xl' : ''}`}
                  onClick={(e) => {
                    // Only handle card clicks on desktop and when clicking on non-interactive areas
                    const isMobile = window.innerWidth < 768;
                    const clickedElement = e.target;
                    const isInteractive = clickedElement.closest('button, a, input, select, textarea, [role="button"]');
                    
                    // On mobile, don't do anything if clicking on interactive elements
                    if (isMobile && isInteractive) {
                      return;
                    }
                    
                    // On desktop, allow card clicks but still check if it's an interactive element
                    if (!isMobile && isInteractive) {
                      return;
                    }
                    
                    setHighlightedHostId(host.id);
                    trackEvent('host_card_click', {
                      event_category: 'Host List',
                      event_label: 'Host Card Clicked',
                      host_name: host.name,
                      host_area: host.area
                    });
                    // Scroll map into view if on mobile (but only if not clicking a button)
                    if (viewMode !== 'list' && isMobile && !isInteractive) {
                      document.getElementById('map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                >
                  <div className="flex gap-5 items-start">
                    {/* Show map thumbnail in list view or when no address entered */}
                    {(viewMode === 'list' || !userCoords) && (
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
                      <div className="flex flex-col gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          {userCoords && viewMode === 'proximity' && index < 3 && (
                            <span className={`w-8 h-8 rank-badge rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                              index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                            }`}>
                              {index + 1}
                            </span>
                          )}
                          <h3 className="font-bold text-2xl">{host.name}</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!userCoords) {
                                alert('Please enter your address first to see the route on the map!');
                                // Focus on the search input
                                const searchInput = document.querySelector('input[placeholder*="e.g."]');
                                if (searchInput) {
                                  searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  setTimeout(() => searchInput.focus(), 500);
                                }
                                return;
                              }
                              showingDirections === host.id ? clearDirections() : showDirections(host);
                            }}
                            className="btn-primary px-4 py-3 rounded-lg font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all hover:shadow-md touch-manipulation"
                            style={{backgroundColor: showingDirections === host.id ? '#A31C41' : '#FBAD3F', minHeight: '48px'}}
                            title={!userCoords ? 'Enter your address to see route on map' : (showingDirections === host.id ? 'Clear route from map' : 'Show route on the map')}
                          >
                            <i className="lucide-route w-5 h-5"></i>
                            <span>{showingDirections === host.id ? 'Clear Route' : 'Show Route'}</span>
                          </button>
                          <div className="relative" data-directions-menu style={{zIndex: directionsMenuOpen === host.id ? 1000 : 'auto'}}>
                            <button
                              ref={directionsMenuOpen === host.id ? directionsButtonRef : null}
                              onClick={(e) => {
                                e.stopPropagation();
                                const buttonRect = e.currentTarget.getBoundingClientRect();
                                const isOpening = directionsMenuOpen !== host.id;
                                setDirectionsMenuOpen(isOpening ? host.id : null);
                                if (isOpening) {
                                  const viewportWidth = window.innerWidth;
                                  const viewportHeight = window.innerHeight;
                                  const dropdownWidth = 280;
                                  const dropdownHeight = 200;
                                  
                                  let left = buttonRect.left;
                                  let top = buttonRect.bottom + 4;
                                  
                                  // Ensure dropdown doesn't go off right edge
                                  if (left + dropdownWidth > viewportWidth - 16) {
                                    left = viewportWidth - dropdownWidth - 16;
                                  }
                                  // Ensure dropdown doesn't go off left edge
                                  if (left < 16) {
                                    left = 16;
                                  }
                                  // If dropdown would go off bottom, show above button instead
                                  if (top + dropdownHeight > viewportHeight - 16) {
                                    top = buttonRect.top - dropdownHeight - 4;
                                  }
                                  // Ensure dropdown doesn't go off top edge
                                  if (top < 16) {
                                    top = 16;
                                  }
                                  
                                  setDirectionsMenuPosition({ top, left });
                                }
                                trackEvent('get_directions_click', {
                                  event_category: 'Directions',
                                  event_label: 'Get Directions Button',
                                  host_name: host.name,
                                  host_area: host.area
                                });
                              }}
                              className="btn-primary px-4 py-3 rounded-lg font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all hover:shadow-md touch-manipulation w-full"
                              style={{backgroundColor: '#007E8C', minHeight: '48px'}}
                              title="Choose your maps app"
                            >
                              <i className="lucide-navigation w-5 h-5"></i>
                              <span>Get Directions</span>
                              <i className={`lucide-chevron-down w-4 h-4 transition-transform ${directionsMenuOpen === host.id ? 'rotate-180' : ''}`}></i>
                            </button>
                            {directionsMenuOpen === host.id && ReactDOM.createPortal(
                              <div 
                                className="fixed bg-white rounded-lg shadow-xl border-2 overflow-hidden"
                                style={{
                                  borderColor: '#007E8C',
                                  minWidth: '280px',
                                  width: 'max-content',
                                  maxWidth: 'calc(100vw - 2rem)',
                                  zIndex: 10000,
                                  top: `${directionsMenuPosition.top}px`,
                                  left: `${directionsMenuPosition.left}px`
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openGoogleMapsDirections(host);
                                  }}
                                  className="w-full px-5 py-4 hover:bg-gray-50 flex flex-col items-center justify-center gap-2 transition-colors text-center"
                                >
                                  <div className="flex items-center justify-center gap-3 mb-1">
                                    <i className="lucide-map w-6 h-6" style={{color: '#007E8C'}}></i>
                                    <div className="font-bold text-base" style={{color: '#236383'}}>Google Maps</div>
                                  </div>
                                  <div className="text-sm text-gray-600">Works on all devices</div>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAppleMapsDirections(host);
                                  }}
                                  className="w-full px-5 py-4 hover:bg-gray-50 flex flex-col items-center justify-center gap-2 transition-colors text-center border-t" style={{borderColor: '#e0e0e0'}}>
                                  <div className="flex items-center justify-center gap-3 mb-1">
                                    <i className="lucide-map-pin w-6 h-6" style={{color: '#007E8C'}}></i>
                                    <div className="font-bold text-base" style={{color: '#236383'}}>Apple Maps</div>
                                  </div>
                                  <div className="text-sm text-gray-600">Best on iPhone/iPad</div>
                                </button>
                                {/* Sign-in Reminder at bottom */}
                                <div className="p-3 text-center text-sm border-t" style={{backgroundColor: '#FFF9E6', borderColor: '#FBAD3F'}}>
                                  <span className="font-bold" style={{color: '#A31C41'}}>Remember: </span>
                                  <span className="text-gray-700">Sign in when you drop off!</span>
                                </div>
                              </div>,
                              document.body
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCalendar(host);
                            }}
                            className="btn-primary px-4 py-3 rounded-lg font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all hover:shadow-md touch-manipulation"
                            style={{backgroundColor: '#236383', minHeight: '48px'}}
                            title="Download an event reminder for this host"
                          >
                            <i className="lucide-calendar-plus w-5 h-5"></i>
                            <span>Add to Calendar</span>
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
                                {hostDriveTimes[host.id] && (
                                  <span className="font-medium" style={{color: '#007E8C'}}> • {hostDriveTimes[host.id]} drive</span>
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

        {/* Resources Section - Moved to bottom for better UX */}
        <div id="resources-section" className="max-w-4xl mx-auto mt-8 px-4">
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

        {/* Feedback Button - Fixed position */}
        <button
          onClick={() => setShowFeedback(true)}
          className="fixed bottom-6 right-6 px-6 py-3 rounded-full font-bold text-white shadow-2xl hover:shadow-3xl transition-all z-50 flex items-center gap-2"
          style={{backgroundColor: '#007E8C'}}
        >
          <span>💬</span>
          <span>Give Feedback</span>
        </button>

        {/* Feedback Modal */}
        {showFeedback && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
            <div className="bg-white rounded-2xl max-w-md w-full p-8 relative">
              <button
                onClick={() => {
                  setShowFeedback(false);
                  setFeedbackRating(0);
                  setFeedbackText('');
                  setFeedbackEmail('');
                  setFeedbackSubmitted(false);
                }}
                className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-600"
              >
                ×
              </button>

              {!feedbackSubmitted ? (
                <>
                  <h2 className="text-2xl font-bold mb-6" style={{color: '#236383'}}>
                    How was your experience?
                  </h2>

                  {/* Star Rating */}
                  <div className="mb-6">
                    <p className="font-semibold mb-3" style={{color: '#236383'}}>Rate your experience:</p>
                    <div className="flex gap-2 justify-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFeedbackRating(star)}
                          className="text-4xl transition-all hover:scale-110"
                        >
                          {star <= feedbackRating ? '⭐' : '☆'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conditional feedback text based on rating */}
                  {feedbackRating > 0 && (
                    <>
                      <div className="mb-4">
                        <label className="block font-semibold mb-2" style={{color: '#236383'}}>
                          {feedbackRating >= 4 ? 'What did you like most? (optional)' : 'What can we improve? *'}
                        </label>
                        <textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border-2"
                          style={{borderColor: '#E0E0E0'}}
                          rows="4"
                          placeholder={feedbackRating >= 4 ? 'Tell us what worked well...' : 'Please help us understand what needs improvement...'}
                          required={feedbackRating < 4}
                        />
                      </div>

                      <div className="mb-6">
                        <label className="block font-semibold mb-2" style={{color: '#236383'}}>
                          Email (optional, for follow-up)
                        </label>
                        <input
                          type="email"
                          value={feedbackEmail}
                          onChange={(e) => setFeedbackEmail(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border-2"
                          style={{borderColor: '#E0E0E0'}}
                          placeholder="your.email@example.com"
                        />
                      </div>

                      <button
                        onClick={async () => {
                          // Validate
                          if (feedbackRating < 4 && !feedbackText.trim()) {
                            alert('Please tell us what we can improve.');
                            return;
                          }

                          try {
                            // Save to Firestore
                            await db.collection('feedback').add({
                              rating: feedbackRating,
                              feedback: feedbackText,
                              email: feedbackEmail,
                              timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                              userAgent: navigator.userAgent,
                              url: window.location.href
                            });

                            // Track in analytics
                            analytics.logEvent('feedback_submitted', {
                              rating: feedbackRating,
                              has_text: feedbackText.length > 0,
                              has_email: feedbackEmail.length > 0
                            });

                            setFeedbackSubmitted(true);
                          } catch (error) {
                            console.error('Error submitting feedback:', error);
                            alert('Error submitting feedback. Please try again.');
                          }
                        }}
                        className="w-full px-6 py-3 rounded-xl font-bold text-white"
                        style={{backgroundColor: '#007E8C'}}
                      >
                        Submit Feedback
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-2xl font-bold mb-2" style={{color: '#236383'}}>
                    Thank you!
                  </h3>
                  <p className="text-gray-600">
                    Your feedback helps us improve the Host Finder Tool.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Render the app
ReactDOM.render(<HostAvailabilityApp />, document.getElementById('root'));