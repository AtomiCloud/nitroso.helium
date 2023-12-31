import Redis, { RedisOptions } from "ioredis";
import { RootConfig } from "./config/root.config.ts";
import { Auth, Descope } from "./lib/interfaces.ts";
import { DescopeConfig } from "./config/auth/descope.config.ts";
import DescopeClient from "@descope/node-sdk";
import { Api } from "./lib/zinc/Api.ts";
import { ApiConfig } from "./lib/zinc/http-client.ts";
import { ZincConfig } from "./config/zinc.config.ts";

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

const loadDescope = (config: DescopeConfig): Descope =>
  DescopeClient({ projectId: config.id, managementKey: config.key });

const loadZinc = (config: ZincConfig, auth: Auth): Api => {
  const c = {
    baseUrl: `${config.scheme}://${config.domain}`,
    securityWorker: async () => {
      const token = await auth.Token();
      return {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
    },
  } as ApiConfig;
  return new Api(c);
};

export { loadRedis, loadDescope, loadZinc };
