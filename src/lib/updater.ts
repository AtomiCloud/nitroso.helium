import { Api } from './zinc/Api.ts';
import { Utility } from '../utility.ts';
import { ZincDate } from '../util/zinc_date.ts';
import { Checker } from './checker.ts';
import { Logger } from 'pino';
import { Populator } from './populator.ts';
import { Result } from './core/result.ts';
import { TimingRes } from './zinc/data-contracts.ts';
import { RetrieveResult } from './interfaces.ts';
import { ProblemDetails } from '../errors/problem_details.ts';

class Updater {
  constructor(
    private readonly zinc: Api,
    private readonly utility: Utility,
    private readonly zincDate: ZincDate,
    private readonly checker: Checker,
    private readonly logger: Logger,
    private readonly populator: Populator,
  ) {}

  getAll(): Result<[TimingRes, TimingRes, RetrieveResult[]], ProblemDetails> {
    return this.utility
      .toResult(() => this.zinc.vTimingDetail('JToW', '1.0'), 'Failed to get JToW train timings')
      .andThen(j2w =>
        this.utility
          .toResult(() => this.zinc.vTimingDetail('WToJ', '1.0'), 'Failed to get WToJ train timings')
          .andThen(w2j =>
            this.checker
              .Check()
              .map(([from, to]) => this.populator.Retrieve(from, to))
              .map(retrieved => [j2w, w2j, retrieved]),
          ),
      );
  }

  async Update(): Promise<void> {
    const r = this.getAll();

    const rr = r.andThen(async ([j2w, w2j, retrieved]): Promise<Result<void, ProblemDetails>> => {
      this.logger.info({ j2w, w2j, retrieved }, 'Retrieved existing schedules');

      const j = j2w.principal?.timings ?? [];
      const w = w2j.principal?.timings ?? [];

      return this.utility.toResult(
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
      );
    });
    const isErr = await rr.isErr();
    if (isErr) {
      const e = await rr.unwrapErr();
      this.logger.error(e, 'Failed to update Zinc API on new schedules');
    } else {
      this.logger.info('Successfully updated Zinc API on new schedules');
    }
  }
}

export { Updater };
