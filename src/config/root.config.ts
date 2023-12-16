import { ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { AppConfig } from "./app.config";
import { OtelConfig } from "./otel.config";
import { CacheConfig } from "./cache.config";

export class RootConfig {
  @ValidateNested()
  @Type(() => AppConfig)
  app!: AppConfig;

  @ValidateNested()
  @Type(() => OtelConfig)
  otel!: OtelConfig;

  @ValidateNested({
    each: true,
  })
  @Type(() => CacheConfig)
  cache!: Map<string, CacheConfig>;
}
