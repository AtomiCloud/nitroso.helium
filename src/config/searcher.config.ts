import { IsBoolean, IsIn, IsNumber, IsOptional, Min, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { PollType, SearcherMode, StreamSpec } from '../domain/interface';

export class StreamConfig implements StreamSpec {
  @IsIn(['web', 'mobile'])
  mode!: SearcherMode;

  @IsIn(['stateless', 'held'])
  type!: PollType;

  @IsOptional()
  proxy?: string | boolean;

  @IsNumber()
  @Min(0)
  delay!: number;

  @IsString()
  @IsOptional()
  token?: string;

  @IsBoolean()
  @IsOptional()
  spoofIp?: boolean;
}

export class SearcherConfig {
  // `;`-separated proxy pool used by the legacy (random) web paths.
  @IsString()
  @IsOptional()
  proxy?: string;

  // Default transport for the single-poller commands (watch/get/populator).
  @IsIn(['web', 'mobile'])
  @IsOptional()
  mode?: SearcherMode;

  // Static KTMB app key sent on every mobile API call. Global, never per-row.
  @IsString()
  @IsOptional()
  requestSignature?: string;

  // Mobile JSON API host, e.g. https://shuttleonline-api.ktmb.com.my
  @IsString()
  @IsOptional()
  apiUrl?: string;

  // Mobile account API host (login lives here — helium never calls it).
  @IsString()
  @IsOptional()
  appUrl?: string;

  // Optional default stream table; overridable per-invocation via the CLI.
  @ValidateNested({ each: true })
  @Type(() => StreamConfig)
  @IsOptional()
  streams?: StreamConfig[];
}
