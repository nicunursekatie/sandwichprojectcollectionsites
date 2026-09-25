const {
  buildCalendarEvent,
  formatTime,
  getNextWednesday,
  getUpcomingWednesday,
  getActiveCollectionWednesday,
  getActiveCollectionWednesdayStr,
  resolveTimeZone,
  formatDateYYYYMMDD,
  isHostUnavailableOnDate,
  getWednesdaysInMonth,
  getWednesdaysInUpcomingMonth,
  getHostNavigationDestination,
  getGoogleMapsDirectionsUrl,
  getAppleMapsDirectionsUrl,
  getAtlantaRegionLabel,
  groupHostsByAtlantaRegion,
  groupAreasByAtlantaRegion,
  hasFiniteDistance,
  applyCollectionAvailability,
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

  describe('getActiveCollectionWednesday', () => {
    const eastern = 'America/New_York';

    it('uses the visitor time zone and falls back to Eastern', () => {
      expect(resolveTimeZone('America/Los_Angeles')).toBe('America/Los_Angeles');
      expect(resolveTimeZone('Not/AZone')).toBe('America/New_York');
      expect(resolveTimeZone()).toBe(
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
      );
    });

    it('stays on the current week through Wednesday evening Eastern', () => {
      const wednesdayEvening = new Date('2026-07-02T02:30:00Z'); // Wed Jul 1, 10:30pm ET
      expect(getActiveCollectionWednesdayStr(wednesdayEvening, eastern)).toBe('2026-07-01');
    });

    it('hides the following week as soon as Thursday starts in that time zone', () => {
      const thursdayMorning = new Date('2026-07-02T04:05:00Z'); // Thu Jul 2, 12:05am ET
      const result = getActiveCollectionWednesday(thursdayMorning, eastern);
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(6);
      expect(result.getDate()).toBe(8);
      expect(getActiveCollectionWednesdayStr(thursdayMorning, eastern)).toBe('2026-07-08');
    });

    it('keeps the prior week for a visitor whose Thursday has not started', () => {
      const stillWednesdayPacific = new Date('2026-07-02T05:30:00Z'); // Thu 1:30am ET, Wed 10:30pm PT
      expect(getActiveCollectionWednesdayStr(stillWednesdayPacific, eastern)).toBe('2026-07-08');
      expect(getActiveCollectionWednesdayStr(stillWednesdayPacific, 'America/Los_Angeles')).toBe('2026-07-01');
    });

    it('switches to the next collection week on the Thursday after collection day', () => {
      const nextThursday = new Date('2026-07-09T04:05:00Z'); // Thu Jul 9, 12:05am ET
      expect(getActiveCollectionWednesdayStr(nextThursday, eastern)).toBe('2026-07-15');
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

  describe('host navigation destinations', () => {
    it('prefers a street address over coordinates', () => {
      expect(getHostNavigationDestination({
        address: '  123 Peachtree St NE  ',
        lat: 33.75,
        lng: -84.39
      })).toBe('123 Peachtree St NE');
    });

    it('falls back to coordinates when no street address is present', () => {
      expect(getHostNavigationDestination({
        address: '   ',
        lat: '33.75',
        lng: -84.39
      })).toBe('33.75,-84.39');
    });

    it('returns an empty destination for blank or missing coordinates', () => {
      expect(getHostNavigationDestination({ address: '', lat: '', lng: '' })).toBe('');
      expect(getHostNavigationDestination({ lat: null, lng: null })).toBe('');
      expect(getHostNavigationDestination({ lat: '  ', lng: 'nope' })).toBe('');
      expect(getHostNavigationDestination({})).toBe('');
    });

    it('encodes destinations and builds directions URLs with and without an origin', () => {
      const host = { address: '123 Peachtree St NE, Atlanta' };
      const origin = { lat: 33.8, lng: -84.4 };

      const googleWithOrigin = getGoogleMapsDirectionsUrl(host, origin);
      const googleWithoutOrigin = getGoogleMapsDirectionsUrl(host);
      const appleWithOrigin = getAppleMapsDirectionsUrl(host, origin);
      const appleWithoutOrigin = getAppleMapsDirectionsUrl(host);

      expect(googleWithOrigin).toBe(
        'https://www.google.com/maps/dir/?api=1&origin=33.8,-84.4&destination=123%20Peachtree%20St%20NE%2C%20Atlanta&travelmode=driving'
      );
      expect(googleWithoutOrigin).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=123%20Peachtree%20St%20NE%2C%20Atlanta&travelmode=driving'
      );
      expect(googleWithoutOrigin).not.toContain('/maps/search/');
      expect(appleWithOrigin).toContain('saddr=33.8,-84.4');
      expect(appleWithOrigin).toContain('daddr=123%20Peachtree%20St%20NE%2C%20Atlanta');
      expect(appleWithoutOrigin).toBe(
        'https://maps.apple.com/?daddr=123%20Peachtree%20St%20NE%2C%20Atlanta&dirflg=d'
      );
      expect(getGoogleMapsDirectionsUrl({ lat: '', lng: null })).toBe('');
      expect(getAppleMapsDirectionsUrl({ lat: '', lng: null })).toBe('');
    });
  });

  describe('Atlanta region grouping', () => {
    it('normalizes mapped area names', () => {
      expect(getAtlantaRegionLabel({ area: '  Dunwoody  ' })).toBe('North Atlanta');
      expect(getAtlantaRegionLabel({ area: 'CHAMBLEE/BROOKHAVEN' })).toBe('Northeast Atlanta');
      expect(getAtlantaRegionLabel({ area: 'College Park' })).toBe('South Atlanta');
      expect(getAtlantaRegionLabel({ area: 'Intown' })).toBe('East Atlanta');
    });

    it('classifies unmapped hosts at coordinate thresholds', () => {
      expect(getAtlantaRegionLabel({ area: 'Unknown', lat: 33.739, lng: -84.39 })).toBe('South Atlanta');
      expect(getAtlantaRegionLabel({ area: 'Unknown', lat: 33.74, lng: -84.39 })).toBe('Other Metro Atlanta');
      expect(getAtlantaRegionLabel({ area: 'Unknown', lat: 34.081, lng: -84.39 })).toBe('Outside Metro Atlanta');
      expect(getAtlantaRegionLabel({ area: 'Unknown', lat: 34.08, lng: -84.289 })).toBe('East Atlanta');
      expect(getAtlantaRegionLabel({ area: 'Unknown', lat: 34.08, lng: -84.29 })).toBe('Other Metro Atlanta');
      expect(getAtlantaRegionLabel({ area: 'Unknown', lat: 33.9, lng: -84.431 })).toBe('North Atlanta');
      expect(getAtlantaRegionLabel({ area: 'Unknown', lat: 33.9, lng: -84.43 })).toBe('Other Metro Atlanta');
    });

    it('does not classify blank coordinates as South Atlanta', () => {
      expect(getAtlantaRegionLabel({ area: 'Unmapped', lat: '', lng: '' })).toBe('Other Metro Atlanta');
      expect(getAtlantaRegionLabel({ lat: null, lng: null })).toBe('Other Metro Atlanta');
      expect(getAtlantaRegionLabel({})).toBe('Other Metro Atlanta');
    });

    it('orders regions and sorts hosts within a region without mutating the input', () => {
      const hosts = [
        { name: 'Zeta', area: 'Decatur' },
        { name: 'Alpha', area: 'College Park' },
        { name: 'Beta', area: 'Dunwoody' },
        { name: 'Gamma', area: 'Decatur' },
        { name: 'Mystery', area: 'Somewhere Else', lat: '', lng: '' }
      ];
      const snapshot = JSON.parse(JSON.stringify(hosts));

      expect(groupHostsByAtlantaRegion(hosts)).toEqual([
        {
          region: 'North Atlanta',
          hosts: [{ name: 'Beta', area: 'Dunwoody' }]
        },
        {
          region: 'East Atlanta',
          hosts: [
            { name: 'Gamma', area: 'Decatur' },
            { name: 'Zeta', area: 'Decatur' }
          ]
        },
        {
          region: 'South Atlanta',
          hosts: [{ name: 'Alpha', area: 'College Park' }]
        },
        {
          region: 'Other Metro Atlanta',
          hosts: [{ name: 'Mystery', area: 'Somewhere Else', lat: '', lng: '' }]
        }
      ]);
      expect(hosts).toEqual(snapshot);
    });
  });

  describe('groupAreasByAtlantaRegion', () => {
    it('orders area names by region instead of alphabetically', () => {
      const hosts = [
        { area: 'Decatur' },
        { area: 'Buckhead' },
        { area: 'College Park' },
        { area: 'Chamblee/Brookhaven' }
      ];
      expect(groupAreasByAtlantaRegion(
        ['College Park', 'Chamblee/Brookhaven', 'Decatur', 'Buckhead'],
        hosts
      )).toEqual([
        { region: 'North Atlanta', areas: ['Buckhead'] },
        { region: 'Northeast Atlanta', areas: ['Chamblee/Brookhaven'] },
        { region: 'East Atlanta', areas: ['Decatur'] },
        { region: 'South Atlanta', areas: ['College Park'] }
      ]);
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

  describe('hasFiniteDistance', () => {
    it('treats zero miles as a real distance', () => {
      expect(hasFiniteDistance(0)).toBe(true);
      expect(hasFiniteDistance('0')).toBe(true);
    });

    it('rejects missing distances', () => {
      expect(hasFiniteDistance(null)).toBe(false);
      expect(hasFiniteDistance(undefined)).toBe(false);
      expect(hasFiniteDistance('')).toBe(false);
    });
  });

  describe('applyCollectionAvailability', () => {
    const wednesday = '2026-09-23';

    it('keeps a substitute available when the primary is out on that date', () => {
      const hosts = applyCollectionAvailability([
        { id: 1, available: true, unavailable_dates: [wednesday] },
        { id: 2, available: true, alternateFor: 1, unavailable_dates: [] },
      ], wednesday);

      expect(hosts.find((host) => host.id === 1).available).toBe(false);
      expect(hosts.find((host) => host.id === 2).available).toBe(true);
    });

    it('hides a substitute when the primary is still collecting', () => {
      const hosts = applyCollectionAvailability([
        { id: 1, available: true, unavailable_dates: [] },
        { id: 2, available: true, alternateFor: 1, unavailable_dates: [] },
      ], wednesday);

      expect(hosts.find((host) => host.id === 1).available).toBe(true);
      expect(hosts.find((host) => host.id === 2).available).toBe(false);
    });
  });
});

