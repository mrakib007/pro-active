import { prisma } from "../../infrastructure/database/prisma.js";
import type { PrismaClient } from "@prisma/client";
import type {
  CreateWorkspaceWithOwnerRecord,
  CreatedWorkspace,
  WorkspaceRepository,
} from "./workspace.types.js";

export function createWorkspaceRepository(
  database: PrismaClient = prisma,
): WorkspaceRepository {
  return {
    async createWorkspaceWithOwner(
      input: CreateWorkspaceWithOwnerRecord,
    ): Promise<CreatedWorkspace> {
      return database.$transaction(async (transaction) => {
        const workspace = await transaction.workspace.create({
          data: { name: input.name },
        });
        const membership = await transaction.membership.create({
          data: {
            workspaceId: workspace.id,
            userId: input.userId,
            role: "OWNER",
          },
        });

        return { workspace, membership };
      });
    },
  };
}
