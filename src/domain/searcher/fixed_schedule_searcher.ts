import type { IFixedScheduleSearcher, TrainSchedule } from '../interface.ts';
import type { Fetcher, MainPageToken, ProxyToken, SearchCore } from '../search_core.ts';

class FixedScheduleSearcher implements IFixedScheduleSearcher {
  constructor(
    private readonly searchCore: SearchCore,
    private readonly main: MainPageToken,
    private readonly proxy: ProxyToken,
    private readonly date: Date,
    // Network proxy for the data fetch (resolved at build time).
    private readonly netProxy?: string,
    // Cookie jar the session was built with.
    private readonly session?: Fetcher,
  ) {}

  Search(): Promise<TrainSchedule[]> {
    return this.searchCore.getData(
      this.main.requestVerificationToken,
      this.proxy.searchData,
      this.proxy.formValidationCode,
      this.date,
      this.netProxy,
      false,
      this.session,
    );
  }
}

export { FixedScheduleSearcher };
