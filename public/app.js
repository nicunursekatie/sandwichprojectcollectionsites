// Mobile optimization: Throttle utility function (defined outside component to avoid re-creation)
const createThrottledFunction = (func, limit) => {
  let inThrottle = false;
  let lastArgs = null;
  let lastContext = null;
  let timeoutId = null;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      timeoutId = setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func.apply(lastContext, lastArgs);
          lastArgs = null;
          lastContext = null;
        }
      }, limit);
    } else {
      lastArgs = args;
      lastContext = this;
    }
  };
};

// Mobile optimization: Debounce utility function (defined outside component to avoid re-creation)
const createDebouncedFunction = (func, delay) => {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

const HostAvailabilityApp = () => {
  const [userAddress, setUserAddress] = React.useState('');
  const [searchInput, setSearchInput] = React.useState('');
  const [nameSearch, setNameSearch] = React.useState('');
  const [userCoords, setUserCoords] = React.useState(null);
  const [viewMode, setViewMode] = React.useState('list');
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
  const [userRole, setUserRole] = React.useState(null);
  const [showReadOnlyModal, setShowReadOnlyModal] = React.useState(false);
  const [highlightedHostId, setHighlightedHostId] = React.useState(null);
  const [directionsMenuOpen, setDirectionsMenuOpen] = React.useState(null);
  const [directionsMenuPosition, setDirectionsMenuPosition] = React.useState({ top: 0, left: 0 });
  const [mapTooltipMenuOpen, setMapTooltipMenuOpen] = React.useState(false);
  const [initialMapCenter, setInitialMapCenter] = React.useState(null);
  const [initialMapZoom, setInitialMapZoom] = React.useState(null);
  const [hostDriveTimes, setHostDriveTimes] = React.useState({});
  const [dropOffTime, setDropOffTime] = React.useState(''); // User's intended drop-off time (HH:MM format)
  const [showFeedback, setShowFeedback] = React.useState(false);
  const [feedbackRating, setFeedbackRating] = React.useState(0);
  const [feedbackText, setFeedbackText] = React.useState('');
  const [feedbackEmail, setFeedbackEmail] = React.useState('');
  const [simpleView, setSimpleView] = React.useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = React.useState(false);
  const [favoriteHostId, setFavoriteHostId] = React.useState(null);
  const [includeUnavailableHosts, setIncludeUnavailableHosts] = React.useState(false);
  const [tuesdayEnabled, setTuesdayEnabled] = React.useState(false); // Toggle for Tuesday collections
  const [expandedHosts, setExpandedHosts] = React.useState(new Set());
  // Special Collections state
  const [specialCollection, setSpecialCollection] = React.useState(null);
  const [editingSpecialCollection, setEditingSpecialCollection] = React.useState(null);
  const [editingSpecialHost, setEditingSpecialHost] = React.useState(null);
  // URL-based page routing
  const [currentPage, setCurrentPage] = React.useState(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('specialcollections') || path.includes('special-collections')) {
      return 'specialcollections';
    }
    return 'main';
  });

  // Handle browser back/forward navigation
  React.useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('specialcollections') || path.includes('special-collections')) {
        setCurrentPage('specialcollections');
      } else {
        setCurrentPage('main');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const directionsButtonRef = React.useRef(null);
  const hostIdsRef = React.useRef('');
  const markersRef = React.useRef({});
  // Refs for stable event handler references (prevents memory leaks in event listener cleanup)
  const menuThrottledScrollRef = React.useRef(null);
  const menuDebouncedResizeRef = React.useRef(null);
  const menuClickOutsideRef = React.useRef(null);
  const menuReadyRef = React.useRef(false);
  const originalBodyStylesRef = React.useRef({ overflow: '', paddingRight: '' });
  const scrollThrottledHandlerRef = React.useRef(null);

  // Firebase Analytics tracking helper
  const trackEvent = (eventName, eventParams = {}) => {
    if (window.firebase && window.firebase.analytics) {
      try {
        window.firebase.analytics().logEvent(eventName, eventParams);
      } catch (error) {
        console.error('Analytics error:', error);
      }
    }
  };

  // Load favorite host from localStorage on mount
  React.useEffect(() => {
    const savedFavoriteId = localStorage.getItem('favoriteHostId');
    if (savedFavoriteId) {
      setFavoriteHostId(parseInt(savedFavoriteId));
    }
  }, []);

  // Toggle favorite host
  const toggleFavoriteHost = (hostId) => {
    if (favoriteHostId === hostId) {
      // Unfavorite
      setFavoriteHostId(null);
      localStorage.removeItem('favoriteHostId');
      trackEvent('unfavorite_host', {
        event_category: 'Favorites',
        event_label: 'Remove Favorite Host',
        host_id: hostId
      });
    } else {
      // Favorite
      setFavoriteHostId(hostId);
      localStorage.setItem('favoriteHostId', hostId.toString());
      trackEvent('favorite_host', {
        event_category: 'Favorites',
        event_label: 'Set Favorite Host',
        host_id: hostId
      });
    }
  };

  // Close directions menu when clicking outside and update position on scroll/resize
  React.useEffect(() => {
    const updateMenuPosition = () => {
      if (directionsMenuOpen !== null && directionsButtonRef.current) {
        const buttonRect = directionsButtonRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        // Mobile optimization: Responsive dropdown width based on viewport
        const dropdownWidth = Math.min(280, viewportWidth * 0.9);
        const dropdownHeight = Math.min(200, viewportHeight * 0.8);
        // Mobile optimization: Responsive margins based on viewport
        const margin = Math.min(16, viewportWidth * 0.05);

        let left = buttonRect.left;
        let top = buttonRect.bottom + 4;

        // Ensure dropdown doesn't go off right edge
        if (left + dropdownWidth > viewportWidth - margin) {
          left = viewportWidth - dropdownWidth - margin;
        }
        // Ensure dropdown doesn't go off left edge
        if (left < margin) {
          left = margin;
        }
        // If dropdown would go off bottom, show above button instead
        if (top + dropdownHeight > viewportHeight - margin) {
          top = buttonRect.top - dropdownHeight - 4;
        }
        // Ensure dropdown doesn't go off top edge
        if (top < margin) {
          top = margin;
        }

        setDirectionsMenuPosition({ top, left });
      }
    };
    
    if (directionsMenuOpen !== null || mapTooltipMenuOpen) {
      // Use flag-based approach to prevent immediate menu closure
      menuReadyRef.current = false;
      
      // Mobile optimization: Store original body styles in ref to prevent stale closure issues
      // Account for scrollbar width to prevent content jump
      originalBodyStylesRef.current = {
        overflow: document.body.style.overflow,
        paddingRight: document.body.style.paddingRight
      };
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      // Create click outside handler that uses flag to prevent premature closure
      const handleClickOutside = (event) => {
        // Ignore events until menu is ready (prevents immediate closure from opening click)
        if (!menuReadyRef.current) {
          return;
        }
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

      // Store handlers in refs for proper cleanup (maintains stable references)
      menuClickOutsideRef.current = handleClickOutside;
      menuThrottledScrollRef.current = createThrottledFunction(updateMenuPosition, 100);
      menuDebouncedResizeRef.current = createDebouncedFunction(updateMenuPosition, 250);

      // Attach event listeners immediately
      document.addEventListener('click', menuClickOutsideRef.current);
      // Mobile optimization: Use touchend instead of touchstart to prevent premature closure
      document.addEventListener('touchend', menuClickOutsideRef.current, { passive: true });
      // Mobile optimization: Throttled scroll for better mobile performance
      window.addEventListener('scroll', menuThrottledScrollRef.current, { passive: true, capture: true });
      // Mobile optimization: Debounced resize to prevent layout thrashing
      window.addEventListener('resize', menuDebouncedResizeRef.current);
      
      // Enable click handling after current event loop to prevent immediate closure
      requestAnimationFrame(() => {
        menuReadyRef.current = true;
      });

      return () => {
        // Reset ready flag
        menuReadyRef.current = false;
        // Mobile optimization: Restore original body styles from ref
        document.body.style.overflow = originalBodyStylesRef.current.overflow;
        document.body.style.paddingRight = originalBodyStylesRef.current.paddingRight;
        // Remove event listeners using the same references stored in refs
        // Note: capture option must match for proper removal; passive is not needed for removal
        document.removeEventListener('click', menuClickOutsideRef.current);
        document.removeEventListener('touchend', menuClickOutsideRef.current);
        window.removeEventListener('scroll', menuThrottledScrollRef.current, { capture: true });
        window.removeEventListener('resize', menuDebouncedResizeRef.current);
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

    // Mobile optimization: Store throttled handler in ref for proper cleanup
    scrollThrottledHandlerRef.current = createThrottledFunction(handleScroll, 100);
    window.addEventListener('scroll', scrollThrottledHandlerRef.current, { passive: true });
    // Trigger once on mount to catch initial viewport
    handleScroll();

    return () => window.removeEventListener('scroll', scrollThrottledHandlerRef.current);
  }, []);

  const helperRefs = window.AppHelpers || {};
  // getNextCollectionDay now respects tuesdayEnabled toggle
  const getNextCollectionDay = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 2 = Tuesday, 3 = Wednesday
    let daysUntilCollection;

    if (tuesdayEnabled) {
      // Tuesday and Wednesday are both collection days
      if (dayOfWeek === 2 || dayOfWeek === 3) {
        // Today is Tuesday or Wednesday, return today
        daysUntilCollection = 0;
      } else if (dayOfWeek < 2) {
        // Sunday (0) or Monday (1) - next collection is Tuesday
        daysUntilCollection = 2 - dayOfWeek;
      } else {
        // Thursday (4), Friday (5), or Saturday (6) - next collection is next Tuesday
        daysUntilCollection = (2 - dayOfWeek + 7) % 7 || 7;
      }
    } else {
      // Only Wednesday is a collection day
      if (dayOfWeek === 3) {
        // Today is Wednesday, return today
        daysUntilCollection = 0;
      } else if (dayOfWeek < 3) {
        // Sunday (0), Monday (1), or Tuesday (2) - next collection is Wednesday
        daysUntilCollection = 3 - dayOfWeek;
      } else {
        // Thursday (4), Friday (5), or Saturday (6) - next collection is next Wednesday
        daysUntilCollection = (3 - dayOfWeek + 7) % 7 || 7;
      }
    }
    const nextCollectionDay = new Date(today);
    nextCollectionDay.setDate(today.getDate() + daysUntilCollection);
    return nextCollectionDay;
  };
  // Always use our getNextCollectionDay which respects tuesdayEnabled
  const getNextWednesday = getNextCollectionDay;
  // Helper to format condensed hours (8am–8pm)
  const formatCondensedHours = (host) => {
    if (!host.openTime || !host.closeTime) return host.hours || 'Hours not available';
    return `${formatTime(host.openTime)}–${formatTime(host.closeTime)}`;
  };

  // Helper to format all collection day hours
  const formatAllCollectionHours = (host) => {
    const hours = [];

    // Tuesday hours - only show if Tuesday collections are enabled
    if (tuesdayEnabled) {
      const tueOpen = host.tuesdayOpenTime || host.openTime;
      const tueClose = host.tuesdayCloseTime || host.closeTime;
      if (tueOpen && tueClose) {
        hours.push(`Tue: ${formatTime(tueOpen)}–${formatTime(tueClose)}`);
      }
    }

    // Wednesday hours - use wednesday-specific if available, otherwise fallback to openTime/closeTime
    const wedOpen = host.wednesdayOpenTime || host.openTime;
    const wedClose = host.wednesdayCloseTime || host.closeTime;
    if (wedOpen && wedClose) {
      hours.push(`Wed: ${formatTime(wedOpen)}–${formatTime(wedClose)}`);
    }

    // Thursday hours (if available)
    if (host.thursdayOpenTime && host.thursdayCloseTime) {
      hours.push(`Thu: ${formatTime(host.thursdayOpenTime)}–${formatTime(host.thursdayCloseTime)}`);
    }

    return hours.length > 0 ? hours.join(' • ') : (host.hours || 'Hours not available');
  };

  // Helper to check if host is open at a specific time and how much buffer there is
  const checkHostTimeAvailability = (host, timeStr) => {
    if (!timeStr || !host.openTime || !host.closeTime) {
      return { isOpen: true, warning: null, minutesUntilClose: null };
    }

    // Convert time strings to minutes since midnight for comparison
    const timeToMinutes = (t) => {
      const [hours, minutes] = t.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const dropOffMinutes = timeToMinutes(timeStr);
    const openMinutes = timeToMinutes(host.openTime);
    const closeMinutes = timeToMinutes(host.closeTime);

    // Check if drop-off time is within host's hours
    if (dropOffMinutes < openMinutes) {
      return {
        isOpen: false,
        warning: `Opens at ${formatTime(host.openTime)}`,
        minutesUntilClose: null
      };
    }
    if (dropOffMinutes >= closeMinutes) {
      return {
        isOpen: false,
        warning: `Closes at ${formatTime(host.closeTime)}`,
        minutesUntilClose: null
      };
    }

    // Host is open - check how much buffer time
    const minutesUntilClose = closeMinutes - dropOffMinutes;

    if (minutesUntilClose <= 30) {
      return {
        isOpen: true,
        warning: `Closes ${minutesUntilClose} min after your drop-off!`,
        minutesUntilClose,
        severity: 'high'
      };
    }
    if (minutesUntilClose <= 60) {
      return {
        isOpen: true,
        warning: `Closes ${minutesUntilClose} min after your drop-off`,
        minutesUntilClose,
        severity: 'medium'
      };
    }

    return { isOpen: true, warning: null, minutesUntilClose };
  };

  // Toggle expanded state for host card
  const toggleHostExpanded = (hostId) => {
    setExpandedHosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(hostId)) {
        newSet.delete(hostId);
      } else {
        newSet.add(hostId);
      }
      return newSet;
    });
  };

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

    // Load active special collection
    const loadSpecialCollection = async () => {
      try {
        const snapshot = await db.collection('specialCollections')
          .where('active', '==', true)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = { id: doc.id, ...doc.data() };

          // Check if it's expired
          const now = new Date();
          const endDate = data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate);

          if (now > endDate) {
            // Auto-expire: deactivate in Firestore
            await db.collection('specialCollections').doc(doc.id).update({ active: false });
            setSpecialCollection(null);
          } else {
            setSpecialCollection(data);
          }
        }
      } catch (error) {
        console.error('Error loading special collection:', error);
      }
    };

    loadSpecialCollection();

    // Check for special collection expiration every minute
    const expirationInterval = setInterval(async () => {
      if (specialCollection) {
        const now = new Date();
        const endDate = specialCollection.endDate?.toDate ? specialCollection.endDate.toDate() : new Date(specialCollection.endDate);
        if (now > endDate) {
          try {
            await db.collection('specialCollections').doc(specialCollection.id).update({ active: false });
            setSpecialCollection(null);
          } catch (error) {
            console.error('Error auto-expiring special collection:', error);
          }
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(expirationInterval);
  }, []);

  // Special Collection functions
  const saveSpecialCollection = async (collectionData) => {
    try {
      // Helper to safely convert date strings to Date objects
      const toDate = (val) => {
        if (!val) return null;
        if (val instanceof Date) return val;
        if (val.toDate) return val.toDate();
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      };

      const data = {
        ...collectionData,
        active: true,
        createdAt: new Date(),
        startDate: toDate(collectionData.startDate),
        endDate: toDate(collectionData.endDate),
        displayStart: toDate(collectionData.displayStart),
        displayEnd: toDate(collectionData.displayEnd),
        hosts: collectionData.hosts || []
      };

      if (collectionData.id) {
        // Update existing
        await db.collection('specialCollections').doc(collectionData.id).update(data);
        setSpecialCollection({ ...data, id: collectionData.id });
      } else {
        // Create new - first deactivate any existing active ones
        const activeSnapshot = await db.collection('specialCollections').where('active', '==', true).get();
        const batch = db.batch();
        activeSnapshot.forEach(doc => {
          batch.update(doc.ref, { active: false });
        });

        // Add new collection
        const docRef = await db.collection('specialCollections').add(data);
        await batch.commit();
        setSpecialCollection({ ...data, id: docRef.id });
      }

      setEditingSpecialCollection(null);
      alert('Special collection saved successfully!');
    } catch (error) {
      console.error('Error saving special collection:', error);
      alert('Error saving special collection: ' + error.message);
    }
  };

  const deactivateSpecialCollection = async () => {
    if (!specialCollection) return;

    if (!confirm('Are you sure you want to end this special collection early?')) return;

    try {
      await db.collection('specialCollections').doc(specialCollection.id).update({ active: false });
      setSpecialCollection(null);
      alert('Special collection ended.');
    } catch (error) {
      console.error('Error deactivating special collection:', error);
      alert('Error ending special collection: ' + error.message);
    }
  };

  const addSpecialHost = (hostData) => {
    if (!editingSpecialCollection) return;

    const newHost = {
      ...hostData,
      id: Date.now(), // Use timestamp as unique ID
      lat: parseFloat(hostData.lat),
      lng: parseFloat(hostData.lng)
    };

    setEditingSpecialCollection({
      ...editingSpecialCollection,
      hosts: [...(editingSpecialCollection.hosts || []), newHost]
    });
    setEditingSpecialHost(null);
  };

  const updateSpecialHost = (hostId, hostData) => {
    if (!editingSpecialCollection) return;

    setEditingSpecialCollection({
      ...editingSpecialCollection,
      hosts: editingSpecialCollection.hosts.map(h =>
        h.id === hostId ? { ...hostData, id: hostId, lat: parseFloat(hostData.lat), lng: parseFloat(hostData.lng) } : h
      )
    });
    setEditingSpecialHost(null);
  };

  const removeSpecialHost = (hostId) => {
    if (!editingSpecialCollection) return;

    setEditingSpecialCollection({
      ...editingSpecialCollection,
      hosts: editingSpecialCollection.hosts.filter(h => h.id !== hostId)
    });
  };

  // Corrected coordinates for one-time sync to Firestore
  // After running sync, this can be removed
  const CORRECTED_COORDINATES = {
    6: { lat: 33.97714839472864, lng: -83.87451752591748 },    // Veronica P.
    8: { lat: 33.94631773639219, lng: -84.32785029486064 },    // Marcy L. & Stephanie
    13: { lat: 33.73731642561438, lng: -84.33097917273453 },   // Rebecca H.
    26: { lat: 33.777486111888095, lng: -84.36233139965479 },  // Stacey & Jack G.
    28: { lat: 33.63368864946583, lng: -84.53582165315241 },   // Rayna N.
    30: { lat: 33.96871661644047, lng: -84.43953833583247 },   // Judy T.
    31: { lat: 34.14914844153542, lng: -83.89972546763543 },   // Kristina M.
    34: { lat: 34.19104972968844, lng: -84.23280486762955 }    // Natalia W.
  };

  // One-time function to sync corrected coordinates to Firestore
  const syncCoordinatesToFirestore = async () => {
    if (!confirm('This will update coordinates for 8 hosts in Firestore. Continue?')) return;

    try {
      const batch = db.batch();

      for (const [hostId, coords] of Object.entries(CORRECTED_COORDINATES)) {
        const docRef = db.collection('hosts').doc(String(hostId));
        batch.update(docRef, { lat: coords.lat, lng: coords.lng });
      }

      await batch.commit();
      alert('Coordinates synced successfully! Refreshing...');
      window.location.reload();
    } catch (error) {
      console.error('Error syncing coordinates:', error);
      alert('Error syncing coordinates: ' + error.message);
    }
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

  const updateAllEmergencyHours = async () => {
    if (!confirm('This will update ALL hosts\' closing times:\n\nTuesday: 6:30 PM\nWednesday: 2:00 PM\n\nContinue?')) {
      return;
    }

    try {
      // Reload hosts from Firestore first to ensure we have the latest data
      const snapshot = await db.collection('hosts').get();
      const hostsToUpdate = [];
      snapshot.forEach(doc => {
        hostsToUpdate.push({ ...doc.data(), id: doc.data().id });
      });

      if (hostsToUpdate.length === 0) {
        alert('No hosts found in Firestore.');
        return;
      }

      const batch = db.batch();
      let updateCount = 0;

      hostsToUpdate.forEach(host => {
        const docRef = db.collection('hosts').doc(String(host.id));
        // Use set with merge to ensure fields are added even if they don't exist
        // Set both open and close times, using existing openTime as fallback for open times
        const updateData = {
          tuesdayCloseTime: '18:30',
          wednesdayCloseTime: '14:00'
        };
        // Only set open times if they don't already exist
        if (!host.tuesdayOpenTime && host.openTime) {
          updateData.tuesdayOpenTime = host.openTime;
        }
        if (!host.wednesdayOpenTime && host.openTime) {
          updateData.wednesdayOpenTime = host.openTime;
        }
        batch.set(docRef, updateData, { merge: true });
        updateCount++;
      });

      await batch.commit();

      // Reload hosts from Firestore to get updated data
      const updatedSnapshot = await db.collection('hosts').get();
      const updatedHosts = [];
      updatedSnapshot.forEach(doc => {
        updatedHosts.push({ ...doc.data(), id: doc.data().id });
      });
      updatedHosts.sort((a, b) => a.id - b.id);
      setAllHosts(updatedHosts);

      alert(`✅ Successfully updated ${updateCount} hosts!\n\nTuesday closing: 6:30 PM\nWednesday closing: 2:00 PM\n\nRefresh the page to see changes.`);
    } catch (error) {
      console.error('Error updating emergency hours:', error);
      alert('Error updating hours: ' + error.message);
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
    
    const codeStr = `    return [\n${(allHosts || []).map(host => {
      let fields = `    { id: ${host.id}, name: '${host.name}', area: '${host.area}'${host.neighborhood ? `, neighborhood: '${host.neighborhood}'` : ''}, lat: ${host.lat}, lng: ${host.lng}, phone: '${host.phone}', hours: '${host.hours}'`;
      if (host.tuesdayOpenTime) fields += `, tuesdayOpenTime: '${host.tuesdayOpenTime}', tuesdayCloseTime: '${host.tuesdayCloseTime}'`;
      if (host.wednesdayOpenTime) fields += `, wednesdayOpenTime: '${host.wednesdayOpenTime}', wednesdayCloseTime: '${host.wednesdayCloseTime}'`;
      if (host.openTime) fields += `, openTime: '${host.openTime}', closeTime: '${host.closeTime}'`;
      if (host.thursdayOpenTime) fields += `, thursdayOpenTime: '${host.thursdayOpenTime}', thursdayCloseTime: '${host.thursdayCloseTime}'`;
      if (host.customDropoffDays) fields += `, customDropoffDays: '${host.customDropoffDays}'`;
      fields += `, notes: '${host.notes}', available: ${host.available} }`;
      return fields;
    }).join(',\n')}\n    ];`;

    navigator.clipboard.writeText(codeStr).then(() => {
      alert('Code copied to clipboard! Paste this into app.js lines 56-85 to replace the default host data.');
    }).catch(() => {
      // Fallback: show in a text area
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:1rem;';
      // Mobile optimization: Responsive textarea dimensions and improved tap targets
      modal.innerHTML = `<div style="background:white;padding:20px;border-radius:8px;max-width:90%;max-height:80%;overflow:auto;"><h3>Copy this code:</h3><textarea style="width:min(600px, 85vw);height:min(400px, 60vh);font-family:monospace;font-size:12px;">${codeStr}</textarea><br><button onclick="this.parentElement.parentElement.remove()" style="margin-top:10px;padding:12px 20px;min-height:48px;background:#007E8C;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;">Close</button></div>`;
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
  // Show ALL hosts for planning purposes, not just available ones
  const allHostsForDisplay = allHosts || [];
  const availableHosts = allHostsForDisplay.filter(h => h.available);
  const areas = [...new Set(allHostsForDisplay.map(h => h.area))].sort();

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
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 2 = Tuesday, 3 = Wednesday
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Check if today is Tuesday or Wednesday (drop-off days)
    // Tuesday is only a drop-off day if tuesdayEnabled is true
    const isTuesday = currentDay === 2;
    const isWednesday = currentDay === 3;
    const isDropOffDay = (isTuesday && tuesdayEnabled) || isWednesday;

    // Get day-specific hours (fallback to openTime/closeTime for backward compatibility)
    let openTime, closeTime, dayName;
    if (isTuesday && tuesdayEnabled) {
      // Tuesday (only if enabled)
      openTime = host.tuesdayOpenTime || host.openTime;
      closeTime = host.tuesdayCloseTime || host.closeTime;
      dayName = 'Tuesday';
    } else if (isWednesday) {
      // Wednesday
      openTime = host.wednesdayOpenTime || host.openTime;
      closeTime = host.wednesdayCloseTime || host.closeTime;
      dayName = 'Wednesday';
    }

    // If no hours defined for this day, return null
    if (!openTime || !closeTime) return null;

    if (!isDropOffDay) {
      // Calculate days until next collection day
      let daysUntilCollection;
      let nextDayName;
      if (tuesdayEnabled) {
        // Tuesday collections are enabled
        if (currentDay < 2) {
          // Sunday (0) or Monday (1) - next collection is Tuesday
          daysUntilCollection = 2 - currentDay;
          nextDayName = 'Tuesday';
          openTime = host.tuesdayOpenTime || host.openTime;
        } else if (currentDay === 2) {
          // It's Tuesday but tuesdayEnabled is false - next is Wednesday
          daysUntilCollection = 1;
          nextDayName = 'Wednesday';
          openTime = host.wednesdayOpenTime || host.openTime;
        } else {
          // Thursday (4), Friday (5), or Saturday (6) - next collection is next Tuesday
          daysUntilCollection = (2 - currentDay + 7) % 7 || 7;
          nextDayName = 'Tuesday';
          openTime = host.tuesdayOpenTime || host.openTime;
        }
      } else {
        // Only Wednesday collections
        if (currentDay < 3) {
          // Sunday (0), Monday (1), or Tuesday (2) - next collection is Wednesday
          daysUntilCollection = 3 - currentDay;
          nextDayName = 'Wednesday';
          openTime = host.wednesdayOpenTime || host.openTime;
        } else {
          // Thursday (4), Friday (5), or Saturday (6) - next collection is next Wednesday
          daysUntilCollection = (3 - currentDay + 7) % 7 || 7;
          nextDayName = 'Wednesday';
          openTime = host.wednesdayOpenTime || host.openTime;
        }
      }
      if (!openTime) return null;
      return {
        status: 'closed-until-dropoff',
        message: `Opens ${daysUntilCollection === 1 ? 'tomorrow' : `in ${daysUntilCollection} days`} (${nextDayName}) at ${formatTime(openTime)}`,
        color: '#FBAD3F'
      };
    }

    // It's Tuesday or Wednesday - check if within operating hours
    if (currentTime < openTime) {
      const openDate = new Date();
      const [openHour, openMin] = openTime.split(':');
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
    } else if (currentTime >= openTime && currentTime < closeTime) {
      const closeDate = new Date();
      const [closeHour, closeMin] = closeTime.split(':');
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
    if (!userCoords || viewMode !== 'proximity') return allHostsForDisplay;

    const sorted = allHostsForDisplay.map(host => ({
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
  }, [userCoords, viewMode, allHostsForDisplay, userAddress]);

  const filteredHosts = React.useMemo(() => {
    let filtered = viewMode === 'proximity' ? sortedHosts : [...allHostsForDisplay].sort((a, b) => a.name.localeCompare(b.name));

    // Filter out unavailable hosts by default (unless user opts in for planning)
    if (!includeUnavailableHosts) {
      filtered = filtered.filter(h => h.available);
    }

    // Apply drop-off time filter
    if (dropOffTime) {
      filtered = filtered.filter(h => {
        const availability = checkHostTimeAvailability(h, dropOffTime);
        return availability.isOpen;
      });
    }

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
  }, [filterArea, viewMode, sortedHosts, allHostsForDisplay, nameSearch, includeUnavailableHosts, dropOffTime]);

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
    if (!window.google) return;
    if (map) return; // Map already initialized

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

    // Note: Map styling is configured via Cloud-based styling in Google Cloud Console
    // using the mapId. Client-side styles are not compatible with mapId.
    const mapInstance = new window.google.maps.Map(mapElement, {
      center: mapCenter,
      zoom: mapZoom,
      mapId: 'SANDWICH_DROP_OFF_MAP',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
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

    // Prepare host data: sort by distance if user coords available
    let hostsWithDistance;
    let topThreeHosts = [];
    let otherHosts = [];

    if (userCoords) {
      // Filter to only available hosts for ranking (unavailable shown separately if checkbox checked)
      const availableHosts = allHostsForDisplay.filter(h => h.available);
      const unavailableHosts = includeUnavailableHosts ? allHostsForDisplay.filter(h => !h.available) : [];

      hostsWithDistance = availableHosts.map(host => ({
        ...host,
        distance: calculateDistance(userCoords.lat, userCoords.lng, host.lat, host.lng)
      })).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

      // Top 3 closest AVAILABLE hosts - these are the "sore thumbs"
      topThreeHosts = hostsWithDistance.slice(0, 3);
      // Other hosts only shown when "show all" is clicked
      otherHosts = showAllHostsOnMap ? [
        ...hostsWithDistance.slice(3),
        ...unavailableHosts.map(h => ({
          ...h,
          distance: calculateDistance(userCoords.lat, userCoords.lng, h.lat, h.lng)
        }))
      ] : [];
    } else {
      // No user location - show all available hosts as equal (no Top 3 highlighting)
      const hostsForMap = includeUnavailableHosts ? allHostsForDisplay : allHostsForDisplay.filter(h => h.available);
      hostsWithDistance = hostsForMap;
      topThreeHosts = [];
      otherHosts = hostsForMap;
    }

    // Clear previous markers
    markersRef.current = {};

    // ========== TOP 3 MARKERS: HUGE, GOLD, NUMBERED, PULSING ==========
    // These must be unmistakable - the "sore thumbs"

    // Add CSS animation for pulsing halo (only once)
    if (!document.getElementById('marker-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'marker-pulse-style';
      style.textContent = `
        @keyframes markerPulse {
          0% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        .marker-pulse-ring {
          animation: markerPulse 2s ease-out infinite;
        }
      `;
      document.head.appendChild(style);
    }

    topThreeHosts.forEach((host, index) => {
      const rank = index + 1;

      // Create the "sore thumb" marker - LARGE, GOLD, NUMBERED
      const hostMarkerContent = document.createElement('div');
      hostMarkerContent.innerHTML = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <!-- Pulsing halo ring -->
          <div class="marker-pulse-ring" style="
            position: absolute;
            width: 44px;
            height: 44px;
            background: #FBAD3F;
            border-radius: 50%;
            z-index: 1;
          "></div>
          <!-- Main pin -->
          <div style="
            position: relative;
            z-index: 2;
            width: 44px;
            height: 44px;
            background: #FBAD3F;
            border: 4px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            cursor: pointer;
          ">
            <span style="
              color: #1a1a1a;
              font-weight: 800;
              font-size: 18px;
              font-family: 'Plus Jakarta Sans', sans-serif;
            ">${rank}</span>
          </div>
        </div>
      `;

      const markerTitle = `#${rank} Closest: ${host.name} - ${host.distance} mi`;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: host.lat, lng: host.lng },
        map: mapInstance,
        title: markerTitle,
        content: hostMarkerContent,
        zIndex: 1000 + (3 - rank) // Top 3 always on top, #1 highest
      });

      markersRef.current[host.id] = { marker, content: hostMarkerContent };

      marker.addListener('click', (e) => {
        // Stop the event from propagating to the map click listener
        if (e && e.domEvent) {
          e.domEvent.stopPropagation();
        }
        setMapTooltip(host);
        setHighlightedHostId(host.id);
        mapInstance.setZoom(14);
        mapInstance.panTo({ lat: host.lat, lng: host.lng });
        trackEvent('map_marker_click', {
          event_category: 'Map',
          event_label: 'Top 3 Marker Clicked',
          host_name: host.name,
          host_area: host.area,
          rank: rank
        });
      });
    });

    // ========== OTHER MARKERS: TINY, MUTED, BACKGROUND NOISE ==========
    // These should fade into the background - just small dots

    const backgroundMarkers = []; // For clustering

    otherHosts.forEach((host) => {
      const isUnavailable = !host.available;

      // Tiny muted dot - barely visible
      const hostMarkerContent = document.createElement('div');
      hostMarkerContent.innerHTML = `
        <div style="
          width: 10px;
          height: 10px;
          background: ${isUnavailable ? '#9CA3AF' : '#5BA3A8'};
          border: 1px solid white;
          border-radius: 50%;
          opacity: ${isUnavailable ? '0.3' : '0.5'};
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        "></div>
      `;

      const markerTitle = userCoords
        ? `${host.name} - ${host.distance} mi${isUnavailable ? ' (Not collecting)' : ''}`
        : `${host.name}${isUnavailable ? ' (Not collecting)' : ''}`;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: host.lat, lng: host.lng },
        map: mapInstance,
        title: markerTitle,
        content: hostMarkerContent,
        zIndex: isUnavailable ? 1 : 10 // Low z-index, below Top 3
      });

      markersRef.current[host.id] = { marker, content: hostMarkerContent };
      backgroundMarkers.push(marker);

      marker.addListener('click', (e) => {
        // Stop the event from propagating to the map click listener
        if (e && e.domEvent) {
          e.domEvent.stopPropagation();
        }
        if (isUnavailable) {
          alert('⚠️ IMPORTANT: This host is NOT collecting this week. You cannot drop off sandwiches here. Please choose a host marked as "Collecting This Week" instead.');
        }
        setMapTooltip(host);
        setHighlightedHostId(host.id);
        mapInstance.setZoom(14);
        mapInstance.panTo({ lat: host.lat, lng: host.lng });
        trackEvent('map_marker_click', {
          event_category: 'Map',
          event_label: 'Background Marker Clicked',
          host_name: host.name,
          host_area: host.area
        });
      });
    });

    // ========== CLUSTERING: Only for background markers ==========
    if (backgroundMarkers.length > 5 && window.markerClusterer) {
      new window.markerClusterer.MarkerClusterer({
        map: mapInstance,
        markers: backgroundMarkers,
        renderer: {
          render: ({ count, position }) => {
            const clusterContent = document.createElement('div');
            clusterContent.innerHTML = `
              <div style="
                width: 28px;
                height: 28px;
                background: #5BA3A8;
                border: 2px solid white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                color: white;
                font-weight: 600;
                font-size: 11px;
                opacity: 0.7;
              ">${count}</div>
            `;
            return new google.maps.marker.AdvancedMarkerElement({
              position,
              content: clusterContent,
              zIndex: 5 // Below top 3
            });
          }
        }
      });
    }

    // ========== FOCUS MODE: Fit bounds to user + Top 3 ==========
    if (userCoords && topThreeHosts.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: userCoords.lat, lng: userCoords.lng });
      topThreeHosts.forEach(host => {
        bounds.extend({ lat: host.lat, lng: host.lng });
      });
      // Fit bounds with generous padding for clear separation
      mapInstance.fitBounds(bounds, { padding: 60 });

      // Ensure minimum zoom for readability (don't zoom out too far)
      google.maps.event.addListenerOnce(mapInstance, 'bounds_changed', () => {
        if (mapInstance.getZoom() > 13) {
          mapInstance.setZoom(13);
        }
      });
    } else if (otherHosts.length > 0) {
      // No user location - show all hosts
      const bounds = new google.maps.LatLngBounds();
      otherHosts.forEach(host => {
        bounds.extend({ lat: host.lat, lng: host.lng });
      });
      mapInstance.fitBounds(bounds, { padding: 50 });
    }

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
  }, [userCoords, allHostsForDisplay, map, showAllHostsOnMap, includeUnavailableHosts]);

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

  // Reset map when toggle changes or when includeUnavailableHosts changes
  React.useEffect(() => {
    if (map) {
      setMap(null); // Force map re-initialization
    }
  }, [showAllHostsOnMap, includeUnavailableHosts]);

  // Reset map when user coordinates change (to re-center and add user marker)
  const prevUserCoords = React.useRef(userCoords);
  React.useEffect(() => {
    if (userCoords && prevUserCoords.current !== userCoords && map) {
      setMap(null); // Force map re-initialization with new user location
    }
    prevUserCoords.current = userCoords;
  }, [userCoords, map]);

  // Reset map when includeUnavailableHosts changes to update markers
  React.useEffect(() => {
    if (map) {
      setMap(null); // Force map re-initialization to show/hide unavailable hosts
    }
  }, [includeUnavailableHosts]);

  // Initialize map when API is loaded AND map div exists (works with or without user location)
  React.useEffect(() => {
    if (viewMode === 'list') {
      // When switching to list-only view, clear the map to allow re-initialization later
      if (map) {
        setMap(null);
      }
      return;
    }
    
    if (mapLoaded && !map) {
      // Check if map element exists in DOM before initializing
      const checkAndInit = () => {
        const mapElement = document.getElementById('map');
        if (mapElement && !map) {
          initializeMap();
        } else if (!mapElement) {
          // If map element doesn't exist yet, try again after a short delay
          setTimeout(checkAndInit, 100);
        }
      };
      
      // Initial check with a small delay to ensure DOM is ready
      const timeoutId = setTimeout(checkAndInit, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [mapLoaded, viewMode, initializeMap, map]);

  // Auto-focus map on favorite host when page loads
  React.useEffect(() => {
    if (!map || !favoriteHostId || !allHosts.length || highlightedHostId) return;

    const favoriteHost = allHosts.find(h => h.id === favoriteHostId);
    if (!favoriteHost) return;

    // Check if host is available
    if (!favoriteHost.available) {
      // Find nearest available hosts to the unavailable favorite
      const nearbyHosts = availableHosts
        .filter(h => h.id !== favoriteHostId)
        .map(h => ({
          ...h,
          distance: calculateDistance(favoriteHost.lat, favoriteHost.lng, h.lat, h.lng)
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);

      // Show notification with nearby alternatives
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 p-4 rounded-lg shadow-xl border-2';
      notification.style.backgroundColor = '#FFF9E6';
      notification.style.borderColor = '#FBAD3F';
      notification.style.maxWidth = '90%';
      // Mobile optimization: Responsive notification width
      notification.style.width = 'min(450px, 90vw)';

      const nearbyHostsList = nearbyHosts.map((h, i) => `
        <div class="flex items-center justify-between py-2 px-3 rounded hover:bg-orange-50 cursor-pointer" data-host-id="${h.id}" style="border: 1px solid #FBAD3F; margin-top: 8px;">
          <div>
            <p class="font-semibold text-sm" style="color: #236383;">${h.name}</p>
            <p class="text-xs" style="color: #666;">${h.area}${h.neighborhood ? ' - ' + h.neighborhood : ''}</p>
          </div>
          <div class="text-right">
            <p class="text-xs font-bold" style="color: #007E8C;">${h.distance.toFixed(1)} mi</p>
          </div>
        </div>
      `).join('');

      notification.innerHTML = `
        <div class="flex items-start gap-3">
          <span style="font-size: 24px;">⚠️</span>
          <div class="flex-1">
            <p class="font-bold mb-1" style="color: #A31C41;">Your Saved Host is Unavailable</p>
            <p class="text-sm mb-2" style="color: #666;">${favoriteHost.name} is not accepting drop-offs this week.</p>
            ${nearbyHosts.length > 0 ? `
              <p class="text-sm font-semibold mb-1" style="color: #236383;">Nearby alternatives:</p>
              ${nearbyHostsList}
            ` : ''}
          </div>
          <button onclick="this.parentElement.parentElement.remove()" class="text-2xl leading-none" style="color: #666; min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; padding: 8px; cursor: pointer;">&times;</button>
        </div>
      `;
      document.body.appendChild(notification);

      // Add click handlers for nearby hosts
      nearbyHosts.forEach(host => {
        const hostElement = notification.querySelector(`[data-host-id="${host.id}"]`);
        if (hostElement) {
          hostElement.addEventListener('click', () => {
            // Focus map on selected host
            map.setCenter({ lat: host.lat, lng: host.lng });
            map.setZoom(15);
            setHighlightedHostId(host.id);

            // Close notification
            notification.remove();

            // Scroll to host in list
            const hostCard = document.querySelector(`[data-host-id="${host.id}"]`);
            if (hostCard) {
              hostCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            trackEvent('select_nearby_alternative', {
              event_category: 'Favorites',
              event_label: 'Selected Alternative to Unavailable Saved Host',
              unavailable_host_id: favoriteHostId,
              selected_host_id: host.id
            });
          });
        }
      });

      // Auto-dismiss after 12 seconds (longer because there's more to read)
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 12000);
      return;
    }

    // Focus map on favorite host
    setTimeout(() => {
      map.setCenter({ lat: favoriteHost.lat, lng: favoriteHost.lng });
      map.setZoom(15);
      setHighlightedHostId(favoriteHostId);

      trackEvent('auto_focus_favorite', {
        event_category: 'Favorites',
        event_label: 'Auto-focused on Saved Host',
        host_id: favoriteHostId
      });
    }, 500);
  }, [map, favoriteHostId, allHosts, highlightedHostId]);

  // Memoize host IDs string to prevent unnecessary recalculations
  const hostIdsString = React.useMemo(() => {
    return allHostsForDisplay.map(h => h.id).sort().join(',');
  }, [allHostsForDisplay]);

  // Calculate drive times for all hosts when user enters address
  React.useEffect(() => {
    // Early return if conditions aren't met
    if (!userCoords || !directionsService || !allHostsForDisplay.length || !window.google || !window.google.maps) {
      return;
    }

    // Skip if we already calculated for these hosts
    if (hostIdsRef.current === hostIdsString) {
      return;
    }

    hostIdsRef.current = hostIdsString;

    const origin = { lat: userCoords.lat, lng: userCoords.lng };
    let completedRequests = 0;
    const totalRequests = allHostsForDisplay.length;
    const newDriveTimes = {};

    // Calculate drive time for each host
    allHostsForDisplay.forEach(host => {
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
  }, [userCoords, directionsService, hostIdsString, allHostsForDisplay]);

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
        const now = new Date();
        const currentDay = now.getDay();
        // Get day-specific hours
        let openTime, closeTime;
        if (currentDay === 2 && tuesdayEnabled) {
          openTime = host.tuesdayOpenTime || host.openTime;
          closeTime = host.tuesdayCloseTime || host.closeTime;
        } else if (currentDay === 3) {
          openTime = host.wednesdayOpenTime || host.openTime;
          closeTime = host.wednesdayCloseTime || host.closeTime;
        } else {
          // Default to Wednesday if not a collection day (or Tuesday disabled)
          openTime = host.wednesdayOpenTime || host.openTime;
          closeTime = host.wednesdayCloseTime || host.closeTime;
        }
        setRouteInfo({
          hostId: host.id,
          duration: leg.duration.text,
          distance: leg.distance.text,
          hostName: host.name,
          hostAddress: `${host.area}${host.neighborhood ? ' - ' + host.neighborhood : ''}`,
          hostPhone: host.phone,
          hours: host.hours,
          openTime: openTime,
          closeTime: closeTime,
          tuesdayOpenTime: host.tuesdayOpenTime,
          tuesdayCloseTime: host.tuesdayCloseTime,
          wednesdayOpenTime: host.wednesdayOpenTime,
          wednesdayCloseTime: host.wednesdayCloseTime
        });

        // Extract turn-by-turn directions
        setDirectionSteps(leg.steps.map(step => ({
          instruction: step.instructions,
          distance: step.distance.text,
          duration: step.duration.text
        })));

        // Scroll to the directions panel after a brief delay, keeping some map visible
        setTimeout(() => {
          const directionsPanel = document.querySelector('[data-directions-panel]');
          if (directionsPanel) {
            directionsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 500);

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
    if (!host.available) {
      alert('⚠️ IMPORTANT: This host is NOT collecting this week. You cannot drop off sandwiches here. Please choose a host marked as "Collecting This Week" instead.');
      return;
    }
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

  // Copy directions to clipboard
  const copyDirections = () => {
    if (!routeInfo || !directionSteps) return;

    trackEvent('copy_directions', {
      event_category: 'Directions',
      event_label: 'Copy to Clipboard',
      host_name: routeInfo.hostName,
      distance: routeInfo.distance,
      duration: routeInfo.duration
    });

    const host = availableHosts.find(h => h.id === routeInfo.hostId);

    // Create formatted text for clipboard
    let text = `Directions to ${routeInfo.hostName}\n`;
    text += `Location: ${routeInfo.hostAddress}\n`;
    text += `Phone: ${routeInfo.hostPhone}\n`;
    text += `\nTotal Distance: ${routeInfo.distance}\n`;
    text += `Estimated Time: ${routeInfo.duration}\n`;
    text += `Drop-off Date: ${dropOffDate}\n`;
    text += `Host Hours: ${routeInfo.hours}\n`;
    text += `\nView full turn-by-turn directions on Google Maps:\n`;
    text += `https://www.google.com/maps/dir/${userCoords.lat},${userCoords.lng}/${host.lat},${host.lng}\n`;

    navigator.clipboard.writeText(text).then(() => {
      alert('✓ Directions copied to clipboard! You can now paste them into an email or text message.');
    }).catch(() => {
      alert('Unable to copy to clipboard. Please manually copy the information from the screen.');
    });
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

  // Special Collections dedicated page
  if (currentPage === 'specialcollections') {
    const now = new Date();
    // Check if within display window (use displayStart/displayEnd if available, fall back to startDate/endDate)
    const isActive = specialCollection && (() => {
      const displayEnd = specialCollection.displayEnd?.toDate ? specialCollection.displayEnd.toDate() :
                         specialCollection.displayEnd ? new Date(specialCollection.displayEnd) :
                         specialCollection.endDate?.toDate ? specialCollection.endDate.toDate() : new Date(specialCollection.endDate);
      const displayStart = specialCollection.displayStart?.toDate ? specialCollection.displayStart.toDate() :
                           specialCollection.displayStart ? new Date(specialCollection.displayStart) :
                           specialCollection.startDate?.toDate ? specialCollection.startDate.toDate() : new Date(specialCollection.startDate);
      return now >= displayStart && now <= displayEnd;
    })();

    return (
      <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8" style={{backgroundColor: '#FFF5F7'}}>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <img
                src="LOGOS/CMYK_PRINT_TSP-01-01.jpg"
                alt="The Sandwich Project Logo"
                className="h-16 sm:h-20 w-auto object-contain mx-auto sm:mx-0"
              />
              <div className="text-center sm:text-left flex-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2" style={{color: '#A31C41'}}>
                  🚨 Special Collection
                </h1>
                <p className="text-sm sm:text-base" style={{color: '#666'}}>
                  Emergency & temporary sandwich collection locations
                </p>
              </div>
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, '', '/');
                  setCurrentPage('main');
                }}
                className="text-sm px-4 py-2 rounded-lg font-medium text-center"
                style={{backgroundColor: '#007E8C', color: 'white'}}
              >
                ← Back to Weekly Collections
              </a>
            </div>
          </div>

          {/* Address Search for Proximity */}
          {isActive && specialCollection.hosts?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-5 mb-6">
              <h3 className="font-bold mb-3" style={{color: '#236383'}}>📍 Find the Closest Location</h3>
              <p className="text-sm mb-3" style={{color: '#666'}}>Enter your address to sort drop-off locations by driving distance:</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Enter your address..."
                  id="special-collection-address"
                  className="flex-1 px-4 py-3 rounded-xl border-2 text-base"
                  style={{borderColor: '#A31C41'}}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      document.getElementById('special-collection-search-btn')?.click();
                    }
                  }}
                />
                <button
                  id="special-collection-search-btn"
                  onClick={async () => {
                    const addressInput = document.getElementById('special-collection-address');
                    const address = addressInput?.value?.trim();
                    if (!address) {
                      alert('Please enter an address');
                      return;
                    }

                    const btn = document.getElementById('special-collection-search-btn');
                    const originalText = btn.innerText;
                    btn.innerText = 'Searching...';
                    btn.disabled = true;

                    try {
                      const geocoder = new window.google.maps.Geocoder();
                      const result = await new Promise((resolve, reject) => {
                        geocoder.geocode({ address }, (results, status) => {
                          if (status === 'OK' && results[0]) {
                            resolve(results[0].geometry.location);
                          } else {
                            reject(new Error('Could not find that address'));
                          }
                        });
                      });

                      const userLat = result.lat();
                      const userLng = result.lng();

                      // Calculate distances
                      const hosts = specialCollection.hosts.filter(h => h.lat && h.lng);

                      if (hosts.length === 0) {
                        alert('No hosts have location coordinates set');
                        return;
                      }

                      // Helper to calculate straight-line distance
                      const haversineDistance = (lat1, lng1, lat2, lng2) => {
                        const R = 3959; // Earth's radius in miles
                        const dLat = (lat2 - lat1) * Math.PI / 180;
                        const dLng = (lng2 - lng1) * Math.PI / 180;
                        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                                  Math.sin(dLng/2) * Math.sin(dLng/2);
                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                        return R * c;
                      };

                      let hostsWithDistance;

                      // Try Distance Matrix API first
                      try {
                        const distanceService = new window.google.maps.DistanceMatrixService();
                        const destinations = hosts.map(h => ({ lat: parseFloat(h.lat), lng: parseFloat(h.lng) }));

                        const distanceResult = await new Promise((resolve, reject) => {
                          distanceService.getDistanceMatrix({
                            origins: [{ lat: userLat, lng: userLng }],
                            destinations,
                            travelMode: 'DRIVING'
                          }, (response, status) => {
                            if (status === 'OK') {
                              resolve(response);
                            } else {
                              reject(new Error(status));
                            }
                          });
                        });

                        hostsWithDistance = hosts.map((host, i) => {
                          const element = distanceResult.rows[0].elements[i];
                          return {
                            ...host,
                            driveTime: element.status === 'OK' ? element.duration.value : Infinity,
                            driveTimeText: element.status === 'OK' ? element.duration.text : 'N/A',
                            distanceText: element.status === 'OK' ? element.distance.text : 'N/A'
                          };
                        });
                      } catch (apiError) {
                        // Fallback to straight-line distance
                        console.log('Distance Matrix API failed, using straight-line distance:', apiError);
                        hostsWithDistance = hosts.map(host => {
                          const dist = haversineDistance(userLat, userLng, parseFloat(host.lat), parseFloat(host.lng));
                          return {
                            ...host,
                            driveTime: dist * 60, // Rough estimate: 1 mile = 1 minute
                            driveTimeText: `~${Math.round(dist * 1.5)} min`, // Estimate with traffic factor
                            distanceText: `${dist.toFixed(1)} mi`
                          };
                        });
                      }

                      hostsWithDistance.sort((a, b) => a.driveTime - b.driveTime);

                      // Store in window for the page to use
                      window.specialCollectionSortedHosts = hostsWithDistance;
                      window.specialCollectionUserCoords = { lat: userLat, lng: userLng };

                      // Force re-render by updating state
                      setSpecialCollection({ ...specialCollection, _sortedByProximity: true, _timestamp: Date.now() });

                    } catch (error) {
                      alert(error.message || 'Error finding address');
                    } finally {
                      btn.innerText = originalText;
                      btn.disabled = false;
                    }
                  }}
                  className="px-6 py-3 rounded-xl font-semibold text-white whitespace-nowrap"
                  style={{backgroundColor: '#A31C41'}}
                >
                  🔍 Search
                </button>
                {window.specialCollectionSortedHosts && (
                  <button
                    onClick={() => {
                      window.specialCollectionSortedHosts = null;
                      window.specialCollectionUserCoords = null;
                      document.getElementById('special-collection-address').value = '';
                      setSpecialCollection({ ...specialCollection, _sortedByProximity: false, _timestamp: Date.now() });
                    }}
                    className="px-4 py-3 rounded-xl font-medium"
                    style={{backgroundColor: '#f0f0f0', color: '#666'}}
                  >
                    Clear
                  </button>
                )}
              </div>
              {window.specialCollectionSortedHosts && (
                <p className="text-sm mt-3 font-medium" style={{color: '#47bc3b'}}>
                  ✓ Sorted by driving distance from your location
                </p>
              )}
            </div>
          )}

          {/* Active Special Collection */}
          {isActive ? (
            <div className="rounded-2xl overflow-hidden shadow-lg" style={{border: '3px solid #A31C41'}}>
              {/* Header */}
              <div className="p-5 sm:p-6" style={{backgroundColor: '#A31C41'}}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">
                      {specialCollection.name}
                    </h2>
                    {specialCollection.description && (
                      <p className="text-base text-white opacity-90 mt-2">{specialCollection.description}</p>
                    )}
                  </div>
                  <div className="text-white text-base sm:text-lg font-semibold px-4 py-2 rounded-lg" style={{backgroundColor: 'rgba(255,255,255,0.2)'}}>
                    {(() => {
                      const startDate = specialCollection.startDate?.toDate ? specialCollection.startDate.toDate() : new Date(specialCollection.startDate);
                      const endDate = specialCollection.endDate?.toDate ? specialCollection.endDate.toDate() : new Date(specialCollection.endDate);

                      // If collection hasn't started yet, show "Starts in..."
                      if (now < startDate) {
                        const hoursUntilStart = Math.max(0, Math.ceil((startDate - now) / (1000 * 60 * 60)));
                        const minutesUntilStart = Math.max(0, Math.ceil((startDate - now) / (1000 * 60)));
                        if (hoursUntilStart > 24) {
                          const days = Math.ceil(hoursUntilStart / 24);
                          return `Starts in ${days} day${days > 1 ? 's' : ''}`;
                        }
                        return hoursUntilStart > 1 ? `Starts in ${hoursUntilStart} hours` : minutesUntilStart > 0 ? `Starts in ${minutesUntilStart} min` : 'Starting soon';
                      }

                      // Collection has started, show "Ends in..."
                      const hoursRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60)));
                      const minutesRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60)));
                      return hoursRemaining > 1 ? `Ends in ${hoursRemaining} hours` : minutesRemaining > 0 ? `Ends in ${minutesRemaining} min` : 'Ending soon';
                    })()}
                  </div>
                </div>
              </div>

              {/* Map */}
              {specialCollection.hosts?.length > 0 && (
                <div className="p-5 sm:p-6 bg-white border-b">
                  <h3 className="font-bold text-lg mb-4" style={{color: '#236383'}}>📍 Map</h3>
                  <div
                    id="special-collection-map"
                    className="w-full rounded-xl overflow-hidden"
                    style={{height: '300px', border: '2px solid #e0e0e0'}}
                    ref={(el) => {
                      if (el && window.google && !el.dataset.initialized) {
                        el.dataset.initialized = 'true';
                        const hosts = [...specialCollection.hosts].sort((a, b) => a.name.localeCompare(b.name)).filter(h => h.lat && h.lng);
                        if (hosts.length === 0) return;

                        const bounds = new window.google.maps.LatLngBounds();
                        hosts.forEach(h => bounds.extend({lat: parseFloat(h.lat), lng: parseFloat(h.lng)}));

                        const mapInstance = new window.google.maps.Map(el, {
                          center: bounds.getCenter(),
                          zoom: 11,
                          mapId: 'special_collection_map'
                        });
                        mapInstance.fitBounds(bounds, 50);

                        // Track open InfoWindow to close it when another is opened
                        let currentInfoWindow = null;

                        hosts.forEach((host, index) => {
                          const markerDiv = document.createElement('div');
                          markerDiv.innerHTML = `<div style="background-color: #A31C41; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${index + 1}</div>`;

                          const marker = new window.google.maps.marker.AdvancedMarkerElement({
                            map: mapInstance,
                            position: {lat: parseFloat(host.lat), lng: parseFloat(host.lng)},
                            content: markerDiv,
                            title: host.name
                          });

                          marker.addListener('click', () => {
                            // Close any previously open InfoWindow
                            if (currentInfoWindow) {
                              currentInfoWindow.close();
                            }

                            const infoWindow = new window.google.maps.InfoWindow({
                              content: `<div style="padding: 8px; max-width: 200px;">
                                <strong style="color: #236383;">${host.name}</strong><br>
                                <span style="color: #666; font-size: 12px;">${host.area}</span><br>
                                <span style="color: #007E8C; font-weight: bold;">${formatTime(host.openTime)} - ${formatTime(host.closeTime)}</span><br>
                                <a href="https://www.google.com/maps/dir/?api=1&destination=${host.lat},${host.lng}" target="_blank" style="color: #FBAD3F; font-size: 12px;">Get Directions →</a>
                              </div>`
                            });
                            infoWindow.open(mapInstance, marker);
                            currentInfoWindow = infoWindow;
                          });
                        });
                      }
                    }}
                  />
                </div>
              )}

              {/* Hosts Grid */}
              <div className="p-5 sm:p-6 bg-white">
                <h3 className="font-bold text-lg mb-4" style={{color: '#236383'}}>
                  Drop-off Locations ({specialCollection.hosts?.length || 0})
                  {window.specialCollectionSortedHosts && (
                    <span className="text-sm font-normal ml-2" style={{color: '#47bc3b'}}>- sorted by distance</span>
                  )}
                </h3>
                {specialCollection.hosts?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(window.specialCollectionSortedHosts || [...specialCollection.hosts].sort((a, b) => a.name.localeCompare(b.name))).map((host, index) => (
                      <div key={host.id} className="rounded-xl p-5 shadow-sm" style={{backgroundColor: '#f8f9fa', border: '2px solid #e0e0e0'}}>
                        <div className="flex items-start gap-3">
                          <div style={{backgroundColor: '#A31C41', color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', flexShrink: 0}}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-lg mb-1" style={{color: '#236383'}}>{host.name}</h4>
                            <p className="text-sm mb-2" style={{color: '#666'}}>
                              {host.area}{host.neighborhood ? ` - ${host.neighborhood}` : ''}
                            </p>
                            {host.driveTimeText && (
                              <p className="text-sm font-semibold mb-2" style={{color: '#A31C41'}}>
                                🚗 {host.driveTimeText} ({host.distanceText})
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <span className="text-base font-bold px-3 py-1 rounded-lg" style={{backgroundColor: '#007E8C', color: 'white'}}>
                            🕐 {formatTime(host.openTime)} - {formatTime(host.closeTime)}
                          </span>
                          {host.phone && (
                            <a href={`tel:${host.phone}`} className="text-sm font-medium px-3 py-1 rounded-lg flex items-center gap-1" style={{backgroundColor: '#47bc3b', color: 'white'}}>
                              📞 Call
                            </a>
                          )}
                        </div>
                        {host.lat && host.lng && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${host.lat},${host.lng}${window.specialCollectionUserCoords ? `&origin=${window.specialCollectionUserCoords.lat},${window.specialCollectionUserCoords.lng}` : ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block text-sm font-medium px-3 py-1 rounded-lg"
                            style={{backgroundColor: '#FBAD3F', color: 'white'}}
                          >
                            🗺️ Get Directions
                          </a>
                        )}
                        {host.notes && (
                          <p className="text-sm mt-3 p-3 rounded-lg" style={{backgroundColor: '#FFF9E6', color: '#666'}}>
                            ⚠️ {host.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8" style={{color: '#666'}}>No drop-off locations have been added yet.</p>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 sm:px-6 py-4 text-center" style={{backgroundColor: '#f0c0c0', color: '#A31C41'}}>
                <strong>⏰ This is a temporary collection.</strong> Ends at {(() => {
                  const endDate = specialCollection.endDate?.toDate ? specialCollection.endDate.toDate() : new Date(specialCollection.endDate);
                  return endDate.toLocaleString([], { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                })()}
              </div>
            </div>
          ) : (
            /* No Active Special Collection */
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h2 className="text-2xl font-bold mb-3" style={{color: '#236383'}}>No Active Special Collection</h2>
              <p className="text-base mb-6" style={{color: '#666'}}>
                There is no emergency or special collection happening right now.
              </p>
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, '', '/');
                  setCurrentPage('main');
                }}
                className="inline-block px-6 py-3 rounded-xl font-semibold text-white"
                style={{backgroundColor: '#007E8C'}}
              >
                View Weekly Collections →
              </a>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-white rounded-2xl shadow-lg p-5 mt-6">
            <h3 className="font-bold mb-2" style={{color: '#236383'}}>ℹ️ About Special Collections</h3>
            <p className="text-sm" style={{color: '#666'}}>
              Special collections are temporary drop-off events for emergencies like warming centers or urgent community needs.
              They operate independently from our regular Wednesday collections. Check back here during emergencies or
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, '', '/');
                  setCurrentPage('main');
                }}
                className="font-medium ml-1"
                style={{color: '#007E8C'}}
              >
                view our weekly collection schedule
              </a>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 lg:p-8" style={{overflowX: 'hidden', width: '100%', maxWidth: '100vw'}}>
      <div className="max-w-5xl mx-auto" style={{width: '100%', maxWidth: '100%'}}>
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
                <p className="text-lg sm:text-2xl font-bold mb-1" style={{color: '#007E8C'}}>
                  {dropOffDate}
                </p>
                <p className="text-sm sm:text-base font-medium" style={{color: '#236383'}}>
                  Drop-off options for THIS Wednesday{tuesdayEnabled ? ' & Tuesday' : ''} • <span className="font-normal" style={{color: '#666'}}>Updated every Monday</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const password = prompt('Enter admin password:');
                if (password === 'sandwich2024') {
                  setUserRole('admin');
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

          {/* Address Search - Primary Action */}
          <div className="px-3 sm:px-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter your address (e.g., 123 Peachtree St, Atlanta, GA)"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSmartSearch()}
                  className="w-full px-4 sm:px-5 py-4 pr-10 rounded-xl text-base sm:text-lg border-2 transition-all"
                  style={{borderColor: '#007E8C', backgroundColor: 'white'}}
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
                className="btn-primary px-6 sm:px-8 py-4 text-white rounded-xl font-bold text-base sm:text-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-lg hover:shadow-xl transition-all touch-manipulation w-full sm:w-auto"
                style={{backgroundColor: '#007E8C', minHeight: '52px'}}
              >
                <i className="lucide-search w-5 h-5 sm:w-6 sm:h-6 mr-2"></i>
                {geocoding ? 'Searching...' : 'Search'}
              </button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-3">
              <button
                onClick={getCurrentLocation}
                className="px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all hover:shadow-md touch-manipulation"
                style={{backgroundColor: '#236383', color: 'white'}}
              >
                <i className="lucide-locate w-4 h-4"></i>
                Use My Current Location
              </button>
              <span className="text-xs text-center sm:text-left" style={{color: '#666'}}>
                or <button onClick={() => document.getElementById('resources-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="underline hover:no-underline" style={{color: '#007E8C'}}>need sandwich-making guides?</button>
              </span>
            </div>
            {userAddress && userCoords && (
              <div className="mt-3 p-3 rounded-lg" style={{backgroundColor: 'rgba(71, 179, 203, 0.1)'}}>
                <p className="text-sm font-medium" style={{color: '#236383'}}>
                  📍 Showing hosts near: <span className="font-semibold">{userAddress}</span>
                </p>
              </div>
            )}
          </div>

          {/* Simple View Toggle - Prominent */}
          <div className="flex flex-col items-center gap-3 mb-6 px-3">
            <button
              onClick={() => setSimpleView(!simpleView)}
              className="px-6 py-3 rounded-xl font-bold text-lg transition-all hover:shadow-lg"
              style={{
                backgroundColor: simpleView ? '#007E8C' : '#FBAD3F',
                color: 'white',
                minWidth: '280px'
              }}
            >
              {simpleView ? '← Back to Interactive Map View' : '📋 Switch to Simple List View'}
            </button>
            {!simpleView && (
              <p className="text-sm text-center" style={{color: '#666'}}>
                Prefer a simple list? Click above. Or use the search bar below to find a host.
              </p>
            )}
          </div>

          {/* Favorite Host Banner */}
          {favoriteHostId && (() => {
            const favoriteHost = allHosts.find(h => h.id === favoriteHostId);
            if (!favoriteHost) return null;
            return (
              <div className="mb-4 mx-3 sm:mx-4 p-4 rounded-xl border-2" style={{backgroundColor: '#FFF9E6', borderColor: '#FBAD3F'}}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">⭐</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-base sm:text-lg" style={{color: '#236383'}}>Your Saved Host</h4>
                      <button
                        onClick={() => toggleFavoriteHost(favoriteHostId)}
                        className="text-xs px-2 py-1 rounded hover:bg-orange-100 transition-colors"
                        style={{color: '#A31C41'}}
                      >
                        Change
                      </button>
                    </div>
                    <p className="font-semibold mb-3" style={{color: '#007E8C'}}>
                      {favoriteHost.name} ({favoriteHost.area}{favoriteHost.neighborhood ? ` - ${favoriteHost.neighborhood}` : ''})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setDirectionsMenuOpen(favoriteHostId)}
                        className="px-3 py-2 rounded-lg text-sm font-semibold hover:bg-orange-100 transition-all"
                        style={{color: '#007E8C', border: '2px solid #007E8C'}}
                      >
                        Get Directions
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}


          {/* Simple View - Plain list grouped by area */}
          {simpleView && (
            <div className="p-4">
              <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-center" style={{color: '#236383'}}>All Hosts by Area</h2>
                <p className="text-base mb-6 text-center" style={{color: '#666'}}>
                  Showing hosts collecting this week. Tap phone to call, or tap Directions.
                </p>

                {/* Search bar for simple view */}
                <div className="mb-6">
                  <input
                    type="text"
                    placeholder="🔍 Search by host name or area..."
                    value={nameSearch}
                    onChange={(e) => setNameSearch(e.target.value)}
                    className="w-full px-5 py-4 rounded-xl border-2 text-lg"
                    style={{borderColor: '#007E8C'}}
                  />
                </div>

                {(() => {
                  let availableHosts = allHosts.filter(h => h.available);
                  // Apply search filter
                  if (nameSearch.trim()) {
                    const searchLower = nameSearch.toLowerCase();
                    availableHosts = availableHosts.filter(h =>
                      h.name.toLowerCase().includes(searchLower) ||
                      h.area.toLowerCase().includes(searchLower) ||
                      (h.neighborhood && h.neighborhood.toLowerCase().includes(searchLower))
                    );
                  }
                  const areas = [...new Set(availableHosts.map(h => h.area))].sort();

                  if (availableHosts.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <p className="text-lg" style={{color: '#666'}}>No hosts found matching "{nameSearch}"</p>
                      </div>
                    );
                  }

                  return areas.map(area => (
                    <div key={area} className="mb-8">
                      <h3 className="font-bold text-xl sm:text-2xl mb-4 pb-3 border-b-3" style={{color: '#007E8C', borderBottom: '3px solid #007E8C'}}>{area}</h3>
                      <div className="space-y-4">
                        {availableHosts.filter(h => h.area === area).map(host => {
                          const timeAvail = checkHostTimeAvailability(host, dropOffTime);
                          return (
                          <div key={host.id} className="flex flex-col gap-3 p-4 rounded-xl hover:bg-gray-50 border border-gray-200">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                              <div className="flex-1">
                                <span className="font-bold text-lg" style={{color: '#236383'}}>{host.name}</span>
                                {host.neighborhood && <span className="text-base text-gray-500 ml-2">({host.neighborhood})</span>}
                                <div className="text-base mt-1" style={{color: '#555'}}>
                                  {formatCondensedHours(host)}
                                  {timeAvail.warning && (
                                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${timeAvail.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                      ⚠️ {timeAvail.warning}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <a
                                href={`tel:${host.phone}`}
                                className="font-bold text-lg px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                                style={{color: '#007E8C'}}
                              >
                                📞 {host.phone}
                              </a>
                              <button
                                onClick={() => openGoogleMapsDirections(host)}
                                className="px-5 py-3 rounded-lg font-bold text-base text-white hover:shadow-md transition-all"
                                style={{backgroundColor: '#007E8C'}}
                              >
                                📍 Directions
                              </button>
                            </div>
                            {host.notes && (
                              <div className="p-3 rounded-lg" style={{backgroundColor: 'rgba(163, 28, 65, 0.08)'}}>
                                <div className="flex items-start gap-2">
                                  <span className="text-base">⚠️</span>
                                  <div>
                                    <span className="font-bold text-sm" style={{color: '#A31C41'}}>Special Instructions: </span>
                                    <span className="text-sm" style={{color: '#236383'}}>{host.notes}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );})}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

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
                      {showAllHostsOnMap ? `Showing All ${allHostsForDisplay.length} Hosts` : 'Show Closest 3 Available Hosts'}
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
                  {(() => {
                    const hostsForMap = includeUnavailableHosts ? allHostsForDisplay : allHostsForDisplay.filter(h => h.available);
                    if (hostsForMap.length === 0) {
                      return (
                        <div className="mb-3 p-3 rounded-lg border-2" style={{backgroundColor: '#FFF9E6', borderColor: '#FBAD3F'}}>
                          <p className="text-sm font-medium mb-1" style={{color: '#236383'}}>
                            No hosts available
                          </p>
                          <p className="text-xs" style={{color: '#666'}}>
                            No hosts are collecting this week. If you need to plan for another week, enter your address and select "I'm planning a future dropoff (not this week)" to see all host locations.
                          </p>
                        </div>
                      );
                    }
                    return (
                      <p className="text-sm font-medium mb-3" style={{color: '#007E8C'}}>
                        💡 Enter your address or use location to see distances and get directions
                      </p>
                    );
                  })()}
                </>
              )}

                {showingDirections && routeInfo && (() => {
                  const hostForRoute = allHostsForDisplay.find(h => h.id === showingDirections);
                  const isUnavailable = hostForRoute && !hostForRoute.available;
                  return (
                  <div className="mt-3 p-4 rounded-lg" style={{backgroundColor: isUnavailable ? '#fee2e2' : '#E6F7FF', borderColor: isUnavailable ? '#dc2626' : '#007E8C', border: '1px solid'}}>
                    {isUnavailable && (
                      <div className="mb-3 p-2 rounded-lg border-2" style={{backgroundColor: '#fee2e2', borderColor: '#dc2626'}}>
                        <p className="text-sm font-bold text-center" style={{color: '#dc2626'}}>
                          ⚠️ WARNING: This host is NOT collecting this week. You cannot drop off sandwiches here.
                        </p>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-medium" style={{color: isUnavailable ? '#dc2626' : '#007E8C'}}>
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
                        onClick={() => openGoogleMapsDirections(allHostsForDisplay.find(h => h.id === showingDirections))}
                        className="text-sm px-4 py-2 rounded flex items-center"
                        style={{backgroundColor: '#007E8C', color: 'white'}}
                      >
                        <i className="lucide-external-link w-4 h-4 mr-1"></i>
                        Open in Google Maps
                      </button>
                    </div>
                  </div>
                  );
                })()}
              </div>
              <div className="relative">
                {/* Mobile optimization: Responsive map height for small screens */}
                <div id="map" className="h-64 sm:h-80 md:h-96 lg:h-[calc(100vh-400px)]"></div>

                {/* Map Tooltip */}
                {mapTooltip && (
                  <div
                    className="absolute bg-white rounded-xl shadow-2xl p-3 z-10 border-2"
                    style={{
                      top: '20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      // Mobile optimization: Responsive tooltip width
                      minWidth: 'min(300px, 85vw)',
                      maxWidth: 'min(340px, calc(100vw - 40px))',
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
                        className="text-gray-400 hover:text-gray-600 ml-2 text-2xl leading-none flex items-center justify-center"
                        style={{minWidth: '44px', minHeight: '44px', padding: '8px'}}
                        title="Close"
                      >
                        ×
                      </button>
                    </div>

                    {/* Availability Warning */}
                    {!mapTooltip.available && (
                      <div className="mb-3 p-3 rounded-lg border-2" style={{backgroundColor: '#fee2e2', borderColor: '#dc2626'}}>
                        <p className="text-sm font-bold text-center" style={{color: '#dc2626'}}>
                          ⚠️ NOT COLLECTING THIS WEEK
                        </p>
                        <p className="text-xs text-center mt-1" style={{color: '#991b1b'}}>
                          You cannot drop off sandwiches here this week. Please choose a host marked as "Collecting This Week".
                        </p>
                      </div>
                    )}

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
                      {(() => {
                        const now = new Date();
                        const currentDay = now.getDay();
                        let openTime, dayName;
                        if (currentDay === 2 && tuesdayEnabled) {
                          openTime = mapTooltip.tuesdayOpenTime || mapTooltip.openTime;
                          dayName = 'Tuesday';
                        } else if (currentDay === 3) {
                          openTime = mapTooltip.wednesdayOpenTime || mapTooltip.openTime;
                          dayName = 'Wednesday';
                        } else {
                          // Default to Wednesday
                          openTime = mapTooltip.wednesdayOpenTime || mapTooltip.openTime;
                          dayName = 'Wednesday';
                        }
                        return (
                          <p className="text-xs" style={{color: '#666'}}>
                            Opens {dayName} at {formatTime(openTime)}
                          </p>
                        );
                      })()}
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
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border-2 z-[100] overflow-hidden" style={{borderColor: '#007E8C', width: '100%', maxWidth: '100%'}}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!mapTooltip.available) {
                                  alert('⚠️ IMPORTANT: This host is NOT collecting this week. You cannot drop off sandwiches here. Please choose a host marked as "Collecting This Week" instead.');
                                  setMapTooltipMenuOpen(false);
                                  return;
                                }
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
                                if (!mapTooltip.available) {
                                  alert('⚠️ IMPORTANT: This host is NOT collecting this week. You cannot drop off sandwiches here. Please choose a host marked as "Collecting This Week" instead.');
                                  setMapTooltipMenuOpen(false);
                                  return;
                                }
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
                                if (!mapTooltip.available) {
                                  alert('⚠️ IMPORTANT: This host is NOT collecting this week. You cannot drop off sandwiches here. Please choose a host marked as "Collecting This Week" instead.');
                                  setMapTooltipMenuOpen(false);
                                  return;
                                }
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
                        onClick={copyDirections}
                        className="text-sm px-4 py-2 rounded-lg font-medium text-white flex items-center"
                        style={{backgroundColor: '#007E8C'}}
                        title="Copy directions to clipboard"
                      >
                        <i className="lucide-copy w-4 h-4 mr-1.5"></i>
                        Copy Directions
                      </button>
                    </div>

                    {/* Host Hours Banner */}
                    {(() => {
                      const now = new Date();
                      const currentDay = now.getDay();
                      const currentHour = now.getHours();
                      const currentMinutes = now.getMinutes();
                      const currentTime = currentHour * 60 + currentMinutes;

                      // Tuesday is day 2 (only if enabled), Wednesday is day 3 (always)
                      const isCollectionDay = (currentDay === 2 && tuesdayEnabled) || currentDay === 3;

                      // Get day-specific hours
                      let openTime, closeTime, dayName;
                      if (currentDay === 2 && tuesdayEnabled) {
                        openTime = routeInfo.tuesdayOpenTime || routeInfo.openTime;
                        closeTime = routeInfo.tuesdayCloseTime || routeInfo.closeTime;
                        dayName = 'Tuesday';
                      } else if (currentDay === 3) {
                        openTime = routeInfo.wednesdayOpenTime || routeInfo.openTime;
                        closeTime = routeInfo.wednesdayCloseTime || routeInfo.closeTime;
                        dayName = 'Wednesday';
                      } else {
                        // Default to Wednesday if not a collection day
                        openTime = routeInfo.wednesdayOpenTime || routeInfo.openTime;
                        closeTime = routeInfo.wednesdayCloseTime || routeInfo.closeTime;
                        dayName = 'Wednesday';
                      }

                      // Convert HH:MM format to minutes
                      const timeToMinutes = (timeStr) => {
                        if (typeof timeStr === 'number') return timeStr;
                        if (!timeStr) return 0;
                        const [hours, mins] = timeStr.split(':').map(Number);
                        return hours * 60 + mins;
                      };

                      const openMinutes = timeToMinutes(openTime);
                      const closeMinutes = timeToMinutes(closeTime);
                      const isCurrentlyOpen = isCollectionDay && currentTime >= openMinutes && currentTime < closeMinutes;

                      // Format time helper (same as formatTime in the main app)
                      const formatTimeForBanner = (minutes) => {
                        if (!minutes && minutes !== 0) return '';
                        const hours = Math.floor(minutes / 60);
                        const mins = minutes % 60;
                        const period = hours >= 12 ? 'pm' : 'am';
                        const displayHour = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
                        return mins > 0 ? `${displayHour}:${mins.toString().padStart(2, '0')}${period}` : `${displayHour}${period}`;
                      };

                      const openTimeStr = formatTimeForBanner(openMinutes);
                      const closeTimeStr = formatTimeForBanner(closeMinutes);

                      return (
                        <div
                          className="mb-4 p-3 rounded-lg border-2"
                          style={{
                            backgroundColor: isCurrentlyOpen ? 'rgba(34, 197, 94, 0.1)' : 'rgba(251, 173, 63, 0.15)',
                            borderColor: isCurrentlyOpen ? 'rgba(34, 197, 94, 0.4)' : '#FBAD3F'
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-lg flex-shrink-0">
                              {isCurrentlyOpen ? '✅' : '⏰'}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm font-bold mb-1" style={{color: '#236383'}}>
                                {isCurrentlyOpen
                                  ? `Open now · Closes at ${closeTimeStr}`
                                  : `Opens ${dayName} at ${openTimeStr}`
                                }
                              </p>
                              <p className="text-xs" style={{color: '#666'}}>
                                Host Hours: {routeInfo.hours}
                                {!isCurrentlyOpen && ' · Drop-off must occur during listed hours'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
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
            {/* Planning for next week - collapsible accordion */}
            <details className="mb-4 rounded-lg border border-gray-200 bg-gray-50">
              <summary className="px-4 py-2 cursor-pointer text-sm font-medium flex items-center gap-2" style={{color: '#666'}}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Planning for next week?
                {includeUnavailableHosts && <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">Showing closed hosts</span>}
              </summary>
              <div className="px-4 pb-3 pt-2 border-t border-gray-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeUnavailableHosts}
                    onChange={(e) => setIncludeUnavailableHosts(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    style={{accentColor: '#007E8C'}}
                  />
                  <span className="text-sm" style={{color: '#555'}}>
                    Include hosts not collecting this week
                  </span>
                </label>
                {includeUnavailableHosts && (
                  <p className="mt-2 text-xs p-2 rounded" style={{backgroundColor: '#FFF9E6', color: '#92400e'}}>
                    ⚠️ Closed hosts shown for planning only. Check back Monday to confirm availability.
                  </p>
                )}
              </div>
            </details>
            {/* Search Bar for Host List */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by host name or area..."
                  value={nameSearch}
                  onChange={(e) => setNameSearch(e.target.value)}
                  className="w-full px-4 py-3 pl-10 rounded-lg border-2 border-gray-200 focus:border-blue-400 focus:outline-none text-base"
                  style={{backgroundColor: 'white'}}
                />
                <svg 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {nameSearch && (
                  <button
                    onClick={() => setNameSearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="Clear search"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Feedback prompt */}
            <div className="mb-4 p-3 rounded-xl text-center" style={{backgroundColor: '#F0F9FA', border: '1px solid #007E8C'}}>
              <button
                onClick={() => setShowFeedback(true)}
                className="font-semibold hover:underline"
                style={{color: '#236383'}}
              >
                Give Feedback
              </button>
              <p className="text-xs mt-1" style={{color: '#666'}}>
                Let us know how we can make this work better for you!
              </p>
            </div>

            {filteredHosts.length === 0 ? (
              <div className="bg-white rounded-2xl premium-card p-12 text-center">
                <p className="text-lg font-medium text-gray-500">
                  {dropOffTime
                    ? `No hosts are open at ${formatTime(dropOffTime)}. Try a different time or clear the filter.`
                    : 'No hosts found in this area.'}
                </p>
                {dropOffTime && (
                  <button
                    onClick={() => setDropOffTime('')}
                    className="mt-4 px-4 py-2 rounded-lg font-medium text-white"
                    style={{backgroundColor: '#007E8C'}}
                  >
                    Clear Time Filter
                  </button>
                )}
              </div>
            ) : (
              filteredHosts.map((host, index) => {
                // Calculate actual distance rank from sortedHosts (not filtered index)
                const actualRank = userCoords && viewMode === 'proximity' && sortedHosts.length > 0
                  ? sortedHosts.findIndex(h => h.id === host.id) + 1
                  : null;
                const isTopThree = actualRank !== null && actualRank <= 3 && host.available;

                // Count how many available hosts are in the top 3 to know when to show divider
                const availableTopThreeCount = userCoords && viewMode === 'proximity' && sortedHosts.length > 0
                  ? sortedHosts.slice(0, 3).filter(h => h.available).length
                  : 0;

                // Show section headers based on position
                const showTopThreeHeader = userCoords && viewMode === 'proximity' && index === 0 && availableTopThreeCount > 0;
                const showOtherHostsHeader = userCoords && viewMode === 'proximity' && actualRank === availableTopThreeCount + 1;

                const isExpanded = expandedHosts.has(host.id);

                // Check time availability for warning
                const timeAvail = checkHostTimeAvailability(host, dropOffTime);
                const availability = getHostAvailability(host);
                const isOpenNow = availability && availability.status === 'open';

                return (
                <React.Fragment key={host.id}>
                  {/* Section header: Your 3 Closest Hosts */}
                  {showTopThreeHeader && (
                    <div className="mb-3">
                      <h2 className="text-lg font-bold" style={{color: '#236383'}}>
                        Your {availableTopThreeCount} Closest Host{availableTopThreeCount !== 1 ? 's' : ''}
                      </h2>
                      <p className="text-sm" style={{color: '#666'}}>
                        Based on {userAddress || 'your location'}
                      </p>
                    </div>
                  )}
                  {/* Section header: All Other Hosts */}
                  {showOtherHostsHeader && (
                    <div className="mt-6 mb-3 pt-4 border-t-2" style={{borderColor: '#e5e7eb'}}>
                      <h2 className="text-base font-semibold" style={{color: '#666'}}>
                        All Other Hosts Collecting This Week
                      </h2>
                    </div>
                  )}
                <div
                  data-host-id={host.id}
                  className={`bg-white rounded-2xl premium-card transition-all border-2 ${
                    host.available 
                      ? 'border-transparent md:hover:border-blue-200' 
                      : 'border-red-200 bg-red-50/30'
                  } ${
                    host.available ? 'md:hover:shadow-xl md:cursor-pointer' : 'opacity-75'
                  } ${
                    isTopThree
                      ? `top-host-card top-host-${actualRank}`
                      : ''
                  } ${highlightedHostId === host.id ? 'ring-4 ring-yellow-400 shadow-xl' : ''}`}
                >
                  {/* Collapsed View (Default) */}
                  {!isExpanded ? (
                    <div className="p-4 md:p-5">
                      {/* Header Row: Rank Badge, Name, Favorite */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {isTopThree && (
                            <span className={`w-9 h-9 rank-badge rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0 ${
                              actualRank === 1 ? 'bg-yellow-500' : actualRank === 2 ? 'bg-gray-400' : 'bg-amber-600'
                            }`}>
                              {actualRank}
                            </span>
                          )}
                          <h3 className={`font-bold text-lg ${!host.available ? 'opacity-60' : ''}`}>
                            {host.name}
                          </h3>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavoriteHost(host.id);
                          }}
                          className="flex-shrink-0 p-1 rounded-lg transition-all hover:bg-gray-100 ml-2"
                          title={favoriteHostId === host.id ? 'Remove from favorites' : 'Save as my host'}
                        >
                          {favoriteHostId === host.id ? (
                            <span className="text-lg">⭐</span>
                          ) : (
                            <span className="text-lg opacity-30 hover:opacity-60">⭐</span>
                          )}
                        </button>
                      </div>

                      {/* Location Badges: Area and Neighborhood */}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium" style={{backgroundColor: '#236383', color: '#fff'}}>
                          {host.area}
                        </span>
                        {host.neighborhood && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium" style={{backgroundColor: '#007e8c', color: '#fff'}}>
                            {host.neighborhood}
                          </span>
                        )}
                      </div>

                      {/* Info Line: Hours • Status • Distance/Drive Time */}
                      <div className="flex flex-col gap-2 mb-3">
                        <div className="flex items-center flex-wrap gap-x-1 text-base">
                          <span className="font-medium" style={{color: '#555'}}>{formatAllCollectionHours(host)}</span>
                          <span className="text-gray-400">•</span>
                          {host.available ? (
                            <span className="font-semibold" style={{color: '#47bc3b'}}>Collecting This Week</span>
                          ) : (
                            <span className="font-semibold" style={{color: '#dc2626'}}>NOT Collecting</span>
                          )}
                        {userCoords && host.distance && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span style={{color: '#007E8C'}}>{host.distance} mi</span>
                            {hostDriveTimes[host.id] && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span style={{color: '#007E8C'}}>{hostDriveTimes[host.id]}</span>
                              </>
                            )}
                          </>
                        )}
                        {isOpenNow && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="font-bold" style={{color: '#47bc3b'}}>OPEN NOW</span>
                          </>
                        )}
                        </div>
                        {timeAvail.warning && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className={`font-bold ${timeAvail.severity === 'high' ? 'text-red-600' : 'text-yellow-600'}`}>
                              ⚠️ {timeAvail.warning}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Phone Number */}
                      <a
                        href={`tel:${host.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 text-sm mb-2 hover:underline"
                        style={{color: '#236383'}}
                      >
                        <i className="lucide-phone w-4 h-4"></i>
                        {host.phone}
                      </a>

                      {/* Notes */}
                      {host.notes && (
                        <p className="text-sm text-gray-600 mb-3 italic">
                          {host.notes}
                        </p>
                      )}

                      {/* Get Directions Button - Dropdown Menu */}
                      <div className="relative" data-directions-menu style={{zIndex: directionsMenuOpen === host.id ? 1000 : 'auto'}}>
                        <button
                          ref={directionsMenuOpen === host.id ? directionsButtonRef : null}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!host.available) {
                              alert('⚠️ This host is NOT collecting this week.');
                              return;
                            }
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
                          disabled={!host.available}
                          className={`w-full px-4 py-3 rounded-lg font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all ${
                            host.available ? 'hover:shadow-md' : 'opacity-50 cursor-not-allowed'
                          }`}
                          style={{backgroundColor: '#007E8C', minHeight: '48px'}}
                          title={!host.available ? 'This host is not collecting this week' : 'Choose your maps app'}
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
                            {userCoords && (
                              <>
                                {showingDirections === host.id ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      clearDirections();
                                      setDirectionsMenuOpen(null);
                                    }}
                                    className="w-full px-5 py-4 hover:bg-gray-50 flex flex-col items-center justify-center gap-2 transition-colors text-center"
                                  >
                                    <div className="flex items-center justify-center gap-3 mb-1">
                                      <i className="lucide-x w-6 h-6" style={{color: '#007E8C'}}></i>
                                      <div className="font-bold text-base" style={{color: '#236383'}}>Clear Route</div>
                                    </div>
                                    <div className="text-sm text-gray-600">Remove route from map</div>
                                  </button>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!host.available) {
                                        alert('⚠️ IMPORTANT: This host is NOT collecting this week. You cannot drop off sandwiches here. Please choose a host marked as "Collecting This Week" instead.');
                                        setDirectionsMenuOpen(null);
                                        return;
                                      }
                                      showDirections(host);
                                      setDirectionsMenuOpen(null);
                                    }}
                                    className="w-full px-5 py-4 hover:bg-gray-50 flex flex-col items-center justify-center gap-2 transition-colors text-center"
                                  >
                                    <div className="flex items-center justify-center gap-3 mb-1">
                                      <i className="lucide-route w-6 h-6" style={{color: '#007E8C'}}></i>
                                      <div className="font-bold text-base" style={{color: '#236383'}}>Show Directions In-App</div>
                                    </div>
                                    <div className="text-sm text-gray-600">View turn-by-turn directions below map</div>
                                  </button>
                                )}
                              </>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openGoogleMapsDirections(host);
                                setDirectionsMenuOpen(null);
                              }}
                              className={`w-full px-5 py-4 hover:bg-gray-50 flex flex-col items-center justify-center gap-2 transition-colors text-center ${userCoords ? 'border-t' : ''}`}
                              style={userCoords ? {borderColor: '#e0e0e0'} : {}}
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
                                setDirectionsMenuOpen(null);
                              }}
                              className="w-full px-5 py-4 hover:bg-gray-50 flex flex-col items-center justify-center gap-2 transition-colors text-center border-t" style={{borderColor: '#e0e0e0'}}
                            >
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
                    </div>
                  ) : (
                    /* Expanded View */
                    <div className="p-6 md:p-8">
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
                            <div className="flex items-center gap-3 flex-wrap">
                              {isTopThree && (
                                <span className={`w-11 h-11 rank-badge rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0 ${
                                  actualRank === 1 ? 'bg-yellow-500' : actualRank === 2 ? 'bg-gray-400' : 'bg-amber-600'
                                }`}>
                                  {actualRank}
                                </span>
                              )}
                              <h3 className={`font-bold text-2xl flex-1 ${!host.available ? 'opacity-60' : ''}`}>{host.name}</h3>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavoriteHost(host.id);
                                }}
                                className="flex-shrink-0 p-2 rounded-lg transition-all hover:bg-gray-100"
                                title={favoriteHostId === host.id ? 'Remove from favorites' : 'Save as my host'}
                              >
                                {favoriteHostId === host.id ? (
                                  <span className="text-2xl">⭐</span>
                                ) : (
                                  <span className="text-2xl opacity-30 hover:opacity-60">⭐</span>
                                )}
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="relative" data-directions-menu style={{zIndex: directionsMenuOpen === host.id ? 1000 : 'auto'}}>
                            <button
                              ref={directionsMenuOpen === host.id ? directionsButtonRef : null}
                              disabled={!host.available}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!host.available) {
                                  alert('This host is not collecting this week. Please choose a host marked as "Collecting This Week".');
                                  return;
                                }
                                const buttonRect = e.currentTarget.getBoundingClientRect();
                                const isOpening = directionsMenuOpen !== host.id;
                                setDirectionsMenuOpen(isOpening ? host.id : null);
                                if (isOpening) {
                                  const viewportWidth = window.innerWidth;
                                  const viewportHeight = window.innerHeight;
                                  const dropdownWidth = Math.min(280, viewportWidth - 32);
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
                              className={`btn-primary px-4 py-3 rounded-lg font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all touch-manipulation w-full ${
                                host.available ? 'hover:shadow-md' : 'opacity-50 cursor-not-allowed'
                              }`}
                              style={{backgroundColor: '#007E8C', minHeight: '48px'}}
                              title={!host.available ? 'This host is not collecting this week' : 'Choose your maps app'}
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
                                  width: 'min(280px, calc(100vw - 2rem))',
                                  maxWidth: 'calc(100vw - 2rem)',
                                  zIndex: 10000,
                                  top: `${directionsMenuPosition.top}px`,
                                  left: `${directionsMenuPosition.left}px`
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {userCoords && (
                                  <>
                                    {showingDirections === host.id ? (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          clearDirections();
                                          setDirectionsMenuOpen(null);
                                        }}
                                        className="w-full px-5 py-4 hover:bg-gray-50 flex flex-col items-center justify-center gap-2 transition-colors text-center"
                                      >
                                        <div className="flex items-center justify-center gap-3 mb-1">
                                          <i className="lucide-x w-6 h-6" style={{color: '#007E8C'}}></i>
                                          <div className="font-bold text-base" style={{color: '#236383'}}>Clear Route</div>
                                        </div>
                                        <div className="text-sm text-gray-600">Remove route from map</div>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!host.available) {
                                            alert('⚠️ IMPORTANT: This host is NOT collecting this week. You cannot drop off sandwiches here. Please choose a host marked as "Collecting This Week" instead.');
                                            setDirectionsMenuOpen(null);
                                            return;
                                          }
                                          showDirections(host);
                                          setDirectionsMenuOpen(null);
                                        }}
                                        className="w-full px-5 py-4 hover:bg-gray-50 flex flex-col items-center justify-center gap-2 transition-colors text-center"
                                      >
                                        <div className="flex items-center justify-center gap-3 mb-1">
                                          <i className="lucide-route w-6 h-6" style={{color: '#007E8C'}}></i>
                                          <div className="font-bold text-base" style={{color: '#236383'}}>Show Directions In-App</div>
                                        </div>
                                        <div className="text-sm text-gray-600">View turn-by-turn directions below map</div>
                                      </button>
                                    )}
                                  </>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openGoogleMapsDirections(host);
                                  }}
                                  className={`w-full px-5 py-4 hover:bg-gray-50 flex flex-col items-center justify-center gap-2 transition-colors text-center ${userCoords ? 'border-t' : ''}`}
                                  style={userCoords ? {borderColor: '#e0e0e0'} : {}}
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
                              if (!host.available) {
                                alert('This host is not collecting this week. Please choose a host marked as "Collecting This Week".');
                                return;
                              }
                              handleAddToCalendar(host);
                            }}
                            disabled={!host.available}
                            className={`btn-primary px-4 py-3 rounded-lg font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all touch-manipulation ${
                              host.available ? 'hover:shadow-md' : 'opacity-50 cursor-not-allowed'
                            }`}
                            style={{backgroundColor: '#236383', minHeight: '48px'}}
                            title={!host.available ? 'This host is not collecting this week' : 'Download an event reminder for this host'}
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
                              <div className="font-medium mb-2 flex flex-col gap-1" style={{color: '#007E8C'}}>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span>{formatAllCollectionHours(host)}</span>
                                  {(() => {
                                    const availability = getHostAvailability(host);
                                    if (availability && availability.status === 'open') {
                                      return (
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-bold text-white" style={{backgroundColor: '#47bc3b'}}>
                                          OPEN NOW
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                                {host.hours && host.hours !== formatAllCollectionHours(host) && (
                                  <div className="text-sm italic" style={{color: '#666'}}>
                                    {host.hours}
                                  </div>
                                )}
                                <div className={`px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1.5 ${
                                  host.available
                                    ? 'border-2'
                                    : 'bg-red-100 text-red-800 border-2 border-red-300'
                                }`}
                                style={host.available ? {
                                  backgroundColor: '#47b3cb',
                                  color: 'white',
                                  borderColor: '#47b3cb'
                                } : {}}>
                                  {host.available ? (
                                    <>
                                      <span className="text-base">✅</span>
                                      <span>Collecting This Week</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-base">❌</span>
                                      <span>NOT Collecting This Week</span>
                                    </>
                                  )}
                                </div>
                              </div>
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
                                    className="inline-block px-3 py-1.5 rounded-lg text-base font-bold mt-1"
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
                      
                      {/* Hide Details Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleHostExpanded(host.id);
                        }}
                        className="w-full mt-4 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:bg-gray-50 border-2"
                        style={{borderColor: '#007E8C', color: '#007E8C'}}
                      >
                        Hide Details
                      </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                </React.Fragment>
                );
              })
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
          <div className="modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50" onClick={() => setShowAdmin(false)}>
            <div className="modal-content bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto premium-card-header" onClick={e => e.stopPropagation()}>
              <div className="p-4 sm:p-8">
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
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                    <button
                      onClick={exportHosts}
                      className="w-full sm:w-auto px-4 py-2 rounded-lg font-medium text-white"
                      style={{backgroundColor: '#007E8C'}}
                    >
                      📤 Export JSON
                    </button>
                    <label className="w-full sm:w-auto px-4 py-2 rounded-lg font-medium text-white cursor-pointer text-center" style={{backgroundColor: '#FBAD3F'}}>
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
                      className="w-full sm:w-auto px-4 py-2 rounded-lg font-medium text-white"
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

                {/* Collection Days Toggle */}
                <div className="bg-blue-50 rounded-xl p-4 mb-6 border-2" style={{borderColor: '#236383'}}>
                  <h3 className="font-semibold mb-2" style={{color: '#236383'}}>📅 Collection Days</h3>
                  <p className="text-sm mb-3" style={{color: '#666'}}>
                    Normal schedule is <strong>Wednesday only</strong>. Enable Tuesday for special collections.
                  </p>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tuesdayEnabled}
                        onChange={(e) => setTuesdayEnabled(e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                      <span className="font-medium" style={{color: tuesdayEnabled ? '#007E8C' : '#666'}}>
                        {tuesdayEnabled ? '✅ Tuesday collections ARE happening this week' : '❌ Tuesday collections are OFF (normal)'}
                      </span>
                    </label>
                    <div className="flex items-center gap-3 pl-8">
                      <span className="font-medium" style={{color: '#007E8C'}}>
                        ✅ Wednesday collections (always on)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Special Collections Section */}
                <div className="bg-red-50 rounded-xl p-4 mb-6 border-2" style={{borderColor: '#A31C41'}}>
                  <h3 className="font-semibold mb-2" style={{color: '#A31C41'}}>🚨 Special Collections (Warming Centers, Emergencies)</h3>
                  <p className="text-sm mb-3" style={{color: '#666'}}>
                    Create temporary special collections that display separately from regular Wednesday collections. They auto-expire at the set end time.
                  </p>

                  {specialCollection ? (
                    <div className="bg-white rounded-lg p-4 mb-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold" style={{color: '#236383'}}>{specialCollection.name}</h4>
                          <p className="text-sm" style={{color: '#666'}}>{specialCollection.description}</p>
                        </div>
                        <span className="px-2 py-1 rounded text-xs font-bold text-white" style={{backgroundColor: '#22c55e'}}>ACTIVE</span>
                      </div>
                      <p className="text-xs mb-2" style={{color: '#007E8C'}}>
                        Ends: {new Date(specialCollection.endDate?.toDate ? specialCollection.endDate.toDate() : specialCollection.endDate).toLocaleString()}
                      </p>
                      <p className="text-xs mb-3" style={{color: '#666'}}>
                        {specialCollection.hosts?.length || 0} host(s) in this collection
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingSpecialCollection({...specialCollection})}
                          className="px-3 py-1 rounded text-sm font-medium text-white"
                          style={{backgroundColor: '#007E8C'}}
                        >
                          Edit Collection
                        </button>
                        <button
                          onClick={deactivateSpecialCollection}
                          className="px-3 py-1 rounded text-sm font-medium text-white"
                          style={{backgroundColor: '#A31C41'}}
                        >
                          End Early
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm mb-3 p-3 rounded-lg" style={{backgroundColor: '#f0f0f0', color: '#666'}}>
                      No active special collection. Create one below.
                    </p>
                  )}

                  <button
                    onClick={() => setEditingSpecialCollection({
                      name: '',
                      description: '',
                      displayStart: new Date().toISOString().slice(0, 16),
                      displayEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
                      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
                      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
                      hosts: []
                    })}
                    className="px-4 py-2 rounded-lg font-medium text-white"
                    style={{backgroundColor: '#A31C41'}}
                  >
                    + Create New Special Collection
                  </button>
                </div>

                {/* Emergency Hours Update */}
                <div className="bg-orange-50 rounded-xl p-4 mb-6 border-2" style={{borderColor: '#FBAD3F'}}>
                  <h3 className="font-semibold mb-2" style={{color: '#236383'}}>🚨 Emergency Collection Hours</h3>
                  <p className="text-sm mb-3" style={{color: '#666'}}>
                    Set all hosts' closing times for emergency collection:
                  </p>
                  <div className="text-sm mb-3" style={{color: '#236383'}}>
                    <strong>Tuesday:</strong> 6:30 PM (18:30)<br/>
                    <strong>Wednesday:</strong> 2:00 PM (14:00)
                  </div>
                  <button
                    onClick={updateAllEmergencyHours}
                    className="px-4 py-2 rounded-lg font-medium text-white"
                    style={{backgroundColor: '#A31C41'}}
                  >
                    ⚡ Update All Hosts' Closing Times
                  </button>
                </div>

                {/* One-time Coordinate Fix Button */}
                {userRole === 'admin' && (
                  <div className="bg-yellow-50 rounded-xl p-4 mb-6 border-2 border-yellow-300">
                    <h3 className="font-semibold mb-2" style={{color: '#A31C41'}}>🔧 One-Time Fix: Sync Corrected Coordinates</h3>
                    <p className="text-sm mb-3" style={{color: '#666'}}>
                      This will fix the coordinates for 8 hosts that have incorrect locations in the database.
                    </p>
                    <button
                      onClick={syncCoordinatesToFirestore}
                      className="px-4 py-2 rounded-lg font-medium text-white"
                      style={{backgroundColor: '#A31C41'}}
                    >
                      🗺️ Fix Coordinates Now
                    </button>
                  </div>
                )}

                {/* Add New Host Button */}
                <div className="mb-6">
                  <button
                    onClick={() => userRole === 'viewer' ? setShowReadOnlyModal(true) : setEditingHost({ id: 'new', name: '', area: '', neighborhood: '', lat: '', lng: '', phone: '', hours: '', tuesdayOpenTime: '', tuesdayCloseTime: '', wednesdayOpenTime: '08:00', wednesdayCloseTime: '20:00', openTime: '08:00', closeTime: '20:00', notes: '', available: true })}
                    className="px-6 py-3 rounded-xl font-semibold text-white"
                    style={{backgroundColor: '#007E8C', opacity: userRole === 'viewer' ? 0.7 : 1}}
                    title={userRole === 'viewer' ? 'Available to full admins. This reviewer account is read-only.' : 'Add a new host'}
                  >
                    ➕ Add New Host
                  </button>
                </div>

                {/* Hosts List */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg mb-3" style={{color: '#236383'}}>All Hosts ({(allHosts || []).length})</h3>
                  {(allHosts || []).map(host => (
                    <div key={host.id} className={`p-4 rounded-xl border-2 ${host.available ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-bold text-lg">{host.name}</h4>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              host.available ? '' : 'bg-red-100 text-red-800'
                            }`}
                            style={host.available ? {
                              backgroundColor: '#47bc3b',
                              color: 'white'
                            } : {}}>
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
                        <div className="flex flex-wrap gap-2 sm:justify-end">
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
          <div className="modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50" onClick={() => setEditingHost(null)}>
            <div className="modal-content bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto premium-card-header" onClick={e => e.stopPropagation()}>
              <div className="p-4 sm:p-8">
                <h3 className="text-2xl font-bold mb-6" style={{color: '#236383'}}>
                  {editingHost.id === 'new' ? '➕ Add New Host' : `✏️ Edit ${editingHost.name}`}
                </h3>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (userRole === 'viewer') {
                    setShowReadOnlyModal(true);
                    return;
                  }
                  const formData = new FormData(e.target);
                  const hostData = {
                    name: formData.get('name'),
                    area: formData.get('area'),
                    neighborhood: formData.get('neighborhood') || '',
                    lat: formData.get('lat'),
                    lng: formData.get('lng'),
                    phone: formData.get('phone'),
                    hours: formData.get('hours'),
                    tuesdayOpenTime: formData.get('tuesdayOpenTime'),
                    tuesdayCloseTime: formData.get('tuesdayCloseTime'),
                    wednesdayOpenTime: formData.get('wednesdayOpenTime'),
                    wednesdayCloseTime: formData.get('wednesdayCloseTime'),
                    // Keep openTime/closeTime for backward compatibility (default to Wednesday)
                    openTime: formData.get('wednesdayOpenTime') || formData.get('openTime'),
                    closeTime: formData.get('wednesdayCloseTime') || formData.get('closeTime'),
                    thursdayOpenTime: formData.get('thursdayOpenTime') || '',
                    thursdayCloseTime: formData.get('thursdayCloseTime') || '',
                    notes: formData.get('notes') || '',
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
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold mb-2" style={{color: '#236383'}}>Tuesday Open Time (optional)</label>
                        <input
                          type="time"
                          name="tuesdayOpenTime"
                          defaultValue={editingHost.tuesdayOpenTime || ''}
                          className="w-full px-4 py-3 premium-input rounded-xl"
                          placeholder="08:00"
                        />
                        <p className="text-xs mt-1" style={{color: '#007E8C'}}>Only needed if Tuesday collections are enabled</p>
                      </div>
                      <div>
                        <label className="block font-semibold mb-2" style={{color: '#236383'}}>Tuesday Close Time (optional)</label>
                        <input
                          type="time"
                          name="tuesdayCloseTime"
                          defaultValue={editingHost.tuesdayCloseTime || ''}
                          className="w-full px-4 py-3 premium-input rounded-xl"
                          placeholder="20:00"
                        />
                        <p className="text-xs mt-1" style={{color: '#007E8C'}}>Only needed if Tuesday collections are enabled</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold mb-2" style={{color: '#236383'}}>Wednesday Open Time</label>
                        <input
                          type="time"
                          name="wednesdayOpenTime"
                          defaultValue={editingHost.wednesdayOpenTime || editingHost.openTime}
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
                          name="wednesdayCloseTime"
                          defaultValue={editingHost.wednesdayCloseTime || editingHost.closeTime}
                          required
                          className="w-full px-4 py-3 premium-input rounded-xl"
                          placeholder="20:00"
                        />
                        <p className="text-xs mt-1" style={{color: '#007E8C'}}>24-hour format</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  
                  <div className="flex flex-col sm:flex-row gap-3 mt-8">
                    <button
                      type="submit"
                      className="w-full sm:flex-1 px-6 py-3 rounded-xl font-semibold text-white"
                      style={{backgroundColor: '#007E8C'}}
                    >
                    {editingHost.id === 'new' ? '➕ Add Host' : '💾 Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingHost(null)}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold"
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

        {/* Special Collection Edit Modal */}
        {editingSpecialCollection && (
          <div className="modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => { setEditingSpecialCollection(null); setEditingSpecialHost(null); }}>
            <div className="modal-content bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold" style={{color: '#A31C41'}}>
                    {editingSpecialCollection.id ? '✏️ Edit Special Collection' : '🚨 Create Special Collection'}
                  </h3>
                  <button
                    onClick={() => { setEditingSpecialCollection(null); setEditingSpecialHost(null); }}
                    className="text-2xl px-3 py-1 rounded-lg hover:bg-gray-100"
                    style={{color: '#A31C41'}}
                  >
                    ×
                  </button>
                </div>

                {/* Collection Details Form */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block font-semibold mb-1" style={{color: '#236383'}}>Collection Name *</label>
                    <input
                      type="text"
                      value={editingSpecialCollection.name}
                      onChange={(e) => setEditingSpecialCollection({...editingSpecialCollection, name: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border-2"
                      placeholder="e.g., Warming Center Emergency Collection"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1" style={{color: '#236383'}}>Description</label>
                    <textarea
                      value={editingSpecialCollection.description}
                      onChange={(e) => setEditingSpecialCollection({...editingSpecialCollection, description: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border-2"
                      placeholder="Brief description shown to users..."
                      rows={2}
                    />
                  </div>

                  {/* Display Window */}
                  <div className="p-3 rounded-lg" style={{backgroundColor: '#e8f5e9', border: '1px solid #c8e6c9'}}>
                    <h4 className="font-semibold mb-2" style={{color: '#2e7d32'}}>📺 Display Window</h4>
                    <p className="text-xs mb-2" style={{color: '#666'}}>When should this collection be visible on the website?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{color: '#236383'}}>Display From *</label>
                        <input
                          type="datetime-local"
                          value={(() => {
                            const d = editingSpecialCollection.displayStart;
                            if (!d) return '';
                            if (typeof d === 'string') return d.slice(0, 16);
                            const date = d.toDate ? d.toDate() : new Date(d);
                            if (isNaN(date.getTime())) return '';
                            // Format as local time for datetime-local input
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const hours = String(date.getHours()).padStart(2, '0');
                            const mins = String(date.getMinutes()).padStart(2, '0');
                            return `${year}-${month}-${day}T${hours}:${mins}`;
                          })()}
                          onChange={(e) => setEditingSpecialCollection({...editingSpecialCollection, displayStart: e.target.value})}
                          className="w-full px-3 py-2 rounded-lg border-2 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{color: '#236383'}}>Display Until *</label>
                        <input
                          type="datetime-local"
                          value={(() => {
                            const d = editingSpecialCollection.displayEnd;
                            if (!d) return '';
                            if (typeof d === 'string') return d.slice(0, 16);
                            const date = d.toDate ? d.toDate() : new Date(d);
                            if (isNaN(date.getTime())) return '';
                            // Format as local time for datetime-local input
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const hours = String(date.getHours()).padStart(2, '0');
                            const mins = String(date.getMinutes()).padStart(2, '0');
                            return `${year}-${month}-${day}T${hours}:${mins}`;
                          })()}
                          onChange={(e) => setEditingSpecialCollection({...editingSpecialCollection, displayEnd: e.target.value})}
                          className="w-full px-3 py-2 rounded-lg border-2 text-sm"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Collection Dates */}
                  <div className="p-3 rounded-lg" style={{backgroundColor: '#fff3e0', border: '1px solid #ffe0b2'}}>
                    <h4 className="font-semibold mb-2" style={{color: '#e65100'}}>📅 Collection Dates</h4>
                    <p className="text-xs mb-2" style={{color: '#666'}}>When does the actual collection happen? (shown to users)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{color: '#236383'}}>Collection Starts *</label>
                        <input
                          type="datetime-local"
                          value={(() => {
                            const d = editingSpecialCollection.startDate;
                            if (!d) return '';
                            if (typeof d === 'string') return d.slice(0, 16);
                            const date = d.toDate ? d.toDate() : new Date(d);
                            if (isNaN(date.getTime())) return '';
                            // Format as local time for datetime-local input
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const hours = String(date.getHours()).padStart(2, '0');
                            const mins = String(date.getMinutes()).padStart(2, '0');
                            return `${year}-${month}-${day}T${hours}:${mins}`;
                          })()}
                          onChange={(e) => setEditingSpecialCollection({...editingSpecialCollection, startDate: e.target.value})}
                          className="w-full px-3 py-2 rounded-lg border-2 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{color: '#236383'}}>Collection Ends *</label>
                        <input
                          type="datetime-local"
                          value={(() => {
                            const d = editingSpecialCollection.endDate;
                            if (!d) return '';
                            if (typeof d === 'string') return d.slice(0, 16);
                            const date = d.toDate ? d.toDate() : new Date(d);
                            if (isNaN(date.getTime())) return '';
                            // Format as local time for datetime-local input
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const hours = String(date.getHours()).padStart(2, '0');
                            const mins = String(date.getMinutes()).padStart(2, '0');
                            return `${year}-${month}-${day}T${hours}:${mins}`;
                          })()}
                          onChange={(e) => setEditingSpecialCollection({...editingSpecialCollection, endDate: e.target.value})}
                          className="w-full px-3 py-2 rounded-lg border-2 text-sm"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bulk Time Editing */}
                {editingSpecialCollection.hosts?.length > 0 && (
                  <div className="border-t pt-4 mb-4">
                    <h4 className="font-bold mb-3" style={{color: '#236383'}}>⏰ Bulk Time Edit</h4>
                    <p className="text-sm mb-3" style={{color: '#666'}}>Set the same hours for all hosts in this collection:</p>
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{color: '#236383'}}>Open Time</label>
                        <input
                          type="time"
                          id="bulkOpenTime"
                          defaultValue="08:00"
                          className="px-3 py-2 rounded-lg border-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{color: '#236383'}}>Close Time</label>
                        <input
                          type="time"
                          id="bulkCloseTime"
                          defaultValue="18:00"
                          className="px-3 py-2 rounded-lg border-2"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const openTime = document.getElementById('bulkOpenTime').value;
                          const closeTime = document.getElementById('bulkCloseTime').value;
                          if (!openTime || !closeTime) {
                            alert('Please set both open and close times');
                            return;
                          }
                          const updatedHosts = editingSpecialCollection.hosts.map(host => ({
                            ...host,
                            openTime,
                            closeTime,
                            hours: `${openTime} - ${closeTime}`
                          }));
                          setEditingSpecialCollection({...editingSpecialCollection, hosts: updatedHosts});
                          alert(`Updated all ${updatedHosts.length} hosts to ${openTime} - ${closeTime}`);
                        }}
                        className="px-4 py-2 rounded-lg font-medium text-white"
                        style={{backgroundColor: '#FBAD3F'}}
                      >
                        Apply to All Hosts
                      </button>
                    </div>
                  </div>
                )}

                {/* Copy from Existing Hosts */}
                <div className="border-t pt-4 mb-4">
                  <h4 className="font-bold mb-3" style={{color: '#236383'}}>📋 Select Hosts from Main List</h4>
                  <p className="text-sm mb-3" style={{color: '#666'}}>Check the hosts you want to include in this special collection:</p>
                  <div className="max-h-48 overflow-y-auto border-2 rounded-lg p-2 mb-3" style={{borderColor: '#e0e0e0'}}>
                    {(allHosts || []).filter(h => h.available).map(host => {
                      const alreadyAdded = editingSpecialCollection.hosts?.some(sh => sh.sourceId === host.id || sh.name === host.name);
                      return (
                        <label key={host.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 ${alreadyAdded ? 'opacity-50' : ''}`}>
                          <input
                            type="checkbox"
                            checked={alreadyAdded}
                            disabled={alreadyAdded}
                            onChange={(e) => {
                              if (e.target.checked && !alreadyAdded) {
                                const newHost = {
                                  id: Date.now(),
                                  sourceId: host.id,
                                  name: host.name,
                                  area: host.area,
                                  neighborhood: host.neighborhood || '',
                                  lat: host.lat,
                                  lng: host.lng,
                                  phone: host.phone || '',
                                  hours: '08:00 - 18:00',
                                  openTime: '08:00',
                                  closeTime: '18:00',
                                  notes: host.notes || ''
                                };
                                setEditingSpecialCollection({
                                  ...editingSpecialCollection,
                                  hosts: [...(editingSpecialCollection.hosts || []), newHost]
                                });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <div className="flex-1">
                            <span className="font-medium" style={{color: '#236383'}}>{host.name}</span>
                            <span className="text-sm ml-2" style={{color: '#666'}}>{host.area}</span>
                          </div>
                          {alreadyAdded && <span className="text-xs px-2 py-1 rounded" style={{backgroundColor: '#e8f5e9', color: '#2e7d32'}}>Added</span>}
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs" style={{color: '#666'}}>
                    💡 Tip: After adding hosts, use Bulk Time Edit above to set their hours for this special collection.
                  </p>
                </div>

                {/* Hosts Section */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold" style={{color: '#236383'}}>Collection Hosts ({editingSpecialCollection.hosts?.length || 0})</h4>
                    <button
                      type="button"
                      onClick={() => setEditingSpecialHost({ id: 'new', name: '', area: '', neighborhood: '', lat: '', lng: '', phone: '', hours: '', openTime: '08:00', closeTime: '18:00', notes: '' })}
                      className="px-3 py-1 rounded text-sm font-medium text-white"
                      style={{backgroundColor: '#007E8C'}}
                    >
                      + Add New Host
                    </button>
                  </div>

                  {editingSpecialCollection.hosts?.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                      {editingSpecialCollection.hosts.map((host) => (
                        <div key={host.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 rounded-lg gap-2" style={{backgroundColor: '#f0f9fa'}}>
                          <div>
                            <span className="font-medium" style={{color: '#236383'}}>{host.name}</span>
                            <span className="text-sm ml-2" style={{color: '#666'}}>{host.area}</span>
                            <span className="text-sm ml-2" style={{color: '#007E8C'}}>{host.openTime} - {host.closeTime}</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingSpecialHost(host)}
                              className="text-sm px-2 py-1 rounded"
                              style={{backgroundColor: '#007E8C', color: 'white'}}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSpecialHost(host.id)}
                              className="text-sm px-2 py-1 rounded"
                              style={{backgroundColor: '#A31C41', color: 'white'}}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm p-3 rounded-lg mb-4" style={{backgroundColor: '#f0f0f0', color: '#666'}}>
                      No hosts added yet. Add hosts for this special collection.
                    </p>
                  )}
                </div>

                {/* Visual Preview */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-bold mb-3" style={{color: '#236383'}}>👁️ Preview</h4>
                  <p className="text-sm mb-3" style={{color: '#666'}}>This is how the banner will appear to users:</p>
                  <div className="rounded-2xl overflow-hidden" style={{border: '3px solid #A31C41', boxShadow: '0 4px 20px rgba(163, 28, 65, 0.2)'}}>
                    {/* Header */}
                    <div className="p-4" style={{backgroundColor: '#A31C41'}}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                            <span>🚨</span> {editingSpecialCollection.name || 'Collection Name'}
                          </h2>
                          {editingSpecialCollection.description && (
                            <p className="text-sm text-white opacity-90 mt-1">{editingSpecialCollection.description}</p>
                          )}
                        </div>
                        <div className="text-white text-sm font-semibold px-3 py-1 rounded-lg" style={{backgroundColor: 'rgba(255,255,255,0.2)'}}>
                          {(() => {
                            if (!editingSpecialCollection.endDate) return 'Set end time';
                            const endDate = new Date(editingSpecialCollection.endDate);
                            const now = new Date();
                            const hoursRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60)));
                            return hoursRemaining > 1 ? `Ends in ${hoursRemaining} hours` : 'Ending soon';
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Hosts */}
                    <div className="p-4" style={{backgroundColor: '#FFF5F7'}}>
                      {editingSpecialCollection.hosts?.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {editingSpecialCollection.hosts.slice(0, 4).map((host) => (
                            <div key={host.id} className="bg-white rounded-xl p-3 shadow-sm" style={{border: '1px solid #f0c0c0'}}>
                              <h4 className="font-bold text-sm mb-1" style={{color: '#236383'}}>{host.name}</h4>
                              <p className="text-xs mb-1" style={{color: '#666'}}>{host.area}{host.neighborhood ? ` - ${host.neighborhood}` : ''}</p>
                              <span className="text-xs font-semibold" style={{color: '#007E8C'}}>
                                {formatTime(host.openTime)} - {formatTime(host.closeTime)}
                              </span>
                            </div>
                          ))}
                          {editingSpecialCollection.hosts.length > 4 && (
                            <div className="text-sm p-3 text-center" style={{color: '#666'}}>
                              +{editingSpecialCollection.hosts.length - 4} more hosts...
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-center py-4 text-sm" style={{color: '#666'}}>No hosts added yet</p>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 text-center text-xs" style={{backgroundColor: '#f0c0c0', color: '#A31C41'}}>
                      <strong>⏰ This is a temporary collection.</strong> Ends at {editingSpecialCollection.endDate ? new Date(editingSpecialCollection.endDate).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '(set end time)'}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => { setEditingSpecialCollection(null); setEditingSpecialHost(null); }}
                    className="px-6 py-2 rounded-lg font-medium"
                    style={{backgroundColor: '#f0f0f0'}}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editingSpecialCollection.name || !editingSpecialCollection.startDate || !editingSpecialCollection.endDate) {
                        alert('Please fill in all required fields (name, start date, end date)');
                        return;
                      }
                      if (editingSpecialCollection.hosts?.length === 0) {
                        if (!confirm('This collection has no hosts. Continue anyway?')) return;
                      }
                      saveSpecialCollection(editingSpecialCollection);
                    }}
                    className="px-6 py-2 rounded-lg font-medium text-white"
                    style={{backgroundColor: '#A31C41'}}
                  >
                    {editingSpecialCollection.id ? 'Update Collection' : 'Create Collection'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Special Host Edit Modal (nested) */}
        {editingSpecialHost && (
          <div className="modal-backdrop fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[60]" onClick={() => setEditingSpecialHost(null)}>
            <div className="modal-content bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <h4 className="text-lg font-bold mb-4" style={{color: '#236383'}}>
                  {editingSpecialHost.id === 'new' ? '➕ Add Host to Collection' : '✏️ Edit Host'}
                </h4>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const hostData = {
                    name: formData.get('name'),
                    area: formData.get('area'),
                    neighborhood: formData.get('neighborhood') || '',
                    lat: formData.get('lat'),
                    lng: formData.get('lng'),
                    phone: formData.get('phone') || '',
                    hours: `${formData.get('openTime')} - ${formData.get('closeTime')}`,
                    openTime: formData.get('openTime'),
                    closeTime: formData.get('closeTime'),
                    notes: formData.get('notes') || ''
                  };
                  if (editingSpecialHost.id === 'new') {
                    addSpecialHost(hostData);
                  } else {
                    updateSpecialHost(editingSpecialHost.id, hostData);
                  }
                }} className="space-y-3">
                  <div>
                    <label className="block font-semibold mb-1 text-sm" style={{color: '#236383'}}>Host Name *</label>
                    <input type="text" name="name" defaultValue={editingSpecialHost.name} required className="w-full px-3 py-2 rounded-lg border-2" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1 text-sm" style={{color: '#236383'}}>Area *</label>
                      <input type="text" name="area" defaultValue={editingSpecialHost.area} required className="w-full px-3 py-2 rounded-lg border-2" placeholder="e.g., Downtown" />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-sm" style={{color: '#236383'}}>Neighborhood</label>
                      <input type="text" name="neighborhood" defaultValue={editingSpecialHost.neighborhood} className="w-full px-3 py-2 rounded-lg border-2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1 text-sm" style={{color: '#236383'}}>Latitude *</label>
                      <input type="number" step="any" name="lat" defaultValue={editingSpecialHost.lat} required className="w-full px-3 py-2 rounded-lg border-2" />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-sm" style={{color: '#236383'}}>Longitude *</label>
                      <input type="number" step="any" name="lng" defaultValue={editingSpecialHost.lng} required className="w-full px-3 py-2 rounded-lg border-2" />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-sm" style={{color: '#236383'}}>Phone</label>
                    <input type="text" name="phone" defaultValue={editingSpecialHost.phone} className="w-full px-3 py-2 rounded-lg border-2" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1 text-sm" style={{color: '#236383'}}>Open Time *</label>
                      <input type="time" name="openTime" defaultValue={editingSpecialHost.openTime || '08:00'} required className="w-full px-3 py-2 rounded-lg border-2" />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-sm" style={{color: '#236383'}}>Close Time *</label>
                      <input type="time" name="closeTime" defaultValue={editingSpecialHost.closeTime || '18:00'} required className="w-full px-3 py-2 rounded-lg border-2" />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-sm" style={{color: '#236383'}}>Special Instructions</label>
                    <textarea name="notes" defaultValue={editingSpecialHost.notes} className="w-full px-3 py-2 rounded-lg border-2" rows={2} />
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3">
                    <button type="button" onClick={() => setEditingSpecialHost(null)} className="px-4 py-2 rounded-lg font-medium" style={{backgroundColor: '#f0f0f0'}}>
                      Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 rounded-lg font-medium text-white" style={{backgroundColor: '#007E8C'}}>
                      {editingSpecialHost.id === 'new' ? 'Add Host' : 'Update Host'}
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
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 px-4 sm:px-6 py-3 rounded-full font-bold text-white shadow-2xl hover:shadow-3xl transition-all z-50 flex items-center gap-2 max-w-[calc(100vw-2rem)]"
          style={{backgroundColor: '#007E8C'}}
          aria-label="Give Feedback"
        >
          <span>💬</span>
          <span className="hidden sm:inline">Give Feedback</span>
        </button>

        {/* Feedback Modal */}
        {showFeedback && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-[9999]">
            <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-8 relative max-h-[90vh] overflow-y-auto">
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

                  {/* Feedback Text Box - Always Visible */}
                  <div className="mb-6">
                    <label className="block font-semibold mb-2" style={{color: '#236383'}}>
                      Your Feedback (optional)
                    </label>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2"
                      style={{borderColor: '#E0E0E0'}}
                      rows="4"
                      placeholder="Share your thoughts, suggestions, or experiences with the collection site..."
                    />
                    <p className="text-xs mt-1" style={{color: '#666'}}>
                      You can provide feedback with or without a star rating below.
                    </p>
                  </div>

                  {/* Star Rating */}
                  <div className="mb-6">
                    <p className="font-semibold mb-3" style={{color: '#236383'}}>Rate your experience (optional):</p>
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
                    {feedbackRating > 0 && feedbackRating < 4 && (
                      <p className="text-xs mt-2 text-center" style={{color: '#dc2626'}}>
                        * Please provide feedback above to help us improve
                      </p>
                    )}
                  </div>

                  {/* Email */}
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
                          // Validate - require feedback text if rating is low
                          if (feedbackRating > 0 && feedbackRating < 4 && !feedbackText.trim()) {
                            alert('Please tell us what we can improve.');
                            return;
                          }
                          
                          // Require either rating or feedback text
                          if (feedbackRating === 0 && !feedbackText.trim()) {
                            alert('Please provide either feedback text or a star rating (or both).');
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