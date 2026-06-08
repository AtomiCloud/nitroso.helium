import type { From, IScheduleSearcher, TrainSchedule } from '../interface.ts';
import type { MobileSearchCore, StationMap } from '../mobile_search_core.ts';

/**
 * Mobile, stateless: every poll runs Search then Trip. Stations rarely change,
 * so they are fetched once and memoised on the instance.
 */
class MobileStatelessScheduleSearcher implements IScheduleSearcher {
  #stations?: StationMap;

  constructor(
    private readonly core: MobileSearchCore,
    private readonly userData: string,
    private readonly proxy?: string,
    private readonly spoofIp = false,
  ) {}

  async Search(from: From, date: Date): Promise<TrainSchedule[]> {
    if (this.#stations == null) this.#stations = await this.core.stations(this.userData, this.proxy, this.spoofIp);
    const searchData = await this.core.search(this.userData, from, date, this.#stations, this.proxy, this.spoofIp);
    return this.core.trip(this.userData, date, searchData, this.proxy, this.spoofIp);
  }
}

export { MobileStatelessScheduleSearcher };
