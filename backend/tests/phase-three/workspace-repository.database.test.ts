import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, test } from "vitest";
import { prisma } from "../../src/infrastructure/database/prisma.js";
import { createWorkspaceRepository } from "../../src/modules/workspaces/workspace.repository.js";

const createdWorkspaceIds: string[] = [];
const createdUserIds: string[] = [];

afterEach(async () => {
  const workspaceIds = createdWorkspaceIds.splice(0);
  if (workspaceIds.length > 0) {
    await prisma.workspace.deleteMany({
      where: { id: { in: workspaceIds } },
    });
  }

  const userIds = createdUserIds.splice(0);
  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
});

describe("workspace repository", () => {
  test("lists only the requested user's workspaces and their roles", async () => {
    const user = await prisma.user.create({
      data: {
        fullName: "Workspace Member",
        email: "workspace-member-" + randomUUID() + "@example.com",
        passwordHash: "argon2-hash",
      },
    });
    const otherUser = await prisma.user.create({
      data: {
        fullName: "Other Workspace Owner",
        email: "other-workspace-owner-" + randomUUID() + "@example.com",
        passwordHash: "argon2-hash",
      },
    });
    createdUserIds.push(user.id, otherUser.id);

    const ownedWorkspace =
      await createWorkspaceRepository().createWorkspaceWithOwner({
        name: "Owned " + randomUUID(),
        userId: user.id,
      });
    const sharedWorkspace =
      await createWorkspaceRepository().createWorkspaceWithOwner({
        name: "Shared " + randomUUID(),
        userId: otherUser.id,
      });
    createdWorkspaceIds.push(
      ownedWorkspace.workspace.id,
      sharedWorkspace.workspace.id,
    );
    await prisma.membership.create({
      data: {
        workspaceId: sharedWorkspace.workspace.id,
        userId: user.id,
        role: "MEMBER",
      },
    });

    const repository = createWorkspaceRepository();

    const userWorkspaces = await repository.listWorkspacesForUser(user.id);
    const otherUserWorkspaces = await repository.listWorkspacesForUser(
      otherUser.id,
    );

    expect(userWorkspaces).toHaveLength(2);
    expect(userWorkspaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: ownedWorkspace.workspace.id,
          role: "OWNER",
        }),
        expect.objectContaining({
          id: sharedWorkspace.workspace.id,
          role: "MEMBER",
        }),
      ]),
    );
    expect(otherUserWorkspaces).toHaveLength(1);
    expect(otherUserWorkspaces[0]).toMatchObject({
      id: sharedWorkspace.workspace.id,
      role: "OWNER",
    });
  });

  test("creates a workspace and its owner membership", async () => {
    const user = await prisma.user.create({
      data: {
        fullName: "Workspace Owner",
        email: "workspace-owner-" + randomUUID() + "@example.com",
        passwordHash: "argon2-hash",
      },
    });
    createdUserIds.push(user.id);

    const workspaceName = "Product Team " + randomUUID();
    const result = await createWorkspaceRepository().createWorkspaceWithOwner({
      name: workspaceName,
      userId: user.id,
    });
    createdWorkspaceIds.push(result.workspace.id);

    expect(result.workspace).toMatchObject({
      id: expect.any(String),
      name: workspaceName,
    });
    expect(result.membership).toMatchObject({
      workspaceId: result.workspace.id,
      userId: user.id,
      role: "OWNER",
    });

    const persistedWorkspace = await prisma.workspace.findUnique({
      where: { id: result.workspace.id },
      include: { memberships: true },
    });

    expect(persistedWorkspace?.memberships).toHaveLength(1);
    expect(persistedWorkspace?.memberships[0]).toMatchObject({
      userId: user.id,
      role: "OWNER",
    });
  });

  test("rolls back the workspace when the owner membership cannot be created", async () => {
    const workspaceName = "Rollback " + randomUUID();

    await expect(
      createWorkspaceRepository().createWorkspaceWithOwner({
        name: workspaceName,
        userId: randomUUID(),
      }),
    ).rejects.toThrow();

    expect(
      await prisma.workspace.findMany({
        where: { name: workspaceName },
        include: { memberships: true },
      }),
    ).toEqual([]);
  });
});
