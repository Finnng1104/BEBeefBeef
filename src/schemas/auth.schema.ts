import { z } from 'zod';

export const registerSchema = z
  .object({
    username: z.string().min(1, 'Username is required'),
    email: z.string().email('Invalid email format'),
    password: z
      .string()
      .min(8)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/,
        'Password must contain at least 8 characters, 1 uppercase, 1 lowercase, and 1 number',
      ),
    confirmPassword: z.string(),
    roles: z.array(z.string()).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});
export const changePasswordSchema = z
  .object({
    email: z.string().email(),
    newPassword: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type Register = z.infer<typeof registerSchema>;
export type Login = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
