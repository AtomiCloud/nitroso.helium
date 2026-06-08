import type { Logger } from 'pino';
import type Redis from 'ioredis';
import type { From, IScheduleSearcher } from '../domain/interface.ts';
import type { ZincDate } from '../util/zinc_date.ts';

/**
 * Runs a single stream: repeatedly polls one searcher against a fixed
 * date+direction, publishing availability to redis, until the run duration
 * elapses. Pacing is the stream's own `delayMs`. Injected dependencies keep it
 * unit-testable with a mock searcher and redis.
 */
class Poller {
  constructor(
    private readonly logger: Logger,
    private readonly redis: Redis,
    private readonly zincDate: ZincDate,
  ) {}

  async Poll(
    searcher: IScheduleSearcher,
    label: string,
    d: Date,
    from: From,
    startTime: number,
    durationMs: number,
    delayMs: number,
    // When true, log the fetched schedule instead of publishing to redis.
    // Useful for local testing where `live` redis is unreachable.
    dryRun = false,
  ): Promise<void> {
    const od = this.zincDate.to(d);
    const key = `ktmb:schedule:${from}:${od}`;

    let failureCount = 0;
    let polls = 0;

    while (true) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= durationMs) break;

      try {
        const sch = await searcher.Search(from, d);
        const timing: Record<string, number> = {};
        for (const s of sch) timing[s.departure_time] = s.available_seats;
        polls++;
        failureCount = 0;

        // dry-run: surface the schedule (testing). Production: just publish —
        // per-poll logging is expensive at high poll rates.
        if (dryRun) {
          this.logger.info({ label, key, timing }, 'Polled schedule (dry-run)');
        } else {
          try {
            await this.redis.publish(key, JSON.stringify(timing));
          } catch (e) {
            this.logger.warn({ err: e, label, key }, 'Failed to publish schedule to redis');
          }
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        this.logger.error({ err: e, label, message }, 'Failed to poll schedule');
        failureCount++;
        if (failureCount > 10) {
          this.logger.error({ label }, 'Failed to poll schedule too many times, stopping poller');
          break;
        }
      }

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    this.logger.info({ label, polls }, 'Poller complete');
  }
}

export { Poller };
