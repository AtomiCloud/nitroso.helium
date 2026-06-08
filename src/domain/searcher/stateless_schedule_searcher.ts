import type { From, IScheduleSearcher, TrainSchedule } from '../interface.ts';
import type { SearchCore } from '../search_core.ts';

class StatelessScheduleSearcher implements IScheduleSearcher {
  constructor(
    private readonly searchCore: SearchCore,
    // Fixed proxy for this stream. Falls back to the random pool when omitted.
    private readonly proxyOverride?: string,
    // Rotate a random X-Real-IP per request to dodge the rate limiter.
    private readonly spoofIp = false,
    // When no proxy override is set, fall back to the config proxy pool
    // (legacy). Stream-built searchers pass false => direct when no proxy.
    private readonly usePool = false,
  ) {}

  async Search(from: From, date: Date): Promise<TrainSchedule[]> {
    const proxy = this.proxyOverride ?? (this.usePool ? this.searchCore.proxy : undefined);
    // Fresh cookie jar per poll — stateless re-establishes the session each time.
    const session = this.searchCore.newSession();
    const main = await this.searchCore.mainKTMBPage(proxy, this.spoofIp, session);
    const p = await this.searchCore.proxyKTMBPost(
      from,
      date,
      main.JBToken,
      main.WoodlandsToken,
      main.requestVerificationToken,
      proxy,
      this.spoofIp,
      session,
    );
    return await this.searchCore.getData(
      main.requestVerificationToken,
      p.searchData,
      p.formValidationCode,
      date,
      proxy,
      this.spoofIp,
      session,
    );
  }
}

export { StatelessScheduleSearcher };
