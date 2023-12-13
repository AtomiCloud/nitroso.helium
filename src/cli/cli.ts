import { autoInjectable, inject } from "tsyringe";
import { program } from "commander";
import { SearcherBuilder } from "../domain/searcher/builder.ts";
import { svc } from "../system/constants.ts";
import type { Logger } from "pino";
import { trace } from "@opentelemetry/api";
import { RootConfig } from "../config/root.config.ts";
import Redis from "ioredis";

@autoInjectable()
class Cli {
  constructor(
    private readonly builder: SearcherBuilder,
    @inject(svc.Logger)
    private readonly logger: Logger,
    private readonly cfg: RootConfig,
    @inject(svc.livecache)
    private readonly redis: Redis,
  ) {}

  async start(): Promise<void> {
    const a = this.cfg.app;
    const tracer = trace.getTracer(`${a.platform}.${a.service}.${a.module}`);
    program
      .name("nitroso-helium")
      .description("Nitroso Helium - Pollee Job")
      .version("0.0.0");

    program
      .command("watch")
      .description(
        "Start repeatedly poll and watch for changes for a fixed day and direction",
      )
      .option("-d, --date <date>", "Date to poll")
      .option(
        "-f, --from <from>",
        `Direction to poll, either 'JB' or 'Woodlands'`,
      )
      .option(
        "-i, --interval <interval>",
        `Interval to poll in seconds, default 180`,
      )
      .action(
        async ({
          date,
          from,
          interval,
        }: {
          date: string;
          from: string;
          interval: string;
        }) => {
          await tracer.startActiveSpan("watch", async (span) => {
            const d = new Date(date);
            const i = parseInt(interval);
            if (isNaN(i)) throw new Error("Interval must be a number");
            if (from !== "JB" && from !== "Woodlands")
              throw new Error("From must be either 'JB' or 'Woodlands'");
            const f = from as "JB" | "Woodlands";
            const a = await this.builder.BuildFixed(f, d);
            const loopDuration = i * 1000;
            const startTime = Date.now();

            this.logger.info(
              {
                date,
                from,
                interval,
              },
              "Starting watch",
            );

            let index = 0;

            while (true) {
              const currentTime = Date.now();
              const elapsedTime = currentTime - startTime;
              this.logger.info(
                { index: index++, elapsedTime, loopDuration },
                "Running search",
              );
              if (elapsedTime >= loopDuration) break;

              // run the searcher
              const sch = await a.Search();
              const timing: Record<string, number> = {};
              for (const s of sch) timing[s.departure_time] = s.available_seats;
              const cmd = await this.redis.publish(
                `ktmb:schedule:${date}`,
                JSON.stringify(timing),
              );
              this.logger.info({ cmd, index: index++ }, "Published schedule");
            }
            this.logger.info({ index: index++ }, "Watch complete");
            span.end();
          });
          process.exit(0);
        },
      );

    await program.parseAsync(process.argv);
  }
}

export { Cli };
