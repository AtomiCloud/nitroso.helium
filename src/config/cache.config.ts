import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from "class-validator";

export class CacheConfig {
  @IsString({
    each: true,
  })
  endpoints!: Map<string, string>;

  @IsOptional()
  @IsBoolean()
  tls?: boolean;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  keyPrefix?: string;

  @IsBoolean()
  autoResubscribe!: boolean;

  @IsInt()
  @IsPositive()
  connectTimeout!: number;

  @IsInt()
  @IsPositive()
  commandTimeout!: number;

  @IsBoolean()
  enableAutoPipelining!: boolean;

  @IsBoolean()
  readOnly!: boolean;
}
