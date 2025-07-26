import type { From, IScheduleSearcher, TrainSchedule } from '../interface.ts';
import type { MainPageToken, SearchCore } from '../search_core.ts';

class LoadedScheduleSearcher implements IScheduleSearcher {
  constructor(
    private readonly searchCore: SearchCore,
    private readonly main: MainPageToken,
  ) {}

  async Search(from: From, date: Date): Promise<TrainSchedule[]> {
    const proxy = this.searchCore.proxy;
    const p = await this.searchCore.proxyKTMBPost(
      from,
      date,
      this.main.JBToken,
      this.main.WoodlandsToken,
      this.main.requestVerificationToken,
      proxy,
    );
    return await this.searchCore.getData(
      this.main.requestVerificationToken,
      p.searchData,
      p.formValidationCode,
      date,
      proxy,
    );
  }
}

export { LoadedScheduleSearcher };
