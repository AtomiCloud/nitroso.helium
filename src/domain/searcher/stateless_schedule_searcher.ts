import { From, IScheduleSearcher, TrainSchedule } from "../interface.ts";
import { SearchCore } from "../search_core.ts";

class StatelessScheduleSearcher implements IScheduleSearcher {
  constructor(private readonly searchCore: SearchCore) {}

  async Search(from: From, date: Date): Promise<TrainSchedule[]> {
    const main = await this.searchCore.mainKTMBPage();
    const p = await this.searchCore.proxyKTMBPost(
      from,
      date,
      main.JBToken,
      main.WoodlandsToken,
      main.requestVerificationToken,
    );
    return await this.searchCore.getData(
      main.requestVerificationToken,
      p.searchData,
      p.formValidationCode,
      date,
    );
  }
}

export { StatelessScheduleSearcher };
