import Redis, { RedisOptions } from "ioredis";
import { RootConfig } from "./config/root.config.ts";

const loadRedis = (config: RootConfig): Map<string, Redis> => {
  return new Map(
    [...config.cache.entries()].map(([k, v]) => {
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
      return [k, redis];
    }),
  );
};

export { loadRedis };
