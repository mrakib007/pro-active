import { AppError } from "../../errors.js";
import {
  createProjectRepository,
  ProjectNotFoundError,
} from "./project.repository.js";
import { createProjectSchema, updateProjectSchema } from "./project.schemas.js";
import type {
  ProjectAccess,
  ProjectRepository,
  ProjectService,
  StoredProject,
} from "./project.types.js";

export interface ProjectServiceDependencies {
  projectRepository?: ProjectRepository;
}

function workspaceNotFoundError() {
  return new AppError(404, "WORKSPACE_NOT_FOUND", "Workspace not found");
}

function projectNotFoundError() {
  return new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
}

function projectForbiddenError() {
  return new AppError(
    403,
    "PROJECT_FORBIDDEN",
    "You do not have permission to manage this project",
  );
}

function requireWorkspaceAccess(access: ProjectAccess | null) {
  if (!access) {
    throw workspaceNotFoundError();
  }

  return access;
}

function requireProject(project: StoredProject | null) {
  if (!project) {
    throw projectNotFoundError();
  }

  return project;
}

function requireManagementAccess(access: ProjectAccess) {
  if (access.role !== "OWNER" && access.role !== "ADMIN") {
    throw projectForbiddenError();
  }
}

function normalizeDescription(description?: string): string | null {
  const normalized = description?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function mapRepositoryError(error: unknown): never {
  if (error instanceof ProjectNotFoundError) {
    throw projectNotFoundError();
  }

  throw error;
}

export function createProjectService({
  projectRepository = createProjectRepository(),
}: ProjectServiceDependencies = {}): ProjectService {
  return {
    async listProjects(actorUserId, workspaceId) {
      requireWorkspaceAccess(
        await projectRepository.getWorkspaceAccess(actorUserId, workspaceId),
      );

      return projectRepository.listProjects(workspaceId);
    },

    async createProject(actorUserId, workspaceId, input) {
      const values = createProjectSchema.parse(input);
      const access = requireWorkspaceAccess(
        await projectRepository.getWorkspaceAccess(actorUserId, workspaceId),
      );
      requireManagementAccess(access);

      return projectRepository.createProject({
        workspaceId,
        name: values.name,
        description: normalizeDescription(values.description),
      });
    },

    async updateProject(actorUserId, workspaceId, projectId, input) {
      const values = updateProjectSchema.parse(input);
      const access = requireWorkspaceAccess(
        await projectRepository.getWorkspaceAccess(actorUserId, workspaceId),
      );
      requireManagementAccess(access);
      requireProject(
        await projectRepository.getProject(workspaceId, projectId),
      );

      try {
        return await projectRepository.updateProject({
          workspaceId,
          projectId,
          name: values.name,
          description: normalizeDescription(values.description),
        });
      } catch (error: unknown) {
        return mapRepositoryError(error);
      }
    },

    async deleteProject(actorUserId, workspaceId, projectId) {
      const access = requireWorkspaceAccess(
        await projectRepository.getWorkspaceAccess(actorUserId, workspaceId),
      );
      requireManagementAccess(access);
      requireProject(
        await projectRepository.getProject(workspaceId, projectId),
      );

      try {
        await projectRepository.deleteProject({ workspaceId, projectId });
      } catch (error: unknown) {
        mapRepositoryError(error);
      }
    },
  };
}
