import { z } from "zod";

const projectNameSchema = z
  .string()
  .trim()
  .min(1, "Project name is required")
  .max(100, "Project name is too long");

const projectDescriptionSchema = z
  .string()
  .trim()
  .max(500, "Project description is too long");

export const createProjectSchema = z
  .object({
    name: projectNameSchema,
    description: projectDescriptionSchema.optional(),
  })
  .strict();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({
    name: projectNameSchema,
    description: projectDescriptionSchema.optional(),
  })
  .strict();

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
