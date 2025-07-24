import { IsBoolean, IsIn, IsString } from 'class-validator';

export class ErrorConfig {
  @IsBoolean()
  enabled!: boolean;

  @IsIn(['http', 'https'])
  scheme!: 'http' | 'https';

  @IsString()
  host!: string;
}
