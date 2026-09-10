import { MembershipRole } from "@prisma/client";
import { describe, expect, test } from "vitest";
import { createWorkspaceService } from "../../src/modules/workspaces/workspace.service.js";
import type {
  CreatedWorkspace,
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
    };
    const service = createWorkspaceService({ workspaceRepository });

    await expect(
      service.createWorkspace("user-id", { name: "" }),
    ).rejects.toMatchObject({ name: "ZodError" });
    expect(repositoryCalls).toBe(0);
  });
});
