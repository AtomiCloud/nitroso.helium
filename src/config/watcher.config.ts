import { IsInt, IsPositive } from "class-validator";

export class WatcherConfig {
  @IsInt()
  @IsPositive()
  delay: number;
}
