import { describe, expect, test } from 'bun:test';
import { activeReleases, dateRange, mergeBoost, releaseProblem } from './release_boost.ts';
import { newlyReleased } from './updater.ts';
import { hasTrains } from './checker.ts';

const toZinc = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;

describe('mergeBoost', () => {
  test('adds dates until the given time and drops expired ones', () => {
    const now = 1_000_000;
    const out = mergeBoost({ '01-12-2026': now - 1, '02-12-2026': now + 10 }, ['05-01-2027'], now, now + 500);
    expect(out).toEqual({ '02-12-2026': now + 10, '05-01-2027': now + 500 });
  });
  test('keeps the later expiry for a date already boosted', () => {
    const now = 1_000_000;
    expect(mergeBoost({ '05-01-2027': now + 999 }, ['05-01-2027'], now, now + 1)).toEqual({ '05-01-2027': now + 999 });
  });
});

describe('scheduled releases', () => {
  const march = { at: '2026-12-01T12:00:00+08:00', from: '01-03-2027', to: '31-03-2027' };
  const atSec = Date.parse(march.at) / 1000;
  test('dateRange covers every day inclusive', () => {
    const d = dateRange('27-02-2027', '02-03-2027');
    expect(d).toEqual(['27-02-2027', '28-02-2027', '01-03-2027', '02-03-2027']);
    expect(dateRange(march.from, march.to).length).toBe(31);
  });
  test('inactive before the release time and after the window', () => {
    expect(activeReleases([march], atSec - 60, 72)).toEqual([]);
    expect(activeReleases([march], atSec + 72 * 3600, 72)).toEqual([]);
  });
  test('active from the release time, until at + hours', () => {
    const a = activeReleases([march], atSec + 60, 72);
    expect(a.length).toBe(1);
    expect(a[0].dates.length).toBe(31);
    expect(a[0].untilSec).toBe(atSec + 72 * 3600);
  });
});

describe('newlyReleased', () => {
  test('only dates with trains that were not open before', () => {
    const r = [
      { date: new Date('2026-12-31T00:00:00Z'), jToW: ['05:00:00'], wToJ: [] },
      { date: new Date('2027-01-01T00:00:00Z'), jToW: ['05:00:00'], wToJ: ['06:00:00'] },
      { date: new Date('2027-01-02T00:00:00Z'), jToW: [], wToJ: [] },
    ];
    expect(newlyReleased(r, new Set(['31-12-2026']), toZinc)).toEqual(['01-01-2027']);
  });
});

describe('hasTrains', () => {
  const j = ['05:00:00', '06:00:00'];
  const w = ['07:00:00'];
  test('a row excluding every timing has no trains', () => {
    expect(hasTrains({ confirmed: true, jToWExcluded: j, wToJExcluded: w }, j, w)).toBe(false);
  });
  test('a row with any timing left has trains', () => {
    expect(hasTrains({ confirmed: true, jToWExcluded: ['05:00:00'], wToJExcluded: w }, j, w)).toBe(true);
  });
});

describe('release config validation', () => {
  test('flags bad releases', () => {
    expect(releaseProblem({ at: 'nope', from: '01-03-2027', to: '31-03-2027' })).toBe('unparseable at');
    expect(releaseProblem({ at: '2026-12-01T12:00:00+08:00', from: '31-03-2027', to: '01-03-2027' })).toBe(
      'from is after to',
    );
    expect(releaseProblem({ at: '2026-12-01T12:00:00+08:00', from: '31-02-2027', to: '01-03-2027' })).toBe(
      'not a real calendar date',
    );
    expect(releaseProblem({ at: '2026-12-01T12:00:00+08:00', from: '01-03-2027', to: '31-03-2027' })).toBeUndefined();
  });
  test('hasTrains treats missing timing data as open', () => {
    expect(hasTrains({ confirmed: true, jToWExcluded: [], wToJExcluded: [] }, [], [])).toBe(true);
  });
});
