import { IsNumber, IsPositive } from "class-validator";

export class WatcherConfig {
  @IsNumber()
  @IsPositive()
  delay: number;
}
