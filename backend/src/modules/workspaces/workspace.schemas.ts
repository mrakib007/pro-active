import { z } from "zod";

const workspaceNameSchema = z
  .string()
  .trim()
  .min(1, "Workspace name is required")
  .max(100, "Workspace name is too long");

export const createWorkspaceSchema = z
  .object({ name: workspaceNameSchema })
  .strict();

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = z
  .object({ name: workspaceNameSchema })
  .strict();

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
