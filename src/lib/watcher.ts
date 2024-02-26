import { Logger } from "pino";
import Redis from "ioredis";
import { SearcherBuilder } from "../domain/searcher/builder.ts";
import { ZincDate } from "../util/zinc_date.ts";

class Watcher {
  constructor(
    private readonly logger: Logger,
    private readonly redis: Redis,
    private readonly builder: SearcherBuilder,
    private readonly zincDate: ZincDate,
  ) {}

  async Watch(d: Date, startTime: number, i: number, f: "JToW" | "WToJ") {
    const a = await this.builder.BuildFixed(f, d);
    const loopDuration = i * 1000;
    let index = 0;
    const od = this.zincDate.to(d);

    let failureCount = 0;

    while (true) {
      try {
        const currentTime = Date.now();
        const elapsedTime = currentTime - startTime;
        if (elapsedTime >= loopDuration) break;

        // run the searcher
        const sch = await a.Search();
        const timing: Record<string, number> = {};
        for (const s of sch) timing[s.departure_time] = s.available_seats;
        const key = `ktmb:schedule:${f}:${od}`;
        const _ = await this.redis.publish(key, JSON.stringify(timing));
      } catch (e) {
        this.logger.error({ error: e }, "Failed to poll schedule");
        failureCount++;
        if (failureCount > 10) {
          this.logger.error("Failed to poll schedule too many times, exiting");
          throw e;
        }
      }
    }
    this.logger.info({ index: index++ }, "Watch complete");
  }
}

export { Watcher };
