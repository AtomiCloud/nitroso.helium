import { ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { AppConfig } from "./app.config";
import { OtelConfig } from "./otel.config";
import { CacheConfig } from "./cache.config";
import { AuthConfig } from "./auth.config";
import { ZincConfig } from "./zinc.config";
import { ErrorConfig } from "./error.config";

export class RootConfig {
  @ValidateNested()
  @Type(() => AppConfig)
  app!: AppConfig;

  @ValidateNested()
  @Type(() => AuthConfig)
  auth!: AuthConfig;

  @ValidateNested()
  @Type(() => AuthConfig)
  error!: ErrorConfig;

  @ValidateNested()
  @Type(() => OtelConfig)
  otel!: OtelConfig;

  @ValidateNested()
  @Type(() => ZincConfig)
  zinc!: ZincConfig;

  @ValidateNested({
    each: true,
  })
  @Type(() => CacheConfig)
  cache!: Map<string, CacheConfig>;
}
