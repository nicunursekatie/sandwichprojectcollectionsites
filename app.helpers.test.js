const {
  buildCalendarEvent,
  formatTime,
  getNextWednesday,
  getUpcomingWednesday,
  formatDateYYYYMMDD,
  isHostUnavailableOnDate,
  getWednesdaysInMonth,
  getWednesdaysInUpcomingMonth,
} = require('./app.helpers.js');

describe('App helpers', () => {
  describe('getNextWednesday', () => {
    it('returns the same day when today is Wednesday', () => {
      const wednesday = new Date(2025, 1, 12); // Wednesday Feb 12, 2025
      const result = getNextWednesday(wednesday);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(12);
    });

    it('returns the upcoming Wednesday when today is Monday', () => {
      const monday = new Date(2025, 1, 10); // Monday Feb 10, 2025
      const result = getNextWednesday(monday);
      expect(result.getDate()).toBe(12);
    });
  });

  describe('getUpcomingWednesday', () => {
    it('returns today when today is Wednesday', () => {
      const wednesday = new Date(2025, 5, 11); // Wed Jun 11, 2025
      const result = getUpcomingWednesday(wednesday);
      expect(result.getDate()).toBe(11);
    });

    it('returns the next Wednesday when today is Thursday', () => {
      const thursday = new Date(2025, 5, 12); // Thu Jun 12, 2025
      const result = getUpcomingWednesday(thursday);
      expect(result.getDate()).toBe(18);
    });
  });

  describe('isHostUnavailableOnDate', () => {
    it('returns true when date is in unavailable_dates', () => {
      expect(isHostUnavailableOnDate({ unavailable_dates: ['2025-06-11'] }, '2025-06-11')).toBe(true);
    });

    it('handles missing unavailable_dates gracefully', () => {
      expect(isHostUnavailableOnDate({}, '2025-06-11')).toBe(false);
    });
  });

  describe('getWednesdaysInUpcomingMonth', () => {
    it('returns all Wednesdays in the next calendar month', () => {
      const reference = new Date(2025, 4, 15); // May 2025
      const wednesdays = getWednesdaysInUpcomingMonth(reference);
      expect(wednesdays).toEqual(['2025-06-04', '2025-06-11', '2025-06-18', '2025-06-25']);
    });
  });

  describe('formatTime', () => {
    it('formats afternoon time correctly', () => {
      expect(formatTime('13:30')).toBe('1:30pm');
    });

    it('formats morning time without minutes', () => {
      expect(formatTime('09:00')).toBe('9am');
    });

    it('handles invalid input gracefully', () => {
      expect(formatTime('invalid')).toBe('invalid');
    });
  });

  describe('buildCalendarEvent', () => {
    const host = {
      id: 42,
      name: 'Test Host',
      area: 'Dunwoody',
      neighborhood: 'Brooke Farm',
      phone: '404.555.1234',
      notes: 'Leave on the porch',
      hours: '9 am to 5 pm',
      openTime: '09:30',
      closeTime: '17:00'
    };

    it('creates a well-formed ICS payload', () => {
      const baseDate = new Date(2025, 1, 12); // Wednesday
      const event = buildCalendarEvent(host, { baseDate });

      expect(event).toMatchObject({
        summary: expect.stringContaining(host.name),
        fileName: 'Sandwich-Drop-Off-Test-Host.ics'
      });

      expect(event.icsContent).toContain('BEGIN:VEVENT');
      expect(event.icsContent).toContain('SUMMARY:Sandwich Drop-Off: Test Host');
      expect(event.icsContent).toContain('LOCATION:Brooke Farm\\, Dunwoody');
      expect(event.icsContent).toContain('DESCRIPTION:Area: Dunwoody');
      expect(event.icsContent).toContain('DTSTART;TZID=America/New_York:20250212T093000');
      expect(event.icsContent).toContain('DTEND;TZID=America/New_York:20250212T170000');
    });

    it('falls back to a default end time when close time is invalid', () => {
      const baseDate = new Date(2025, 1, 12);
      const event = buildCalendarEvent(
        { ...host, closeTime: '06:00' },
        { baseDate }
      );

      expect(event.end.getTime()).toBeGreaterThan(event.start.getTime());
    });

    it('includes default duration when close time is missing', () => {
      const baseDate = new Date(2025, 1, 12);
      const event = buildCalendarEvent(
        { ...host, closeTime: null },
        { baseDate }
      );

      const durationMinutes = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
      expect(durationMinutes).toBeGreaterThan(0);
    });
  });
});

