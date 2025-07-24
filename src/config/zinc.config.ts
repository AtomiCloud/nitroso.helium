import { IsString } from 'class-validator';

export class ZincConfig {
  @IsString()
  domain!: string;

  @IsString()
  scheme!: string;
}
