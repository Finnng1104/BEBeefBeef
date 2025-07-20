import { z } from 'zod';

export const ingredientSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, {
      message: 'Slug must be alphanumeric and can contain hyphens',
    }),
  unit: z.enum(['kg', 'gram', 'mg', 'litre', 'ml', 'pcs', 'pack', 'box', 'bottle', 'can', 'unit']),
  group: z.string().max(50).optional(),
  subGroup: z.string().max(50).optional(),
  price_per_unit: z
    .number()
    .min(0)
    .transform((val) => parseFloat(val.toFixed(2))),
  lowStockThreshold: z.number().min(0).optional(),
});

export type IngredientInput = z.infer<typeof ingredientSchema>;
