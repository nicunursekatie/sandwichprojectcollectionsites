const {
  buildCalendarEvent,
  formatTime,
  getNextWednesday
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

