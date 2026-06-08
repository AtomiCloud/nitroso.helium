import type { Logger } from 'pino';
import type { SearcherBuilder } from '../domain/searcher/builder.ts';
import type { From, StreamSpec } from '../domain/interface.ts';
import type { Poller } from './poller.ts';

// One polling stream: a transport/mode config bound to a date + direction.
interface WatchEntry {
  d: Date;
  from: From;
  spec: StreamSpec;
}

/**
 * Runs the deterministic poller table: builds one searcher per entry and runs
 * them all in parallel, each against its own date+direction with its own
 * proxy/delay/spoof. One failing stream never kills the others.
 */
class Streamer {
  constructor(
    private readonly logger: Logger,
    private readonly builder: SearcherBuilder,
    private readonly poller: Poller,
  ) {}

  async Run(entries: WatchEntry[], startTime: number, durationMs: number, dryRun = false): Promise<void> {
    this.logger.info({ count: entries.length, dryRun }, 'Starting streams');

    const all = entries.map(async (e, idx) => {
      const label = `${e.spec.mode}/${e.spec.type}:${e.from}#${idx}`;
      try {
        const searcher = await this.builder.BuildForStream(e.spec);
        await this.poller.Poll(searcher, label, e.d, e.from, startTime, durationMs, e.spec.delay, dryRun);
      } catch (err) {
        this.logger.error({ err, label }, 'Stream failed to start');
      }
    });

    await Promise.allSettled(all);
    this.logger.info({ count: entries.length }, 'Streams complete');
  }
}

export { type WatchEntry, Streamer };
