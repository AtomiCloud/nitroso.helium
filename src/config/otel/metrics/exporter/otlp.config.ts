import { IsIn, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class OtlpConfig {
  @IsString()
  url!: string;

  @IsNumber()
  @IsPositive()
  timeout!: number;

  @IsIn(['none', 'gzip'])
  compression!: 'none' | 'gzip';

  @IsOptional()
  @IsString({
    each: true,
  })
  headers?: Map<string, string>;
}
