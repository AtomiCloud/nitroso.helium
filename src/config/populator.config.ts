import { IsISO8601, IsNumber, IsOptional, IsPositive, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// A KTMB release KTMB has announced ahead (e.g. "March 2027 opens 1 Dec 12pm").
// From `at` for the boost window, every date in [from, to] is watched at full
// power, even when KTMB's search already shows those dates before sales open.
export class ScheduledRelease {
  // ISO time the release opens, with offset, e.g. 2026-12-01T12:00:00+08:00
  @IsISO8601({ strict: true })
  at!: string;

  // first and last released travel dates, dd-mm-yyyy
  @Matches(/^\d{2}-\d{2}-\d{4}$/)
  from!: string;

  @Matches(/^\d{2}-\d{2}-\d{4}$/)
  to!: string;
}

export class PopulatorConfig {
  @IsNumber()
  @IsPositive()
  delay: number;

  // hours a released date stays at full power (default 72)
  @IsNumber()
  @IsPositive()
  @IsOptional()
  boostHours?: number;

  @ValidateNested({ each: true })
  @Type(() => ScheduledRelease)
  @IsOptional()
  releases?: ScheduledRelease[];
}
