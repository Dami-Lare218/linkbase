import { z } from "zod";

// bcrypt ignores everything past 72 bytes, so the limit is in bytes, not characters.
const PASSWORD_MIN_CHARS = 8;
const PASSWORD_MAX_BYTES = 72;

const emailSchema = z
  .string({ error: "Enter your email address." })
  .trim()
  .toLowerCase()
  .min(1, { error: "Enter your email address." })
  .max(254, { error: "Email must be 254 characters or fewer." })
  .pipe(z.email({ error: "Enter a valid email address." }));

export const signUpSchema = z.object({
  name: z
    .string({ error: "Enter your name." })
    .trim()
    .min(1, { error: "Enter your name." })
    .max(50, { error: "Name must be 50 characters or fewer." }),
  email: emailSchema,
  password: z
    .string({ error: "Enter a password." })
    .min(PASSWORD_MIN_CHARS, {
      error: `Password must be at least ${PASSWORD_MIN_CHARS} characters.`,
    })
    .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES, {
      error: "Password is too long. Use 72 characters or fewer.",
    }),
});

// No length rules beyond a sanity cap: login only checks the password against the stored hash.
export const logInSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "Enter your password." })
    .min(1, { error: "Enter your password." })
    .max(1024, { error: "Invalid email or password." }),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LogInInput = z.infer<typeof logInSchema>;
