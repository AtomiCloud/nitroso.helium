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

// Scheduled releases that are open right now: [at, at + hours).
const activeReleases = (releases: ScheduledRelease[], nowSec: number, hours: number) =>
  releases
    .map(r => ({ r, atSec: Math.floor(Date.parse(r.at) / 1000) }))
    .filter(({ atSec }) => Number.isFinite(atSec) && atSec <= nowSec && nowSec < atSec + hours * 3600)
    .map(({ r, atSec }) => ({ dates: dateRange(r.from, r.to), untilSec: atSec + hours * 3600 }));

class ReleaseBoost {
  constructor(
    private readonly redis: Redis,
    private readonly logger: Logger,
    private readonly hours: number = RELEASE_BOOST_HOURS,
    private readonly releases: ScheduledRelease[] = [],
    private readonly key: string = RELEASE_BOOST_KEY,
  ) {}

  // Boost newly detected dates plus any announced release that is open now.
  async Add(detected: string[]): Promise<void> {
    const nowSec = Math.floor(Date.now() / 1000);
    const scheduled = activeReleases(this.releases, nowSec, this.hours);
    if (detected.length === 0 && scheduled.length === 0) return;

    let dates: BoostDates = {};
    try {
      const raw = await this.redis.get(this.key);
      if (raw) dates = (JSON.parse(raw) as { dates?: BoostDates }).dates ?? {};
    } catch (e) {
      this.logger.error({ error: e }, 'Failed to read release boost; starting a fresh one');
    }
    dates = mergeBoost(dates, detected, nowSec, nowSec + this.hours * 3600);
    for (const s of scheduled) dates = mergeBoost(dates, s.dates, nowSec, s.untilSec);

    const exps = Object.values(dates);
    if (exps.length === 0) return;
    await this.redis.set(this.key, JSON.stringify({ dates }), 'EX', Math.max(...exps) - nowSec);
    this.logger.info(
      { detected, scheduled: scheduled.map(s => s.dates.length), total: exps.length, hours: this.hours },
      'Release boost: dates at full power',
    );
  }
}

export { ReleaseBoost, mergeBoost, dateRange, activeReleases, RELEASE_BOOST_KEY, RELEASE_BOOST_HOURS };
