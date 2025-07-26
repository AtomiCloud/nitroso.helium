import type { ProblemDetails } from './problem_details';
import type { ProblemConstructor } from './error_info';
import { problems } from './error_info';
import type { Problem } from './problem';
import type { ErrorConfig } from '../config/error.config.ts';
import type { AppConfig } from '../config/app.config.ts';

class DetailFactory {
  constructor(
    private readonly errorConfig: ErrorConfig,
    private readonly appConfig: AppConfig,
  ) {}

  toDetail<T extends Problem>(problem: T): ProblemDetails {
    const errorInfo = problems.get(problem.constructor as ProblemConstructor);
    if (errorInfo == null) {
      return {
        detail: 'Error parsed not registered',
        title: 'Error occurred when parsing Error',
        status: 500,
        traceId: 'local',
        type: 'none',
        data: {
          original: problem,
        },
        // biome-ignore lint/suspicious/noExplicitAny: problem not known at build time
      } as any;
    }
    const p: T = JSON.parse(JSON.stringify(problem));
    const ep = this.errorConfig;
    const ap = this.appConfig;

    return {
      detail: problem.detail,
      title: errorInfo.title,
      status: errorInfo.status,
      traceId: 'local',
      type: `${ep.scheme}://${ep.host}/docs/${ap.landscape}/${ap.platform}/${ap.service}/${ap.module}/${errorInfo.version}/${errorInfo.id}`,
      data: p,
    };
  }
}

export { DetailFactory };
