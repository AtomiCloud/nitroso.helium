import { From, IScheduleSearcher, TrainSchedule } from '../interface.ts';
import { SearchCore } from '../search_core.ts';

class StatelessScheduleSearcher implements IScheduleSearcher {
  constructor(private readonly searchCore: SearchCore) {}

  async Search(from: From, date: Date): Promise<TrainSchedule[]> {
    const proxy = this.searchCore.proxy;
    const main = await this.searchCore.mainKTMBPage(proxy);
    const p = await this.searchCore.proxyKTMBPost(
      from,
      date,
      main.JBToken,
      main.WoodlandsToken,
      main.requestVerificationToken,
      proxy,
    );
    return await this.searchCore.getData(
      main.requestVerificationToken,
      p.searchData,
      p.formValidationCode,
      date,
      proxy,
    );
  }
}

export { StatelessScheduleSearcher };
