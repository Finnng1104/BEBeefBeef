import z from 'zod';

export const categorySchema = z.object({
  Cate_name: z.string().min(1, 'Tên danh mục là bắt buộc'),
  Cate_slug: z.string().min(1, 'Slug là bắt buộc'),
  Cate_type: z.enum(['dish', 'drink'], {
    required_error: 'Loại danh mục là bắt buộc',
  }),
  parentCate: z.string().optional().nullable(),
});

export const createCategorySchema = categorySchema;

export const updateCategorySchema = categorySchema.partial().extend({
  id: z.string().min(1, 'ID là bắt buộc'),
});

export const categoryQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => !isNaN(val), {
      message: 'Page phải là một số',
    }),

  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => !isNaN(val), {
      message: 'Limit phải là một số',
    }),

  search: z.string().optional(),
});
