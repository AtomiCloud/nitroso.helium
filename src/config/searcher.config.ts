import { IsOptional, IsString, IsUrl } from "class-validator";

export class SearcherConfig {
  @IsString()
  @IsOptional()
  proxy?: string;
}
