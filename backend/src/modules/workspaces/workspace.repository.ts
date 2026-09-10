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
    async listWorkspacesForUser(userId: string) {
      const memberships = await database.membership.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: {
          role: true,
          workspace: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

      return memberships.map(({ role, workspace }) => ({
        ...workspace,
        role,
      }));
    },

    async getWorkspaceAccess(userId, workspaceId) {
      const membership = await database.membership.findUnique({
        where: {
          workspaceId_userId: {
            userId,
            workspaceId,
          },
        },
        select: { role: true },
      });

      return membership ? { workspaceId, role: membership.role } : null;
    },

    async updateWorkspace({ workspaceId, name }) {
      return database.workspace.update({
        where: { id: workspaceId },
        data: { name },
      });
    },

    async deleteWorkspace(workspaceId) {
      await database.workspace.delete({
        where: { id: workspaceId },
      });
    },

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
