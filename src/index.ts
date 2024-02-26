import "reflect-metadata";
import { Cli } from "./cli/cli.ts";

import { RootConfig } from "./config/root.config";
import { ConfigLoader } from "./system/loader.ts";
import { OtelService } from "./system/tracing.ts";
import { SearcherBuilder } from "./domain/searcher/builder.ts";
import { SearchCore } from "./domain/search_core.ts";
import { ZincDate } from "./util/zinc_date.ts";
import { Get } from "./lib/get.ts";
import { Watcher } from "./lib/watcher.ts";
import { loadDescope, loadRedis, loadZinc } from "./constructors.ts";
import { DescopeAuth } from "./lib/auth.ts";
import { Auth } from "./lib/interfaces.ts";
import { DetailFactory } from "./errors/error_utility.ts";
import { Utility } from "./utility.ts";
import { Checker } from "./lib/checker.ts";
import { Updater } from "./lib/updater.ts";
import { Populator } from "./lib/populator.ts";

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
const descope = loadDescope(cfg.auth.descope);
const auth: Auth = new DescopeAuth(descope, cfg.auth.descope);
const zincDate = new ZincDate();
const searchCore = new SearchCore(cfg.app.searcher);
const searchBuilder = new SearcherBuilder(searchCore);
const detailFactory = new DetailFactory(cfg.error, cfg.app);
const utility = new Utility(detailFactory);

const watcher = new Watcher(
  logger,
  caches.get("live")!,
  searchBuilder,
  zincDate,
);
const getter = new Get(searchBuilder);
const zinc = loadZinc(cfg.zinc, auth);
const checker = new Checker(zinc, utility, zincDate);
const populator = new Populator(logger, searchBuilder);
const updater = new Updater(
  zinc,
  utility,
  zincDate,
  checker,
  logger,
  populator,
);

const cli = new Cli(logger, cfg, zincDate, watcher, getter, updater);

await cli.start();
