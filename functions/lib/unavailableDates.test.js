const { mergeUnavailableDates } = require('./magicLinkService');

describe('mergeUnavailableDates', () => {
  it('applies additions and removals together', () => {
    expect(mergeUnavailableDates(
      ['2026-09-30', '2026-10-07'],
      ['2026-10-14'],
      ['2026-09-30']
    )).toEqual({
      changed: true,
      unavailable_dates: ['2026-10-07', '2026-10-14'],
    });
  });

  it('leaves the stored list unchanged when there is no delta', () => {
    expect(mergeUnavailableDates(['2026-10-07', '2026-09-30'], [], [])).toEqual({
      changed: false,
      unavailable_dates: ['2026-09-30', '2026-10-07'],
    });
  });
});
