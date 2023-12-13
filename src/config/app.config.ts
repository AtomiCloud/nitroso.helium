import { IsString, MinLength } from "class-validator";

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
}
