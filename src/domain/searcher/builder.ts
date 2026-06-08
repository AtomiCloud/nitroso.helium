import type { SearchCore } from '../search_core.ts';
import type { MobileSearchCore } from '../mobile_search_core.ts';
import type { From, IFixedScheduleSearcher, IScheduleSearcher, StreamSpec } from '../interface.ts';
import { StatelessScheduleSearcher } from './stateless_schedule_searcher.ts';
import { LoadedScheduleSearcher } from './loaded_schedule_searcher.ts';
import { FixedScheduleSearcher } from './fixed_schedule_searcher.ts';
import { MobileStatelessScheduleSearcher } from './mobile_stateless_schedule_searcher.ts';
import { MobileHeldScheduleSearcher } from './mobile_held_schedule_searcher.ts';

class SearcherBuilder {
  constructor(
    private readonly searchCore: SearchCore,
    private readonly mobileCore: MobileSearchCore,
  ) {}

  // Resolve a stream spec's `proxy` field to a concrete proxy URL (or undefined
  // = direct). String => that proxy; true => a random pick from the config pool.
  #resolveProxy(p?: string | boolean): string | undefined {
    if (typeof p === 'string') return p;
    if (p === true) return this.searchCore.proxy;
    return undefined;
  }

  async BuildStateless(): Promise<IScheduleSearcher> {
    // Legacy path (watch): random proxy from the config pool, per poll.
    return new StatelessScheduleSearcher(this.searchCore, undefined, false, true);
  }

  async BuildLoaded(proxy?: string, spoofIp = false, usePool = true): Promise<IScheduleSearcher> {
    const mainProxy = proxy ?? (usePool ? this.searchCore.proxy : undefined);
    const session = this.searchCore.newSession();
    const token = await this.searchCore.mainKTMBPage(mainProxy, spoofIp, session);
    return new LoadedScheduleSearcher(this.searchCore, token, proxy, spoofIp, usePool, session);
  }

  async BuildFixed(from: From, d: Date): Promise<IFixedScheduleSearcher> {
    const netProxy = this.searchCore.proxy;
    const session = this.searchCore.newSession();
    const main = await this.searchCore.mainKTMBPage(netProxy, false, session);
    const proxy = await this.searchCore.proxyKTMBPost(
      from,
      d,
      main.JBToken,
      main.WoodlandsToken,
      main.requestVerificationToken,
      netProxy,
      false,
      session,
    );
    return new FixedScheduleSearcher(this.searchCore, main, proxy, d, netProxy, session);
  }

  // Build the searcher for one row of the deterministic stream table.
  async BuildForStream(spec: StreamSpec): Promise<IScheduleSearcher> {
    const spoof = spec.spoofIp ?? false;
    const proxy = this.#resolveProxy(spec.proxy);

    if (spec.mode === 'mobile') {
      if (spec.token == null || spec.token.length === 0) throw new Error('mobile stream requires a token (userData)');
      return spec.type === 'held'
        ? new MobileHeldScheduleSearcher(this.mobileCore, spec.token, proxy, spoof)
        : new MobileStatelessScheduleSearcher(this.mobileCore, spec.token, proxy, spoof);
    }

    return spec.type === 'held'
      ? await this.BuildLoaded(proxy, spoof, false)
      : new StatelessScheduleSearcher(this.searchCore, proxy, spoof, false);
  }
}

export { SearcherBuilder };
