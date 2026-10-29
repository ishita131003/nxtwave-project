import { ZodError, type ZodType, type ZodTypeDef } from 'zod';

export type ErrorCode =
  | 'unauthenticated'
  | 'session_expired'
  | 'forbidden'
  | 'validation'
  | 'duplicate_email'
  | 'invalid_credentials'
  | 'rate_limited'
  | 'not_found'
  | 'conflict'
  | 'corrupt_store';

export class ServiceError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export function fieldErrorsOf(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    out[key] ??= issue.message;
  }
  return out;
}

/** Parses with a Zod schema; throws a ServiceError('validation') carrying per-field messages. */
export function parse<Out, In>(schema: ZodType<Out, ZodTypeDef, In>, input: unknown): Out {
  const result = schema.safeParse(input);
  if (!result.success) throw new ServiceError('validation', 'Please fix the highlighted fields.', fieldErrorsOf(result.error));
  return result.data;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ServiceError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}
