import { SearchCore } from "../search_core.ts";
import {
  From,
  IFixedScheduleSearcher,
  IScheduleSearcher,
} from "../interface.ts";
import { StatelessScheduleSearcher } from "./stateless_schedule_searcher.ts";
import { LoadedScheduleSearcher } from "./loaded_schedule_searcher.ts";
import { FixedScheduleSearcher } from "./fixed_schedule_searcher.ts";
import { autoInjectable } from "tsyringe";

@autoInjectable()
class SearcherBuilder {
  constructor(private readonly searchCore: SearchCore) {}

  async BuildStateless(): Promise<IScheduleSearcher> {
    const searcher = new StatelessScheduleSearcher(this.searchCore);
    return Promise.resolve(searcher);
  }

  async BuildLoaded(): Promise<IScheduleSearcher> {
    const token = await this.searchCore.mainKTMBPage();
    return new LoadedScheduleSearcher(this.searchCore, token);
  }

  async BuildFixed(from: From, d: Date): Promise<IFixedScheduleSearcher> {
    const main = await this.searchCore.mainKTMBPage();
    const proxy = await this.searchCore.proxyKTMBPost(
      from,
      d,
      main.JBToken,
      main.WoodlandsToken,
      main.requestVerificationToken,
    );
    return new FixedScheduleSearcher(this.searchCore, main, proxy, d);
  }
}

export { SearcherBuilder };
