import type { Api } from './zinc/Api.ts';
import type { Utility } from '../utility.ts';
import type { ZincDate } from '../util/zinc_date.ts';
import type { Checker, CheckResult } from './checker.ts';
import type { Logger } from 'pino';
import type { Populator } from './populator.ts';
import { Ok, type Result } from './core/result.ts';
import type { TimingRes } from './zinc/data-contracts.ts';
import type { RetrieveResult } from './interfaces.ts';
import type { ProblemDetails } from '../errors/problem_details.ts';
import type { ReleaseBoost } from './release_boost.ts';

// Dates KTMB has newly opened: retrieved with trains, not open before.
const newlyReleased = (retrieved: RetrieveResult[], open: Set<string>, toZinc: (d: Date) => string): string[] =>
  retrieved
    .filter(r => r.jToW.length > 0 || r.wToJ.length > 0)
    .map(r => toZinc(r.date))
    .filter(d => !open.has(d));

class Updater {
  constructor(
    private readonly zinc: Api,
    private readonly utility: Utility,
    private readonly zincDate: ZincDate,
    private readonly checker: Checker,
    private readonly logger: Logger,
    private readonly populator: Populator,
    private readonly boost: ReleaseBoost,
  ) {}

  getAll(): Result<[TimingRes, TimingRes, CheckResult, RetrieveResult[]], ProblemDetails> {
    return this.utility
      .toResult(() => this.zinc.vTimingDetail('JToW', '1.0'), 'Failed to get JToW train timings')
      .andThen(j2w =>
        this.utility
          .toResult(() => this.zinc.vTimingDetail('WToJ', '1.0'), 'Failed to get WToJ train timings')
          .andThen(w2j =>
            this.checker.Check(j2w.principal?.timings ?? [], w2j.principal?.timings ?? []).map(async check => {
              this.logger.info({ from: check.from, to: check.to, open: check.open.size }, 'Walking KTMB schedule');
              const retrieved = await this.populator.Retrieve(check.from, check.to);
              return [j2w, w2j, check, retrieved] as [TimingRes, TimingRes, CheckResult, RetrieveResult[]];
            }),
          ),
      );
  }

  async Update(): Promise<void> {
    const r = this.getAll();

    const rr = r.andThen(async ([j2w, w2j, check, retrieved]): Promise<Result<string[], ProblemDetails>> => {
      this.logger.info({ retrieved: retrieved.length }, 'Retrieved schedules');

      const j = j2w.principal?.timings ?? [];
      const w = w2j.principal?.timings ?? [];

      // Nothing new on KTMB (the usual 10-minute run): nothing to store.
      if (retrieved.length === 0) return Ok([] as string[]);

      return this.utility
        .toResult(
          () =>
            this.zinc.vScheduleBulkUpdate('1.0', {
              schedules: retrieved.map(r => ({
                date: this.zincDate.to(r.date),
                record: {
                  confirmed: true,
                  jToWExcluded: j.filter(t => !r.jToW.includes(t)),
                  wToJExcluded: w.filter(t => !r.wToJ.includes(t)),
                },
              })),
            }),
          'Failed to update Zinc API on new schedules',
        )
        .map(() => newlyReleased(retrieved, check.open, d => this.zincDate.to(d)));
    });
    let released: string[] = [];
    if (await rr.isErr()) {
      const e = await rr.unwrapErr();
      this.logger.error(e, 'Failed to update Zinc API on new schedules');
    } else {
      released = await rr.unwrap();
      this.logger.info({ released: released.length }, 'Successfully updated Zinc API on new schedules');
    }
    // Always run: announced releases must boost even if the KTMB walk failed.
    try {
      await this.boost.Add(released);
    } catch (e) {
      this.logger.error({ error: e }, 'Failed to write release boost');
    }
  }
}

export { Updater, newlyReleased };
