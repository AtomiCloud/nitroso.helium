import { IsString, MinLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { SearcherConfig } from "./searcher.config";

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
}
