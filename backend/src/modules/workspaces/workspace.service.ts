import { AppError } from "../../errors.js";
import { createWorkspaceRepository } from "./workspace.repository.js";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
} from "./workspace.schemas.js";
import type {
  WorkspaceAccess,
  WorkspaceRepository,
  WorkspaceService,
} from "./workspace.types.js";

export interface WorkspaceServiceDependencies {
  workspaceRepository?: WorkspaceRepository;
}

function workspaceNotFoundError() {
  return new AppError(404, "WORKSPACE_NOT_FOUND", "Workspace not found");
}

function workspaceForbiddenError() {
  return new AppError(
    403,
    "WORKSPACE_FORBIDDEN",
    "You do not have permission to manage this workspace",
  );
}

function requireWorkspaceAccess(access: WorkspaceAccess | null) {
  if (!access) {
    throw workspaceNotFoundError();
  }

  return access;
}

export function createWorkspaceService({
  workspaceRepository = createWorkspaceRepository(),
}: WorkspaceServiceDependencies = {}): WorkspaceService {
  return {
    async listWorkspaces(userId) {
      return workspaceRepository.listWorkspacesForUser(userId);
    },

    async createWorkspace(userId, input) {
      const values = createWorkspaceSchema.parse(input);

      return workspaceRepository.createWorkspaceWithOwner({
        name: values.name,
        userId,
      });
    },

    async updateWorkspace(userId, workspaceId, input) {
      const values = updateWorkspaceSchema.parse(input);
      const access = requireWorkspaceAccess(
        await workspaceRepository.getWorkspaceAccess(userId, workspaceId),
      );

      if (access.role !== "OWNER" && access.role !== "ADMIN") {
        throw workspaceForbiddenError();
      }

      return workspaceRepository.updateWorkspace({
        workspaceId,
        name: values.name,
      });
    },

    async deleteWorkspace(userId, workspaceId) {
      const access = requireWorkspaceAccess(
        await workspaceRepository.getWorkspaceAccess(userId, workspaceId),
      );

      if (access.role !== "OWNER") {
        throw workspaceForbiddenError();
      }

      await workspaceRepository.deleteWorkspace(workspaceId);
    },
  };
}
