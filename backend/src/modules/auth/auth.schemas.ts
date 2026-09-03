import { z } from "zod";

export const registerUserSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Full name is required")
      .max(100, "Full name is too long"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address")
      .max(320, "Email address is too long"),
    password: z
      .string()
      .min(8, "Password must be at least eight characters")
      .max(128, "Password must be at most 128 characters"),
  })
  .strict();

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

export const loginUserSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address")
      .max(320, "Email address is too long"),
    password: z
      .string()
      .min(8, "Password must be at least eight characters")
      .max(128, "Password must be at most 128 characters"),
  })
  .strict();

export type LoginUserInput = z.infer<typeof loginUserSchema>;
