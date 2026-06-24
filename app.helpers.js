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
    buildCalendarEvent,
    escapeICSValue,
    formatDateForICS,
    formatDateForICSUtc,
    formatDateYYYYMMDD,
    formatTime,
    getDateWithTime,
    getNextWednesday,
    getUpcomingWednesday,
    getWednesdaysInMonth,
    getWednesdaysInUpcomingMonth,
    isHostUnavailableOnDate
  };
}));

