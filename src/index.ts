import "core-js";
import "reflect-metadata";
import { container } from "tsyringe";
import { Cli } from "./cli/cli.ts";

import { svc } from "./system/constants.ts";

import { RootConfig } from "./config/root.config";
import { ConfigLoader } from "./system/loader.ts";
import { OtelService } from "./system/tracing.ts";
import Redis, { RedisOptions } from "ioredis";

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
cfg.cache.forEach((v, k) => {
  const endpoint = v.endpoints.get("0")!;

  const [host, port] = endpoint.split(":") as [string, string];

  const o: RedisOptions = {
    name: k,
    host,
    db: 0,
    port: parseInt(port),
    autoResubscribe: v.autoResubscribe,
    commandTimeout: v.commandTimeout,
    connectTimeout: v.connectTimeout,
    enableAutoPipelining: v.enableAutoPipelining,
    keyPrefix: v.keyPrefix,
    readOnly: v.readOnly,
    password: v.password,
  };

  if (v.tls) o.tls = {};

  const redis = new Redis(o);
  container.register(svc[k + "cache"], { useValue: redis });
});
container.register(RootConfig, { useValue: cfg });
container.register(svc.Logger, { useValue: logger });

const cli = container.resolve(Cli);

await cli.start();
