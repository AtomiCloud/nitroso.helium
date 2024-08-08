import { program } from "commander";
import type { Logger } from "pino";
import { trace } from "@opentelemetry/api";
import { RootConfig } from "../config/root.config.ts";
import { ZincDate } from "../util/zinc_date.ts";
import { Watcher } from "../lib/watcher.ts";
import { Get } from "../lib/get.ts";
import { AsciiTable3 } from "ascii-table3";
import { Updater } from "../lib/updater.ts";
import { Refunder } from "../lib/refunder.ts";
import { Reverter } from "../lib/reverter.ts";

interface WatchData {
  date: string;
  from: "JToW" | "WToJ";
}

class Cli {
  constructor(
    private readonly logger: Logger,
    private readonly cfg: RootConfig,
    private readonly zincDate: ZincDate,
    private readonly watcher: Watcher,
    private readonly getter: Get,
    private readonly updater: Updater,
    private readonly refunder: Refunder,
    private readonly reverter: Reverter,
  ) {}

  err(message: string): never {
    this.logger.error(message);
    return process.exit(1);
  }

  async start(): Promise<void> {
    this.logger.debug(this.cfg, "Starting CLI");
    const a = this.cfg.app;
    const tracer = trace.getTracer(`${a.platform}.${a.service}.${a.module}`);
    program
      .name("nitroso-helium")
      .description("Nitroso Helium - Pollee Job")
      .version("0.0.0");

    program
      .command("schedule")
      .description(
        "Poll Schedules to update database on which schedules are available",
      )
      .action(async () => {
        this.logger.info("Starting updating schedule");
        await this.updater.Update();
        this.logger.info("Completed updating schedule");
        process.exit(0);
      });

    program
      .command("wait")
      .description("Wait indefinitely")
      .action(async () => {
        process.on("SIGINT", () => {
          console.log("Received SIGINT signal. Terminating...");
          process.exit();
        });
        while (true) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      });

    program
      .command("refunder")
      .description("Initiate Refund Process")
      .action(async () => {
        await this.refunder.Refund();
        process.exit(0);
      });

    program
      .command("reverter")
      .description("Initiate Rerverting Process")
      .action(async () => {
        await this.reverter.Revert();
        process.exit(0);
      });

    program
      .command("get <date> <from>")
      .description("Get schedule for a fixed day and direction")
      .action(async (date: string, from: string) => {
        if (date == null) this.err("Date is required");
        if (from == null) this.err("From is required");
        if (from !== "JToW" && from !== "WToJ")
          this.err("From must be either 'JToW' or 'WToJ'");

        const d = this.zincDate.from(date);
        const f = from as "JToW" | "WToJ";

        const out = await this.getter.Get(d, f);

        this.logger.info({ length: out.length }, "Length obtained");

        if (out.length > 0) {
          const table = new AsciiTable3().setAlignCenter(2).addRowMatrix(out);
          console.log(table.toString());
        } else {
          console.log("No data found");
        }
        process.exit(0);
      });

    program
      .command("multi-watch")
      .description(
        "Start repeatedly poll and watch for changes for all days and directions",
      )
      .option("-d, --data <data>", "Polling data in JSON")
      .option(
        "-i, --interval <interval>",
        `Interval to poll in seconds, default 180`,
      )
      .action(
        async ({ data, interval }: { data: WatchData[]; interval: string }) => {
          await tracer.startActiveSpan("watch", async (span) => {
            if (data == null) this.err("Data is required, -d []");
            if (interval == null)
              this.err("Interval is required, -i <seconds>");
            if (isNaN(i)) this.err("Interval must be a number");

            const i = parseInt(interval);

            const all: Promise<void>[] = [];

            for (const { date, from } of data) {
              const d = this.zincDate.from(date);
              if (from !== "JToW" && from !== "WToJ")
                this.err("From must be either 'JToW' or 'WToJ'");
              const now = Date.now();
              this.logger.info({ date, from, interval }, "Starting watch");
              all.push(this.watcher.Watch(d, now, i, from));
            }
            await Promise.allSettled(all);
            span.end();
          });
          process.exit(0);
        },
      );

    program
      .command("watch")
      .description(
        "Start repeatedly poll and watch for changes for a fixed day and direction",
      )
      .option("-d, --date <date>", "Date to poll")
      .option("-f, --from <from>", `Direction to poll, either 'JToW' or 'WToJ'`)
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
            if (date == null) this.err("Date is required, -d <dd-mm-yyyy>");
            if (from == null) this.err("From is required, -f <JToW|WToJ>");
            if (interval == null)
              this.err("Interval is required, -i <seconds>");

            const d = this.zincDate.from(date);
            const i = parseInt(interval);
            const f = from as "JToW" | "WToJ";

            if (isNaN(i)) this.err("Interval must be a number");
            if (from !== "JToW" && from !== "WToJ")
              this.err("From must be either 'JToW' or 'WToJ'");
            const now = Date.now();
            this.logger.info({ date, from, interval }, "Starting watch");
            await this.watcher.Watch(d, now, i, f);
            span.end();
          });
          process.exit(0);
        },
      );

    await program.parseAsync(process.argv);
  }
}

export { Cli };
