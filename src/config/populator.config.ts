import { IsNumber, IsPositive } from 'class-validator';

export class PopulatorConfig {
  @IsNumber()
  @IsPositive()
  delay: number;
}
