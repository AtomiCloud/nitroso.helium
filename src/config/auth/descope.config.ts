import { IsString } from 'class-validator';

export class DescopeConfig {
  @IsString()
  id!: string;

  @IsString()
  key!: string;
}
