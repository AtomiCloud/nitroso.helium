import type { From, IScheduleSearcher, TrainSchedule } from '../interface.ts';
import type { MobileSearchCore, StationMap } from '../mobile_search_core.ts';

/**
 * Mobile, held: cache `searchData` per route+date and make the steady-state
 * poll a single Trip call. When Trip fails (stale `searchData`), refresh once
 * via Search and retry.
 */
class MobileHeldScheduleSearcher implements IScheduleSearcher {
  #stations?: StationMap;
  #searchData = new Map<string, string>();

  constructor(
    private readonly core: MobileSearchCore,
    private readonly userData: string,
    private readonly proxy?: string,
    private readonly spoofIp = false,
  ) {}

  async Search(from: From, date: Date): Promise<TrainSchedule[]> {
    const key = `${from}:${date.toISOString()}`;
    let searchData = this.#searchData.get(key) ?? (await this.#refresh(from, date, key));

    try {
      return await this.core.trip(this.userData, date, searchData, this.proxy, this.spoofIp);
    } catch {
      // Most likely a stale searchData — refresh once and retry.
      searchData = await this.#refresh(from, date, key);
      return this.core.trip(this.userData, date, searchData, this.proxy, this.spoofIp);
    }
  }

  async #refresh(from: From, date: Date, key: string): Promise<string> {
    if (this.#stations == null) this.#stations = await this.core.stations(this.userData, this.proxy, this.spoofIp);
    const searchData = await this.core.search(this.userData, from, date, this.#stations, this.proxy, this.spoofIp);
    this.#searchData.set(key, searchData);
    return searchData;
  }
}

export { MobileHeldScheduleSearcher };
