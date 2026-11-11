import { z } from 'zod';
import { hexColorSchema, idSchema, transactionTypeSchema } from './common';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40),
  icon: z.string().trim().min(1).max(40),
  color: hexColorSchema,
  type: transactionTypeSchema,
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(40),
    icon: z.string().trim().min(1).max(40),
    color: hexColorSchema,
    isArchived: z.boolean(),
    sortOrder: z.number().int().min(0),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const reorderCategoriesSchema = z.object({
  ids: z.array(idSchema).min(1).max(200),
});
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;

export const categorySchema = z.object({
  id: idSchema,
  userId: z.string().nullable(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  type: transactionTypeSchema,
  isArchived: z.boolean(),
  sortOrder: z.number().int(),
  isSystem: z.boolean(),
});
export type Category = z.infer<typeof categorySchema>;
