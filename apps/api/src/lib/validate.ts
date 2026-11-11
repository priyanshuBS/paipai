import { validator } from 'hono/validator';
import type { ValidationTargets } from 'hono';
import type { z } from 'zod';
import { AppError } from './errors';

/**
 * Zod-backed request validator that responds with a structured 400:
 * { error: { code: 'VALIDATION_ERROR', message, details: [{ path, message }] } }
 */
export function zv<Target extends keyof ValidationTargets, Schema extends z.ZodType>(
  target: Target,
  schema: Schema,
) {
  return validator(target, async (value): Promise<z.output<Schema>> => {
    const result = await schema.safeParseAsync(value);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        details[0]?.message ?? 'Invalid request',
        details,
      );
    }
    return result.data;
  });
}
