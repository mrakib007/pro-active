import { z } from "zod";

export const updateMembershipSchema = z
  .object({
    role: z.enum(["ADMIN", "MEMBER"]),
  })
  .strict();

export type UpdateMembershipInput = z.infer<typeof updateMembershipSchema>;
