import type { Api } from './zinc/Api.ts';
import type { Utility } from '../utility.ts';
import { Err, Ok, Res, type Result } from './core/result.ts';
import type { LatestScheduleRes, SchedulePrincipalRes } from './zinc/data-contracts.ts';
import type { ProblemDetails } from '../errors/problem_details.ts';
import type { ZincDate } from '../util/zinc_date.ts';
import { addMonths, endOfMonth, startOfDay } from 'date-fns';

// What the schedule updater should walk, and what is already open.
interface CheckResult {
  // first date to (re)check: the last stored date that actually has trains
  from: Date;
  // walk no further than ~5 months ahead
  to: Date;
  // zinc dates (dd-mm-yyyy) that already have at least one train
  open: Set<string>;
}

// A stored schedule row "has trains" when it does not exclude every timing in
// some direction. Rows written for not-yet-released dates exclude everything.
const hasTrains = (s: SchedulePrincipalRes, jTimings: string[], wTimings: string[]): boolean =>
  (s.jToWExcluded?.length ?? 0) < jTimings.length || (s.wToJExcluded?.length ?? 0) < wTimings.length;

class Checker {
  constructor(
    private readonly zinc: Api,
    private readonly utility: Utility,
    private readonly zincDate: ZincDate,
  ) {}

  Check(jTimings: string[], wTimings: string[]): Result<CheckResult, ProblemDetails> {
    return Res.async(async () => {
      const today = startOfDay(new Date());
      const to = endOfMonth(addMonths(today, 5));

      const latest: Result<LatestScheduleRes, ProblemDetails> = await this.utility
        .toResult(() => this.zinc.vScheduleLatestDetail('1.0'), 'Error occurred when getting error info')
        .match({
          ok: v => Ok(v),
          err: e => (e.status === 404 ? Ok({ date: this.zincDate.to(today) } satisfies LatestScheduleRes) : Err(e)),
        });

      return latest.andThen(async l => {
        const latestDate = this.zincDate.from(l.date!);
        if (latestDate < today) return Ok({ from: today, to, open: new Set<string>() } satisfies CheckResult);

        const range = this.utility.toResult(
          () => this.zinc.vScheduleRangeDetail(this.zincDate.to(today), l.date!, '1.0'),
          'Failed to get stored schedules',
        );
        return range.map(rows => {
          const open = new Set(
            rows.filter(r => r.date != null && hasTrains(r, jTimings, wTimings)).map(r => r.date as string),
          );
          // Restart from the last date that has trains, so dates stored as
          // "no trains" (not yet released) are re-checked until they open.
          const lastOpen = [...open]
            .map(d => this.zincDate.from(d))
            .sort((a, b) => a.getTime() - b.getTime())
            .at(-1);
          return { from: lastOpen ?? today, to, open } satisfies CheckResult;
        });
      });
    });
  }
}

export { Checker, hasTrains };
export type { CheckResult };
