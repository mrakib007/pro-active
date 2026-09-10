import { MembershipRole } from "@prisma/client";
import { describe, expect, test } from "vitest";
import { createWorkspaceService } from "../../src/modules/workspaces/workspace.service.js";
import type {
  CreatedWorkspace,
  StoredWorkspace,
  WorkspaceRepository,
} from "../../src/modules/workspaces/workspace.types.js";

const createdWorkspace: CreatedWorkspace = {
  workspace: {
    id: "workspace-id",
    name: "Product Team",
    createdAt: new Date("2026-09-06T00:00:00.000Z"),
    updatedAt: new Date("2026-09-06T00:00:00.000Z"),
  },
  membership: {
    id: "membership-id",
    workspaceId: "workspace-id",
    userId: "user-id",
    role: "OWNER",
    createdAt: new Date("2026-09-06T00:00:00.000Z"),
  },
};

const renamedWorkspace: StoredWorkspace = {
  id: "workspace-id",
  name: "Product Team Renamed",
  createdAt: new Date("2026-09-06T00:00:00.000Z"),
  updatedAt: new Date("2026-09-07T00:00:00.000Z"),
};

type WorkspaceManagementService = {
  updateWorkspace(
    userId: string,
    workspaceId: string,
    input: { name: string },
  ): Promise<StoredWorkspace>;
  deleteWorkspace(userId: string, workspaceId: string): Promise<void>;
};

describe("workspace service", () => {
  test("lists workspaces for the requested user", async () => {
    const listedWorkspaces = [
      {
        id: "workspace-id",
        name: "Product Team",
        createdAt: new Date("2026-09-06T00:00:00.000Z"),
        updatedAt: new Date("2026-09-06T00:00:00.000Z"),
        role: MembershipRole.OWNER,
      },
    ];
    let requestedUserId: string | undefined;
    const workspaceRepository: WorkspaceRepository = {
      createWorkspaceWithOwner: async () => createdWorkspace,
      listWorkspacesForUser: async (userId: string) => {
        requestedUserId = userId;
        return listedWorkspaces;
      },
      getWorkspaceAccess: async () => null,
      updateWorkspace: async () => renamedWorkspace,
      deleteWorkspace: async () => undefined,
    };
    const service = createWorkspaceService({ workspaceRepository });

    const result = await service.listWorkspaces("user-id");

    expect(requestedUserId).toBe("user-id");
    expect(result).toEqual(listedWorkspaces);
  });

  test("normalizes the workspace name before persistence", async () => {
    let repositoryInput:
      | Parameters<WorkspaceRepository["createWorkspaceWithOwner"]>[0]
      | undefined;
    const workspaceRepository: WorkspaceRepository = {
      listWorkspacesForUser: async () => [],
      createWorkspaceWithOwner: async (input) => {
        repositoryInput = input;
        return createdWorkspace;
      },
      getWorkspaceAccess: async () => null,
      updateWorkspace: async () => renamedWorkspace,
      deleteWorkspace: async () => undefined,
    };
    const service = createWorkspaceService({ workspaceRepository });

    await service.createWorkspace("user-id", { name: "  Product Team  " });

    expect(repositoryInput).toEqual({
      name: "Product Team",
      userId: "user-id",
    });
  });

  test("rejects an empty workspace name before persistence", async () => {
    let repositoryCalls = 0;
    const workspaceRepository: WorkspaceRepository = {
      listWorkspacesForUser: async () => [],
      createWorkspaceWithOwner: async () => {
        repositoryCalls += 1;
        return createdWorkspace;
      },
      getWorkspaceAccess: async () => null,
      updateWorkspace: async () => renamedWorkspace,
      deleteWorkspace: async () => undefined,
    };
    const service = createWorkspaceService({ workspaceRepository });

    await expect(
      service.createWorkspace("user-id", { name: "" }),
    ).rejects.toMatchObject({ name: "ZodError" });
    expect(repositoryCalls).toBe(0);
  });

  test("normalizes the workspace name before updating it", async () => {
    let repositoryInput: { workspaceId: string; name: string } | undefined;
    const workspaceRepository = {
      listWorkspacesForUser: async () => [],
      createWorkspaceWithOwner: async () => createdWorkspace,
      getWorkspaceAccess: async () => ({
        workspaceId: "workspace-id",
        role: MembershipRole.OWNER,
      }),
      updateWorkspace: async (input: { workspaceId: string; name: string }) => {
        repositoryInput = input;
        return renamedWorkspace;
      },
      deleteWorkspace: async () => undefined,
    };
    const service = createWorkspaceService({ workspaceRepository });
    const managementService = service as unknown as WorkspaceManagementService;

    const result = await managementService.updateWorkspace(
      "user-id",
      "workspace-id",
      { name: "  Product Team Renamed  " },
    );

    expect(repositoryInput).toEqual({
      workspaceId: "workspace-id",
      name: "Product Team Renamed",
    });
    expect(result).toEqual(renamedWorkspace);
  });

  test("allows administrators to update a workspace", async () => {
    let updateCalls = 0;
    const workspaceRepository = {
      listWorkspacesForUser: async () => [],
      createWorkspaceWithOwner: async () => createdWorkspace,
      getWorkspaceAccess: async () => ({
        workspaceId: "workspace-id",
        role: MembershipRole.ADMIN,
      }),
      updateWorkspace: async () => {
        updateCalls += 1;
        return renamedWorkspace;
      },
      deleteWorkspace: async () => undefined,
    };
    const service = createWorkspaceService({ workspaceRepository });
    const managementService = service as unknown as WorkspaceManagementService;

    await managementService.updateWorkspace("user-id", "workspace-id", {
      name: "Renamed",
    });

    expect(updateCalls).toBe(1);
  });

  test("rejects a member from updating a workspace", async () => {
    let updateCalls = 0;
    const workspaceRepository = {
      listWorkspacesForUser: async () => [],
      createWorkspaceWithOwner: async () => createdWorkspace,
      getWorkspaceAccess: async () => ({
        workspaceId: "workspace-id",
        role: MembershipRole.MEMBER,
      }),
      updateWorkspace: async () => {
        updateCalls += 1;
        return renamedWorkspace;
      },
      deleteWorkspace: async () => undefined,
    };
    const service = createWorkspaceService({ workspaceRepository });
    const managementService = service as unknown as WorkspaceManagementService;

    await expect(
      managementService.updateWorkspace("user-id", "workspace-id", {
        name: "Renamed",
      }),
    ).rejects.toMatchObject({
      code: "WORKSPACE_FORBIDDEN",
      statusCode: 403,
    });
    expect(updateCalls).toBe(0);
  });

  test("allows only the owner to delete a workspace", async () => {
    let deleteCalls = 0;
    const workspaceRepository = {
      listWorkspacesForUser: async () => [],
      createWorkspaceWithOwner: async () => createdWorkspace,
      getWorkspaceAccess: async () => ({
        workspaceId: "workspace-id",
        role: MembershipRole.OWNER,
      }),
      updateWorkspace: async () => renamedWorkspace,
      deleteWorkspace: async (workspaceId: string) => {
        expect(workspaceId).toBe("workspace-id");
        deleteCalls += 1;
      },
    };
    const service = createWorkspaceService({ workspaceRepository });
    const managementService = service as unknown as WorkspaceManagementService;

    await managementService.deleteWorkspace("user-id", "workspace-id");

    expect(deleteCalls).toBe(1);
  });

  test("rejects a non-owner from deleting a workspace", async () => {
    let deleteCalls = 0;
    const workspaceRepository = {
      listWorkspacesForUser: async () => [],
      createWorkspaceWithOwner: async () => createdWorkspace,
      getWorkspaceAccess: async () => ({
        workspaceId: "workspace-id",
        role: MembershipRole.ADMIN,
      }),
      updateWorkspace: async () => renamedWorkspace,
      deleteWorkspace: async () => {
        deleteCalls += 1;
      },
    };
    const service = createWorkspaceService({ workspaceRepository });
    const managementService = service as unknown as WorkspaceManagementService;

    await expect(
      managementService.deleteWorkspace("user-id", "workspace-id"),
    ).rejects.toMatchObject({
      code: "WORKSPACE_FORBIDDEN",
      statusCode: 403,
    });
    expect(deleteCalls).toBe(0);
  });
});
