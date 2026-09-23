(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AppHelpers = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MS_IN_MINUTE = 60 * 1000;

  /** Always returns the upcoming Wednesday (today if today is Wednesday). */
  const getUpcomingWednesday = (referenceDate = new Date()) => {
    const today = new Date(referenceDate);
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const daysUntilWednesday = (3 - dayOfWeek + 7) % 7;
    const upcoming = new Date(today);
    upcoming.setDate(today.getDate() + daysUntilWednesday);
    return upcoming;
  };

  const formatDateYYYYMMDD = (date) => {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const isHostUnavailableOnDate = (host, dateStr) => {
    if (!host || !dateStr) return false;
    return Array.isArray(host.unavailable_dates) && host.unavailable_dates.includes(dateStr);
  };

  /** Friday immediately before a collection Wednesday (midnight local). */
  const getFridayBeforeWednesday = (wednesdayDate) => {
    const friday = new Date(wednesdayDate);
    friday.setHours(0, 0, 0, 0);
    friday.setDate(friday.getDate() - 5);
    return friday;
  };

  /**
   * Collection Wednesday whose unavailability applies on referenceDate.
   * Activates on the Friday before each collection Wednesday; null before that window.
   */
  const getActiveCollectionWednesday = (referenceDate = new Date()) => {
    const today = new Date(referenceDate);
    today.setHours(0, 0, 0, 0);
    const upcomingWed = getUpcomingWednesday(today);
    const fridayBefore = getFridayBeforeWednesday(upcomingWed);
    if (today < fridayBefore) {
      return null;
    }
    return upcomingWed;
  };

  const getActiveCollectionWednesdayStr = (referenceDate = new Date()) => {
    const wed = getActiveCollectionWednesday(referenceDate);
    return wed ? formatDateYYYYMMDD(wed) : null;
  };

  /** All Wednesdays from the 1st through the last day of the month containing referenceDate. */
  const getWednesdaysInMonth = (referenceDate = new Date()) => {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    const wednesdays = [];
    const cursor = new Date(year, month, 1);
    while (cursor.getMonth() === month) {
      if (cursor.getDay() === 3) {
        wednesdays.push(formatDateYYYYMMDD(cursor));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return wednesdays;
  };

  /** Wednesdays in the upcoming calendar month (used for magic-link emails). */
  const getWednesdaysInUpcomingMonth = (referenceDate = new Date()) => {
    const nextMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
    return getWednesdaysInMonth(nextMonth);
  };

  const getNextWednesday = (referenceDate = new Date()) => {
    const today = new Date(referenceDate);
    const dayOfWeek = today.getDay(); // Sunday = 0, Tuesday = 2, Wednesday = 3
    // For emergency collection: allow both Tuesday (2) and Wednesday (3)
    let daysUntilCollection;
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
    const nextCollectionDay = new Date(today);
    nextCollectionDay.setHours(0, 0, 0, 0);
    nextCollectionDay.setDate(today.getDate() + daysUntilCollection);
    return nextCollectionDay;
  };

  const formatTime = (time24) => {
    if (!time24 || typeof time24 !== 'string') return '';
    const [hours, minutes = '00'] = time24.split(':');
    const hourNum = parseInt(hours, 10);
    if (Number.isNaN(hourNum)) return time24;
    const ampm = hourNum >= 12 ? 'pm' : 'am';
    const hour12 = hourNum % 12 || 12;
    return minutes === '00' ? `${hour12}${ampm}` : `${hour12}:${minutes}${ampm}`;
  };

  const getDateWithTime = (baseDate, timeString, defaultHour = 9, defaultMinute = 0) => {
    const date = new Date(baseDate);
    if (!timeString) {
      date.setHours(defaultHour, defaultMinute, 0, 0);
      return date;
    }
    const [hoursRaw, minutesRaw] = timeString.split(':');
    const hours = parseInt(hoursRaw, 10);
    const minutes = parseInt(minutesRaw ?? '0', 10);
    const safeHours = Number.isFinite(hours) ? hours : defaultHour;
    const safeMinutes = Number.isFinite(minutes) ? minutes : defaultMinute;
    date.setHours(safeHours, safeMinutes, 0, 0);
    return date;
  };

  const formatDateForICS = (date) => {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  };

  const formatDateForICSUtc = (date) => {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
  };

  const escapeICSValue = (value = '') => String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

  const sanitizeFileName = (value) => {
    const cleaned = String(value).replace(/[^\w\s-]/g, '').trim();
    return cleaned.length > 0 ? cleaned.replace(/\s+/g, '-') : 'event';
  };

  const toFiniteCoordinate = (value) => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const getHostNavigationDestination = (host = {}) => {
    const address = typeof host.address === 'string' ? host.address.trim() : '';
    if (address) return address;

    const lat = toFiniteCoordinate(host.lat);
    const lng = toFiniteCoordinate(host.lng);
    if (lat !== null && lng !== null) {
      return `${lat},${lng}`;
    }

    return '';
  };

  const getGoogleMapsDirectionsUrl = (host, userCoords = null) => {
    const destination = getHostNavigationDestination(host);
    if (!destination) return '';

    const encodedDestination = encodeURIComponent(destination);
    if (userCoords && Number.isFinite(userCoords.lat) && Number.isFinite(userCoords.lng)) {
      return `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${encodedDestination}&travelmode=driving`;
    }

    return `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}&travelmode=driving`;
  };

  const getAppleMapsDirectionsUrl = (host, userCoords = null) => {
    const destination = getHostNavigationDestination(host);
    if (!destination) return '';

    const encodedDestination = encodeURIComponent(destination);
    if (userCoords && Number.isFinite(userCoords.lat) && Number.isFinite(userCoords.lng)) {
      return `https://maps.apple.com/?saddr=${userCoords.lat},${userCoords.lng}&daddr=${encodedDestination}&dirflg=d`;
    }

    return `https://maps.apple.com/?daddr=${encodedDestination}&dirflg=d`;
  };

  const ATLANTA_AREA_TO_REGION = {
    'buckhead': 'North Atlanta',
    'chastain park': 'North Atlanta',
    'dunwoody': 'North Atlanta',
    'sandy springs': 'North Atlanta',
    'westminster/milmar neighborhood': 'North Atlanta',
    'chamblee/brookhaven': 'Northeast Atlanta',
    'johns creek': 'Northeast Atlanta',
    'milton': 'Northeast Atlanta',
    'peachtree corners': 'Northeast Atlanta',
    'roswell': 'Northeast Atlanta',
    'suwanee/johns creek': 'Northeast Atlanta',
    'decatur': 'East Atlanta',
    'east atlanta': 'East Atlanta',
    'east cobb': 'East Atlanta',
    'intown (candler park)': 'East Atlanta',
    'oak grove/druid hills': 'East Atlanta',
    'virginia highland': 'East Atlanta',
    'college park': 'South Atlanta',
    'southwest atlanta': 'South Atlanta',
    'dacula': 'Outside Metro Atlanta',
    'flowery branch': 'Outside Metro Atlanta'
  };

  const ATLANTA_REGION_ORDER = [
    'North Atlanta',
    'Northeast Atlanta',
    'East Atlanta',
    'South Atlanta',
    'Outside Metro Atlanta',
    'Other Metro Atlanta'
  ];

  const getAtlantaRegionLabel = (host = {}) => {
    const areaKey = String(host.area || '').trim().toLowerCase();
    if (ATLANTA_AREA_TO_REGION[areaKey]) {
      return ATLANTA_AREA_TO_REGION[areaKey];
    }

    const lat = toFiniteCoordinate(host.lat);
    const lng = toFiniteCoordinate(host.lng);
    if (lat !== null && lng !== null) {
      if (lat < 33.74) return 'South Atlanta';
      if (lat > 34.08) return 'Outside Metro Atlanta';
      if (lng > -84.29) return 'East Atlanta';
      if (lng < -84.43) return 'North Atlanta';
    }

    return 'Other Metro Atlanta';
  };

  const groupHostsByAtlantaRegion = (hosts = []) => {
    const grouped = new Map();

    hosts.forEach((host) => {
      const region = getAtlantaRegionLabel(host);
      if (!grouped.has(region)) {
        grouped.set(region, []);
      }
      grouped.get(region).push(host);
    });

    const sortHosts = (left, right) =>
      String(left.area || '').localeCompare(String(right.area || '')) ||
      String(left.name || '').localeCompare(String(right.name || ''));

    const orderedRegions = ATLANTA_REGION_ORDER.filter((region) => grouped.has(region));
    const extraRegions = [...grouped.keys()]
      .filter((region) => !ATLANTA_REGION_ORDER.includes(region))
      .sort((left, right) => left.localeCompare(right));

    return [...orderedRegions, ...extraRegions].map((region) => ({
      region,
      hosts: grouped.get(region).slice().sort(sortHosts)
    }));
  };

  const buildCalendarEvent = (host, {
    baseDate = getNextWednesday(),
    timezone = 'America/New_York',
    defaultDurationMinutes = 60
  } = {}) => {
    if (!host) {
      throw new Error('Host data is required to build a calendar event.');
    }

    const start = getDateWithTime(baseDate, host.openTime);
    const fallbackDuration = defaultDurationMinutes * MS_IN_MINUTE;
    let end = host.closeTime
      ? getDateWithTime(baseDate, host.closeTime)
      : new Date(start.getTime() + fallbackDuration);

    if (end <= start) {
      end = new Date(start.getTime() + Math.max(fallbackDuration / 2, 30 * MS_IN_MINUTE));
    }

    const summary = `Sandwich Drop-Off: ${host.name}`;
    const location = host.neighborhood
      ? `${host.neighborhood}, ${host.area}`
      : host.area;

    const descriptionParts = [
      `Area: ${host.area}`,
      host.neighborhood ? `Neighborhood: ${host.neighborhood}` : null,
      host.phone ? `Phone: ${host.phone}` : null,
      host.notes ? `Notes: ${host.notes}` : null,
      host.hours ? `Drop-off hours: ${host.hours}` : (host.openTime ? `Opens at: ${formatTime(host.openTime)}` : null)
    ].filter(Boolean);

    const description = descriptionParts.join('\n');

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//The Sandwich Project//Host Availability//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${host.id}-${formatDateForICS(start)}@sandwichproject.org`,
      `DTSTAMP:${formatDateForICSUtc(new Date())}`,
      `DTSTART;TZID=${timezone}:${formatDateForICS(start)}`,
      `DTEND;TZID=${timezone}:${formatDateForICS(end)}`,
      `SUMMARY:${escapeICSValue(summary)}`,
      `DESCRIPTION:${escapeICSValue(description)}`,
      `LOCATION:${escapeICSValue(location)}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ];

    return {
      summary,
      description,
      location,
      start,
      end,
      timezone,
      icsContent: icsLines.join('\r\n'),
      fileName: `${sanitizeFileName(summary)}.ics`
    };
  };

  return {
    ATLANTA_REGION_ORDER,
    buildCalendarEvent,
    escapeICSValue,
    formatDateForICS,
    formatDateForICSUtc,
    formatDateYYYYMMDD,
    formatTime,
    getAppleMapsDirectionsUrl,
    getAtlantaRegionLabel,
    getDateWithTime,
    getGoogleMapsDirectionsUrl,
    getHostNavigationDestination,
    getNextWednesday,
    getUpcomingWednesday,
    getFridayBeforeWednesday,
    getActiveCollectionWednesday,
    getActiveCollectionWednesdayStr,
    groupHostsByAtlantaRegion,
    getWednesdaysInMonth,
    getWednesdaysInUpcomingMonth,
    isHostUnavailableOnDate
  };
}));
