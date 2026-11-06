import type Redis from 'ioredis';
import type { Logger } from 'pino';
import type { ScheduledRelease } from '../config/populator.config.ts';

// Shared with tin's poller (poller.boostKey): JSON {"dates": {"dd-mm-yyyy": unixSecondsExpiry}}.
// Dates listed here are watched at full power, beyond tin's normal ~3-week
// window, until they expire — so a newly released KTMB month is sniped while
// seats are plentiful.
const RELEASE_BOOST_KEY = 'ktmb:release-boost';
const RELEASE_BOOST_HOURS = 72;

type BoostDates = Record<string, number>;

// Merge dates (each until `untilSec`) into the existing boost, dropping
// expired entries. A date already boosted keeps the later expiry.
const mergeBoost = (existing: BoostDates, dates: string[], nowSec: number, untilSec: number): BoostDates => {
  const out: BoostDates = {};
  for (const [d, exp] of Object.entries(existing)) if (exp > nowSec) out[d] = exp;
  if (untilSec > nowSec) for (const d of dates) out[d] = Math.max(out[d] ?? 0, untilSec);
  return out;
};

// Every dd-mm-yyyy date from..to inclusive.
const dateRange = (from: string, to: string): string[] => {
  const parse = (s: string) => {
    const [d, m, y] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const out: string[] = [];
  for (let t = parse(from); t <= parse(to); t += 86_400_000) {
    const d = new Date(t);
    out.push(
      `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`,
    );
  }
  return out;
};

// A release config problem, or undefined when it is usable: a parseable
// `at`, real calendar dates, and from <= to.
const releaseProblem = (r: ScheduledRelease): string | undefined => {
  if (!Number.isFinite(Date.parse(r.at))) return 'unparseable at';
  // a real calendar date round-trips through dateRange (31-02 would not)
  if (dateRange(r.from, r.from)[0] !== r.from || dateRange(r.to, r.to)[0] !== r.to) return 'not a real calendar date';
  if (dateRange(r.from, r.to).length === 0) return 'from is after to';
  return undefined;
};

// Scheduled releases that are open right now: [at, at + hours).
const activeReleases = (releases: ScheduledRelease[], nowSec: number, hours: number) =>
  releases
    .filter(r => releaseProblem(r) === undefined)
    .map(r => ({ r, atSec: Math.floor(Date.parse(r.at) / 1000) }))
    .map(({ r, atSec }) => ({ r, atSec, untilSec: Math.floor(atSec + hours * 3600) }))
    .filter(({ atSec, untilSec }) => atSec <= nowSec && nowSec < untilSec)
    .map(({ r, untilSec }) => ({ dates: dateRange(r.from, r.to), untilSec }));

class ReleaseBoost {
  constructor(
    private readonly redis: Redis,
    private readonly logger: Logger,
    private readonly hours: number = RELEASE_BOOST_HOURS,
    private readonly releases: ScheduledRelease[] = [],
    private readonly key: string = RELEASE_BOOST_KEY,
  ) {
    for (const r of releases) {
      const problem = releaseProblem(r);
      if (problem) this.logger.error({ release: r, problem }, 'Ignoring invalid scheduled release');
    }
  }

  // Boost newly detected dates plus any announced release that is open now.
  async Add(detected: string[]): Promise<void> {
    const nowSec = Math.floor(Date.now() / 1000);
    const scheduled = activeReleases(this.releases, nowSec, this.hours);
    if (detected.length === 0 && scheduled.length === 0) return;

    // A read failure throws (the caller logs it): never overwrite live boosts
    // we could not read. Only unparseable content starts a fresh map.
    const raw = await this.redis.get(this.key);
    let dates: BoostDates = {};
    if (raw) {
      try {
        dates = (JSON.parse(raw) as { dates?: BoostDates }).dates ?? {};
      } catch (e) {
        this.logger.error({ error: e }, 'Unparseable release boost; starting a fresh one');
      }
    }
    dates = mergeBoost(dates, detected, nowSec, Math.floor(nowSec + this.hours * 3600));
    for (const s of scheduled) dates = mergeBoost(dates, s.dates, nowSec, s.untilSec);

    const exps = Object.values(dates);
    if (exps.length === 0) return;
    await this.redis.set(this.key, JSON.stringify({ dates }), 'EX', Math.max(1, Math.max(...exps) - nowSec));
    this.logger.info(
      { detected, scheduled: scheduled.map(s => s.dates.length), total: exps.length, hours: this.hours },
      'Release boost: dates at full power',
    );
  }
}

export { ReleaseBoost, mergeBoost, dateRange, activeReleases, releaseProblem, RELEASE_BOOST_KEY, RELEASE_BOOST_HOURS };
