import { z } from "zod";

export const createMembershipSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address")
      .max(320, "Email address is too long"),
    role: z.enum(["ADMIN", "MEMBER"]),
  })
  .strict();

export type CreateMembershipInput = z.infer<typeof createMembershipSchema>;

export const updateMembershipSchema = z
  .object({
    role: z.enum(["ADMIN", "MEMBER"]),
  })
  .strict();

export type UpdateMembershipInput = z.infer<typeof updateMembershipSchema>;
