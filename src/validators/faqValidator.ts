import { z } from 'zod';

export const createFaqSchema = z.object({
  question: z
    .string()
    .trim()
    .min(5, 'Câu hỏi phải có ít nhất 5 ký tự')
    .max(300, 'Câu hỏi không được quá 300 ký tự'),
  answer: z
    .string()
    .trim()
    .min(5, 'Câu trả lời phải có ít nhất 5 ký tự')
    .max(1000, 'Câu trả lời không được quá 1000 ký tự'),
  category: z.string().trim().max(100, 'Danh mục không được quá 100 ký tự').optional(),
});

export const updateFaqSchema = createFaqSchema
  .extend({
    is_active: z.preprocess((val) => {
      if (typeof val === 'string') return val === 'true';
      return val;
    }, z.boolean().optional()),
  })
  .partial();

export type CreateFaqFormValues = z.infer<typeof createFaqSchema>;
