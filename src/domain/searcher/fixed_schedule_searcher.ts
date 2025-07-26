import type { IFixedScheduleSearcher, TrainSchedule } from '../interface.ts';
import type { MainPageToken, ProxyToken, SearchCore } from '../search_core.ts';

class FixedScheduleSearcher implements IFixedScheduleSearcher {
  constructor(
    private readonly searchCore: SearchCore,
    private readonly main: MainPageToken,
    private readonly proxy: ProxyToken,
    private readonly date: Date,
  ) {}

  Search(): Promise<TrainSchedule[]> {
    return this.searchCore.getData(
      this.main.requestVerificationToken,
      this.proxy.searchData,
      this.proxy.formValidationCode,
      this.date,
    );
  }
}

export { FixedScheduleSearcher };
