(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AppHelpers = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MS_IN_MINUTE = 60 * 1000;

  const getNextWednesday = (referenceDate = new Date()) => {
    const today = new Date(referenceDate);
    const dayOfWeek = today.getDay(); // Sunday = 0 ... Wednesday = 3
    const daysUntilWednesday = (3 - dayOfWeek + 7) % 7;
    const nextWednesday = new Date(today);
    nextWednesday.setHours(0, 0, 0, 0);
    nextWednesday.setDate(today.getDate() + daysUntilWednesday);
    return nextWednesday;
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
    formatTime,
    getDateWithTime,
    getNextWednesday
  };
}));

