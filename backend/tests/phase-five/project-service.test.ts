import { describe, expect, test, vi } from "vitest";
import { createProjectService } from "../../src/modules/projects/project.service.js";
import type {
  ProjectRepository,
  StoredProject,
} from "../../src/modules/projects/project.types.js";

const project: StoredProject = {
  id: "project-id",
  workspaceId: "workspace-id",
  name: "Editorial launch",
  description: "Prepare the next release.",
  createdAt: new Date("2026-09-14T00:00:00.000Z"),
  updatedAt: new Date("2026-09-14T00:00:00.000Z"),
};

function makeRepository(
  overrides: Partial<ProjectRepository> = {},
): ProjectRepository {
  return {
    getWorkspaceAccess: async () => ({
      workspaceId: "workspace-id",
      role: "OWNER",
    }),
    listProjects: async () => [project],
    createProject: async () => project,
    getProject: async () => project,
    updateProject: async () => project,
    deleteProject: async () => undefined,
    ...overrides,
  };
}

describe("project service", () => {
  test("normalizes a project before an owner creates it", async () => {
    const createProject = vi.fn(async () => project);
    const service = createProjectService({
      projectRepository: makeRepository({ createProject }),
    });

    await service.createProject("owner-id", "workspace-id", {
      name: "  Editorial launch  ",
      description: "  Prepare the next release.  ",
    });

    expect(createProject).toHaveBeenCalledWith({
      workspaceId: "workspace-id",
      name: "Editorial launch",
      description: "Prepare the next release.",
    });
  });

  test("stores an empty description as null", async () => {
    const createProject = vi.fn(async () => project);
    const service = createProjectService({
      projectRepository: makeRepository({ createProject }),
    });

    await service.createProject("owner-id", "workspace-id", {
      name: "Editorial launch",
      description: "   ",
    });

    expect(createProject).toHaveBeenCalledWith({
      workspaceId: "workspace-id",
      name: "Editorial launch",
      description: null,
    });
  });

  test("allows an administrator to create a project", async () => {
    const createProject = vi.fn(async () => project);
    const service = createProjectService({
      projectRepository: makeRepository({
        getWorkspaceAccess: async () => ({
          workspaceId: "workspace-id",
          role: "ADMIN",
        }),
        createProject,
      }),
    });

    await service.createProject("admin-id", "workspace-id", {
      name: "Editorial launch",
    });

    expect(createProject).toHaveBeenCalled();
  });

  test("allows any workspace member to list projects", async () => {
    const listProjects = vi.fn(async () => [project]);
    const service = createProjectService({
      projectRepository: makeRepository({ listProjects }),
    });

    await expect(
      service.listProjects("member-id", "workspace-id"),
    ).resolves.toEqual([project]);
    expect(listProjects).toHaveBeenCalledWith("workspace-id");
  });

  test("rejects a member from creating a project", async () => {
    const createProject = vi.fn(async () => project);
    const service = createProjectService({
      projectRepository: makeRepository({
        getWorkspaceAccess: async () => ({
          workspaceId: "workspace-id",
          role: "MEMBER",
        }),
        createProject,
      }),
    });

    await expect(
      service.createProject("member-id", "workspace-id", {
        name: "Editorial launch",
      }),
    ).rejects.toMatchObject({
      code: "PROJECT_FORBIDDEN",
      statusCode: 403,
    });
    expect(createProject).not.toHaveBeenCalled();
  });

  test("hides projects from users without workspace membership", async () => {
    const listProjects = vi.fn(async () => [project]);
    const service = createProjectService({
      projectRepository: makeRepository({
        getWorkspaceAccess: async () => null,
        listProjects,
      }),
    });

    await expect(
      service.listProjects("outsider-id", "workspace-id"),
    ).rejects.toMatchObject({
      code: "WORKSPACE_NOT_FOUND",
      statusCode: 404,
    });
    expect(listProjects).not.toHaveBeenCalled();
  });

  test("allows an owner to update a project in the requested workspace", async () => {
    const updateProject = vi.fn(async () => project);
    const service = createProjectService({
      projectRepository: makeRepository({ updateProject }),
    });

    await service.updateProject("owner-id", "workspace-id", "project-id", {
      name: "  Editorial launch v2 ",
      description: "  Updated release plan ",
    });

    expect(updateProject).toHaveBeenCalledWith({
      workspaceId: "workspace-id",
      projectId: "project-id",
      name: "Editorial launch v2",
      description: "Updated release plan",
    });
  });

  test("rejects a member from updating a project", async () => {
    const updateProject = vi.fn(async () => project);
    const service = createProjectService({
      projectRepository: makeRepository({
        getWorkspaceAccess: async () => ({
          workspaceId: "workspace-id",
          role: "MEMBER",
        }),
        updateProject,
      }),
    });

    await expect(
      service.updateProject("member-id", "workspace-id", "project-id", {
        name: "New name",
      }),
    ).rejects.toMatchObject({
      code: "PROJECT_FORBIDDEN",
      statusCode: 403,
    });
    expect(updateProject).not.toHaveBeenCalled();
  });

  test("allows an administrator to delete a project", async () => {
    const deleteProject = vi.fn(async () => undefined);
    const service = createProjectService({
      projectRepository: makeRepository({
        getWorkspaceAccess: async () => ({
          workspaceId: "workspace-id",
          role: "ADMIN",
        }),
        deleteProject,
      }),
    });

    await service.deleteProject("admin-id", "workspace-id", "project-id");

    expect(deleteProject).toHaveBeenCalledWith({
      workspaceId: "workspace-id",
      projectId: "project-id",
    });
  });

  test("returns project-not-found when the project is outside the workspace", async () => {
    const updateProject = vi.fn(async () => project);
    const service = createProjectService({
      projectRepository: makeRepository({
        getProject: async () => null,
        updateProject,
      }),
    });

    await expect(
      service.updateProject("owner-id", "workspace-id", "other-project-id", {
        name: "New name",
      }),
    ).rejects.toMatchObject({
      code: "PROJECT_NOT_FOUND",
      statusCode: 404,
    });
    expect(updateProject).not.toHaveBeenCalled();
  });
});
