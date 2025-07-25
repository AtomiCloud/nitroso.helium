import type { Api } from './zinc/Api.ts';
import type { Utility } from '../utility.ts';
import { Err, Ok, Res, type Result } from './core/result.ts';
import type { LatestScheduleRes } from './zinc/data-contracts.ts';
import type { ProblemDetails } from '../errors/problem_details.ts';
import type { ZincDate } from '../util/zinc_date.ts';
import { addDays, addMonths, endOfMonth } from 'date-fns';

class Checker {
  constructor(
    private readonly zinc: Api,
    private readonly utility: Utility,
    private readonly zincDate: ZincDate,
  ) {}

  Check(): Result<[Date, Date], ProblemDetails> {
    return Res.async(async () => {
      const result = this.utility.toResult(
        () => this.zinc.vScheduleLatestDetail('1.0'),
        'Error occurred when getting error info',
      );

      const r: Result<LatestScheduleRes, ProblemDetails> = await result.match({
        ok: v => Ok(v),
        err: e => {
          if (e.status === 404) {
            const ddd = this.zincDate.to(new Date());
            return Ok({ date: ddd } satisfies LatestScheduleRes);
          }
          return Err(e);
        },
      });

      return r.map(x => {
        const d = this.zincDate.from(x.date!);
        const today = new Date();
        const sixMonthsLater = addMonths(today, 5);
        const lastDayOfMonth = endOfMonth(sixMonthsLater);
        return [d, lastDayOfMonth] as [Date, Date];
      });
    });
  }
}

export { Checker };
