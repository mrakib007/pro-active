import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, test } from "vitest";
import { prisma } from "../../src/infrastructure/database/prisma.js";
import {
  createProjectRepository,
  ProjectNotFoundError,
} from "../../src/modules/projects/project.repository.js";

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

async function createUser(label: string) {
  const user = await prisma.user.create({
    data: {
      fullName: label,
      email:
        label.toLowerCase().replaceAll(" ", "-") +
        "-" +
        randomUUID() +
        "@example.com",
      passwordHash: "argon2-hash",
    },
  });
  createdUserIds.push(user.id);
  return user;
}

describe("project repository", () => {
  test("creates and lists projects only inside the requested workspace", async () => {
    const owner = await createUser("Project Owner");
    const otherOwner = await createUser("Other Owner");
    const firstWorkspace = await prisma.workspace.create({
      data: {
        name: "Project Workspace " + randomUUID(),
        memberships: { create: { userId: owner.id, role: "OWNER" } },
      },
    });
    const secondWorkspace = await prisma.workspace.create({
      data: {
        name: "Other Project Workspace " + randomUUID(),
        memberships: { create: { userId: otherOwner.id, role: "OWNER" } },
      },
    });
    createdWorkspaceIds.push(firstWorkspace.id, secondWorkspace.id);

    const repository = createProjectRepository();
    const firstProject = await repository.createProject({
      workspaceId: firstWorkspace.id,
      name: "First project",
      description: null,
    });
    const secondProject = await repository.createProject({
      workspaceId: secondWorkspace.id,
      name: "Second project",
      description: "Other workspace",
    });

    await expect(repository.listProjects(firstWorkspace.id)).resolves.toEqual([
      firstProject,
    ]);
    await expect(repository.listProjects(secondWorkspace.id)).resolves.toEqual([
      secondProject,
    ]);
  });

  test("updates and deletes a project with workspace scoping", async () => {
    const owner = await createUser("Project Editor");
    const workspace = await prisma.workspace.create({
      data: {
        name: "Project Editing " + randomUUID(),
        memberships: { create: { userId: owner.id, role: "OWNER" } },
      },
    });
    createdWorkspaceIds.push(workspace.id);

    const repository = createProjectRepository();
    const created = await repository.createProject({
      workspaceId: workspace.id,
      name: "Before update",
      description: null,
    });
    const updated = await repository.updateProject({
      workspaceId: workspace.id,
      projectId: created.id,
      name: "After update",
      description: "Updated description",
    });

    expect(updated).toMatchObject({
      id: created.id,
      workspaceId: workspace.id,
      name: "After update",
      description: "Updated description",
    });

    await expect(
      repository.updateProject({
        workspaceId: "00000000-0000-0000-0000-000000000000",
        projectId: created.id,
        name: "Wrong workspace",
        description: null,
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);

    await repository.deleteProject({
      workspaceId: workspace.id,
      projectId: created.id,
    });
    await expect(
      prisma.project.findUnique({ where: { id: created.id } }),
    ).resolves.toBeNull();
  });

  test("deleting a workspace cascades to its projects", async () => {
    const owner = await createUser("Project Cascade Owner");
    const workspace = await prisma.workspace.create({
      data: {
        name: "Project Cascade " + randomUUID(),
        memberships: { create: { userId: owner.id, role: "OWNER" } },
      },
    });
    createdWorkspaceIds.push(workspace.id);

    const project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: "Cascading project",
      },
    });

    await prisma.workspace.delete({ where: { id: workspace.id } });
    await expect(
      prisma.project.findUnique({ where: { id: project.id } }),
    ).resolves.toBeNull();
  });
});
