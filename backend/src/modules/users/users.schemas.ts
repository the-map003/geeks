import { z } from 'zod';
import { usernameSchema } from '../auth/auth.schemas.js';

const optionalUrl = z
  .string()
  .trim()
  .max(255)
  .url('Enter a valid URL')
  .or(z.literal(''))
  .optional()
  .transform((v) => (v === '' ? null : v));

export const updateProfileSchema = z
  .object({
    username: usernameSchema.optional(),
    displayName: z.string().trim().min(2).max(60).optional(),
    bio: z.string().trim().max(500).optional().transform((v) => (v === '' ? null : v)),
    avatarUrl: optionalUrl,
    institution: z.string().trim().max(120).optional().transform((v) => (v === '' ? null : v)),
    location: z.string().trim().max(120).optional().transform((v) => (v === '' ? null : v)),
    websiteUrl: optionalUrl,
    githubUrl: optionalUrl,
    linkedinUrl: optionalUrl,
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const usernameParamSchema = z.object({ username: z.string().trim().min(1).max(30) });
