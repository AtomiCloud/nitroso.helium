import { IsBoolean, IsString } from "class-validator";

export class LoggingConfig {
  @IsString()
  level!: string;

  @IsBoolean()
  prettify!: boolean;

  @IsBoolean()
  enabled!: boolean;
  @IsBoolean()
  safe!: boolean;
}
