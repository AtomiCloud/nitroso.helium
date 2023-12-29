import "reflect-metadata";
import { Cli } from "./cli/cli.ts";

import { RootConfig } from "./config/root.config";
import { ConfigLoader } from "./system/loader.ts";
import { OtelService } from "./system/tracing.ts";
import { loadRedis } from "./load-redis.ts";
import { SearcherBuilder } from "./domain/searcher/builder.ts";
import { SearchCore } from "./domain/search_core.ts";
import { ZincDate } from "./util/zinc_date.ts";
import { Get } from "./lib/get.ts";
import { Watcher } from "./lib/watcher.ts";

// start up that cannot use DI
const landscape = process.env.LANDSCAPE;
const paths = ["config/app/config.yaml"];
const delimiter = "__" as const;
const prefix = "ATOMI_" as const;
if (landscape) paths.push(`config/app/${landscape}.config.yaml`);
const configLoader = new ConfigLoader(prefix, delimiter, paths, RootConfig);
const cfg = await configLoader.load();

const otel = new OtelService(cfg);
const logger = await otel.start();

// Start DI
const caches = loadRedis(cfg);
const zincDate = new ZincDate();
const searchCore = new SearchCore();
const searchBuilder = new SearcherBuilder(searchCore);
const watcher = new Watcher(
  logger,
  caches.get("live")!,
  searchBuilder,
  zincDate,
);
const getter = new Get(searchBuilder);
const cli = new Cli(logger, cfg, zincDate, watcher, getter);

await cli.start();
