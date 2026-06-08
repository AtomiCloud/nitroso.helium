import type { Logger } from 'pino';
import type { SearcherBuilder } from '../domain/searcher/builder.ts';
import type { From, StreamSpec } from '../domain/interface.ts';
import type { ZincDate } from '../util/zinc_date.ts';
import type { Poller } from './poller.ts';

// One polling stream: a transport/mode config bound to a date + direction.
interface WatchEntry {
  d: Date;
  from: From;
  spec: StreamSpec;
}

// Per-stream tally printed at the end so we can confirm polling happened.
interface StreamTally {
  date: string;
  from: From;
  mode: StreamSpec['mode'];
  type: StreamSpec['type'];
  polls: number;
  fails: number;
}

/**
 * Runs the deterministic poller table: builds one searcher per entry and runs
 * them all in parallel, each against its own date+direction with its own
 * proxy/delay/spoof. One failing stream never kills the others. At the end
 * (whether streams succeeded, failed, or gave up) it prints a per-stream poll
 * tally so we can verify each date/direction/transport was polling.
 */
class Streamer {
  constructor(
    private readonly logger: Logger,
    private readonly builder: SearcherBuilder,
    private readonly poller: Poller,
    private readonly zincDate: ZincDate,
  ) {}

  async Run(entries: WatchEntry[], startTime: number, durationMs: number, dryRun = false): Promise<void> {
    this.logger.info({ count: entries.length, dryRun }, 'Starting streams');

    const tallies = await Promise.all(
      entries.map(async (e, idx) => {
        const label = `${e.spec.mode}/${e.spec.type}:${e.from}#${idx}`;
        const base: StreamTally = {
          date: this.zincDate.to(e.d),
          from: e.from,
          mode: e.spec.mode,
          type: e.spec.type,
          polls: 0,
          fails: 0,
        };
        try {
          const searcher = await this.builder.BuildForStream(e.spec);
          const { polls, fails } = await this.poller.Poll(
            searcher,
            label,
            e.d,
            e.from,
            startTime,
            durationMs,
            e.spec.delay,
            dryRun,
          );
          return { ...base, polls, fails };
        } catch (err) {
          this.logger.error({ err, label }, 'Stream failed to start');
          return base;
        }
      }),
    );

    const totalPolls = tallies.reduce((acc, t) => acc + t.polls, 0);
    const totalFails = tallies.reduce((acc, t) => acc + t.fails, 0);
    this.logger.info(
      { streams: tallies, totalPolls, totalFails, count: tallies.length },
      'multi-watch summary: polls per date/direction/type',
    );
  }
}

export { type WatchEntry, type StreamTally, Streamer };
