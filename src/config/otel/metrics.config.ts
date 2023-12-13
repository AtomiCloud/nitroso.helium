import { ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ExporterConfig } from "./metrics/exporter.config";

export class MetricsConfig {
  @ValidateNested()
  @Type(() => ExporterConfig)
  exporter!: ExporterConfig;
}
