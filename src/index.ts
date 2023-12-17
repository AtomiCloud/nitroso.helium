import "reflect-metadata";
import { Cli } from "./cli/cli.ts";

import { RootConfig } from "./config/root.config";
import { ConfigLoader } from "./system/loader.ts";
import { OtelService } from "./system/tracing.ts";
import { loadRedis } from "./load-redis.ts";
import { SearcherBuilder } from "./domain/searcher/builder.ts";
import { SearchCore } from "./domain/search_core.ts";

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
const searchCore = new SearchCore();
const searchBuilder = new SearcherBuilder(searchCore);

const cli = new Cli(searchBuilder, logger, cfg, caches.get("live")!);

await cli.start();
