import type { ProblemDetails } from './errors/problem_details.ts';
import type { Problem } from './errors/problem.ts';
import type { HttpResponse } from './lib/zinc/http-client.ts';
import { Err, Ok, Res, type Result } from './lib/core/result.ts';
import type { DetailFactory } from './errors/error_utility.ts';
import { Unauthenticated } from './errors/v1/unauthenticated.ts';
import { Unauthorized } from './errors/v1/unauthorized.ts';
import { LocalStringError } from './errors/v1/local_string_error.ts';
import { LocalExceptionError } from './errors/v1/local_exception_error.ts';
import { LocalUnknownError } from './errors/v1/local_unknown_error.ts';

const isResponse = <T>(value: unknown): value is HttpResponse<T> => {
  return typeof value === 'object' && value !== null && 'error' in value && 'ok' in value && 'data' in value;
};

const isProblem = (value: unknown): value is Problem => {
  return typeof value === 'object' && value !== null && 'detail' in value;
};

const isProblemDetail = (value: unknown): value is ProblemDetails => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'detail' in value &&
    'status' in value &&
    'title' in value &&
    'type' in value
  );
};

class Utility {
  constructor(private readonly detail: DetailFactory) {}

  toResult<T>(
    // biome-ignore lint/suspicious/noExplicitAny: Generic HTTP requires generic any
    f: () => Promise<HttpResponse<T, any>>,
    localErrorDetail: string,
  ): Result<T, ProblemDetails> {
    return Res.async(async () => {
      try {
        const r = await f();

        if (r.ok) return Ok(r.data);
        const problem = await this.parseErrorResponse(r);
        return Err(problem);
      } catch (e) {
        if (isResponse(e)) {
          const problem = await this.parseErrorResponse(e);
          return Err(problem);
        }
        const p = this.parseError(localErrorDetail, e);
        return Err(this.detail.toDetail(p));
      }
    });
  }

  async parseErrorResponse<T>(
    // biome-ignore lint/suspicious/noExplicitAny: Generic HTTP requires generic any
    r: HttpResponse<T, any>,
  ): Promise<ProblemDetails> {
    if (!isProblemDetail(r.error) && (r.status === 401 || r.status === 403)) {
      return this.detail.toDetail(
        r.status === 401
          ? new Unauthenticated('You need to be logged in to view this page.')
          : new Unauthorized('You do not have permission to view this page.', [], []),
      );
    }
    if (r.error == null) {
      const t = (await r.text()) ?? 'No body found';
      return this.detail.toDetail(new LocalStringError('Unknown client error', t));
    }
    return this.parseErrorToDetail('Unknown client error', r.error);
  }

  parseErrorToDetail(detail: string, error: unknown): ProblemDetails {
    if (isProblemDetail(error)) return error;
    return this.detail.toDetail(this.parseError(detail, error));
  }

  parseError(detail: string, error: unknown): Problem {
    console.error(error);
    if (error instanceof Error) return new LocalExceptionError(detail, error);
    if (typeof error === 'string') return new LocalStringError(detail, error);
    if (isProblem(error)) return error;
    return new LocalUnknownError(detail, error);
  }
}

const __ = (i: number) => new Promise(resolve => setTimeout(resolve, i * 1000));

function compare(a?: string | null, b?: string | null): boolean {
  if (a == null || b == null) return false;
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x.includes(y) || y.includes(x);
}

const noop = () => {};

export { Utility, noop, compare, __, isProblemDetail, isProblem, isResponse };
