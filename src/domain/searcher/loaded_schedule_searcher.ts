import type { From, IScheduleSearcher, TrainSchedule } from '../interface.ts';
import type { Fetcher, MainPageToken, SearchCore } from '../search_core.ts';

class LoadedScheduleSearcher implements IScheduleSearcher {
  constructor(
    private readonly searchCore: SearchCore,
    private readonly main: MainPageToken,
    // Fixed proxy for this stream. Falls back to the random pool when omitted.
    private readonly proxyOverride?: string,
    // Rotate a random X-Real-IP per request to dodge the rate limiter.
    private readonly spoofIp = false,
    // Fall back to the config proxy pool when no override (legacy); stream
    // searchers pass false => direct when no proxy.
    private readonly usePool = false,
    // The cookie jar the main page was loaded with; reused for every poll so
    // the session stays consistent.
    private readonly session?: Fetcher,
  ) {}

  async Search(from: From, date: Date): Promise<TrainSchedule[]> {
    const proxy = this.proxyOverride ?? (this.usePool ? this.searchCore.proxy : undefined);
    const p = await this.searchCore.proxyKTMBPost(
      from,
      date,
      this.main.JBToken,
      this.main.WoodlandsToken,
      this.main.requestVerificationToken,
      proxy,
      this.spoofIp,
      this.session,
    );
    return await this.searchCore.getData(
      this.main.requestVerificationToken,
      p.searchData,
      p.formValidationCode,
      date,
      proxy,
      this.spoofIp,
      this.session,
    );
  }
}

export { LoadedScheduleSearcher };
