import { IsString, MinLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { SearcherConfig } from "./searcher.config";
import { PopulatorConfig } from "./populator.config";
import { WatcherConfig } from "./watcher.config";

export class AppConfig {
  @IsString()
  @MinLength(1)
  landscape!: string;

  @IsString()
  @MinLength(1)
  platform!: string;

  @IsString()
  @MinLength(1)
  service!: string;

  @IsString()
  @MinLength(1)
  module!: string;

  @IsString()
  @MinLength(1)
  version!: string;

  @ValidateNested()
  @Type(() => SearcherConfig)
  searcher!: SearcherConfig;

  @ValidateNested()
  @Type(() => PopulatorConfig)
  populator!: PopulatorConfig;

  @ValidateNested()
  @Type(() => WatcherConfig)
  watcher!: WatcherConfig;
}
