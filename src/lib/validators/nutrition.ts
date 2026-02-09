import { z } from 'zod';

/**
 * Nutrition search query parameters validation
 */
export const nutritionSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(200, 'Query too long'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().min(1).max(50)),
  dataType: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',') : undefined)),
});

export type NutritionSearchInput = z.infer<typeof nutritionSearchSchema>;
