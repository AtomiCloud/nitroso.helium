import { ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { DescopeConfig } from "./auth/descope.config";

export class AuthConfig {
  @ValidateNested()
  @Type(() => DescopeConfig)
  descope!: DescopeConfig;
}
