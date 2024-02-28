import { IsInt, IsPositive } from "class-validator";

export class PopulatorConfig {
  @IsInt()
  @IsPositive()
  delay: number;
}
