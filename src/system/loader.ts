import * as yaml from "js-yaml";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { merge, set } from "lodash";
import { Constructor, RawConfig } from "./types.ts";

class ConfigLoader<T extends object> {
  constructor(
    private readonly envPrefix: string,
    private readonly envDelimiter: string,
    private readonly configPaths: string[],
    private readonly cstr: Constructor<T>,
  ) {}

  loadEnvironment(env: Record<string, string | undefined>): RawConfig {
    return Object.keys(env)
      .filter((key) => key.startsWith(this.envPrefix))
      .map((k) => {
        const value = env[k];
        const keyWithoutPrefix = k.replace(this.envPrefix, "");
        const key = keyWithoutPrefix
          .split(this.envDelimiter)
          .map((x) => x.toLowerCase())
          .join(".");
        return { key, value };
      })
      .reduce((a, { key, value }) => set(a, key, value), {});
  }

  async load(): Promise<T> {
    // load files
    const configPromises = this.configPaths.map(async (path) => {
      try {
        const file = Bun.file(path);
        const content = await file.text();
        return yaml.load(content) as RawConfig;
      } catch {
        return {};
      }
    });

    const configs = await Promise.all(configPromises);

    // load environment
    const envConfig = this.loadEnvironment(process.env ?? {});
    configs.push(envConfig);

    // merge all configs
    const config = configs.reduce((a, b) => merge(a, b), {});

    const validatedConfig = plainToInstance(this.cstr, config, {
      enableImplicitConversion: true,
    });

    const errors = validateSync(validatedConfig, {
      skipMissingProperties: false,
    });

    if (errors.length > 0) {
      throw new Error(errors.toString());
    }
    return { ...validatedConfig };
  }
}

export { ConfigLoader };
