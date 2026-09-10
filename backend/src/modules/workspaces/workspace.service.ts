import { createWorkspaceRepository } from "./workspace.repository.js";
import { createWorkspaceSchema } from "./workspace.schemas.js";
import type {
  WorkspaceRepository,
  WorkspaceService,
} from "./workspace.types.js";

export interface WorkspaceServiceDependencies {
  workspaceRepository?: WorkspaceRepository;
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
  };
}
