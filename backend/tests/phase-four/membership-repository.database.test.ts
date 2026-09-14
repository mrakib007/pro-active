import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, test } from "vitest";
import { prisma } from "../../src/infrastructure/database/prisma.js";
import { createMembershipRepository } from "../../src/modules/memberships/membership.repository.js";

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

describe("membership repository", () => {
  test("finds a user and creates a membership with public fields", async () => {
    const owner = await prisma.user.create({
      data: {
        fullName: "Membership Add Owner",
        email: "membership-add-owner-" + randomUUID() + "@example.com",
        passwordHash: "argon2-hash",
      },
    });
    const member = await prisma.user.create({
      data: {
        fullName: "Membership Add Target",
        email: "membership-add-target-" + randomUUID() + "@example.com",
        passwordHash: "argon2-hash",
      },
    });
    createdUserIds.push(owner.id, member.id);

    const workspace = await prisma.workspace.create({
      data: {
        name: "Membership Add " + randomUUID(),
        memberships: { create: { userId: owner.id, role: "OWNER" } },
      },
    });
    createdWorkspaceIds.push(workspace.id);

    const repository = createMembershipRepository();
    const foundUser = await repository.findUserByEmail(member.email);
    const created = await repository.createMembership({
      workspaceId: workspace.id,
      userId: member.id,
      role: "MEMBER",
    });

    expect(foundUser).toEqual({
      id: member.id,
      fullName: "Membership Add Target",
      email: member.email,
    });
    expect(created).toMatchObject({
      workspaceId: workspace.id,
      userId: member.id,
      fullName: "Membership Add Target",
      email: member.email,
      role: "MEMBER",
    });
  });

  test("finds an existing membership by workspace and user", async () => {
    const owner = await prisma.user.create({
      data: {
        fullName: "Membership Lookup Owner",
        email: "membership-lookup-owner-" + randomUUID() + "@example.com",
        passwordHash: "argon2-hash",
      },
    });
    const member = await prisma.user.create({
      data: {
        fullName: "Membership Lookup Target",
        email: "membership-lookup-target-" + randomUUID() + "@example.com",
        passwordHash: "argon2-hash",
      },
    });
    createdUserIds.push(owner.id, member.id);

    const workspace = await prisma.workspace.create({
      data: {
        name: "Membership Lookup " + randomUUID(),
        memberships: {
          create: [
            { userId: owner.id, role: "OWNER" },
            { userId: member.id, role: "MEMBER" },
          ],
        },
      },
    });
    createdWorkspaceIds.push(workspace.id);

    const membership = await prisma.membership.findUniqueOrThrow({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: member.id,
        },
      },
    });

    await expect(
      createMembershipRepository().getMembershipByUserId(
        workspace.id,
        member.id,
      ),
    ).resolves.toMatchObject({
      id: membership.id,
      userId: member.id,
      role: "MEMBER",
    });
  });

  test("lists workspace members with their public user fields", async () => {
    const owner = await prisma.user.create({
      data: {
        fullName: "Workspace Owner",
        email: "membership-owner-" + randomUUID() + "@example.com",
        passwordHash: "argon2-hash",
      },
    });
    const member = await prisma.user.create({
      data: {
        fullName: "Workspace Member",
        email: "membership-member-" + randomUUID() + "@example.com",
        passwordHash: "argon2-hash",
      },
    });
    createdUserIds.push(owner.id, member.id);

    const workspace = await prisma.workspace.create({
      data: {
        name: "Membership Team " + randomUUID(),
        memberships: {
          create: [
            { userId: owner.id, role: "OWNER" },
            { userId: member.id, role: "MEMBER" },
          ],
        },
      },
    });
    createdWorkspaceIds.push(workspace.id);

    const members = await createMembershipRepository().listMembers(
      workspace.id,
    );

    expect(members).toHaveLength(2);
    expect(members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          workspaceId: workspace.id,
          userId: owner.id,
          fullName: "Workspace Owner",
          email: owner.email,
          role: "OWNER",
        }),
        expect.objectContaining({
          workspaceId: workspace.id,
          userId: member.id,
          fullName: "Workspace Member",
          email: member.email,
          role: "MEMBER",
        }),
      ]),
    );
  });

  test("reads access and updates a membership role", async () => {
    const owner = await prisma.user.create({
      data: {
        fullName: "Membership Owner",
        email: "membership-access-owner-" + randomUUID() + "@example.com",
        passwordHash: "argon2-hash",
      },
    });
    const member = await prisma.user.create({
      data: {
        fullName: "Membership Target",
        email: "membership-access-target-" + randomUUID() + "@example.com",
        passwordHash: "argon2-hash",
      },
    });
    createdUserIds.push(owner.id, member.id);

    const workspace = await prisma.workspace.create({
      data: {
        name: "Membership Access " + randomUUID(),
        memberships: {
          create: [
            { userId: owner.id, role: "OWNER" },
            { userId: member.id, role: "MEMBER" },
          ],
        },
      },
    });
    createdWorkspaceIds.push(workspace.id);

    const target = await prisma.membership.findUniqueOrThrow({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: member.id,
        },
      },
    });
    const repository = createMembershipRepository();

    expect(await repository.getWorkspaceAccess(owner.id, workspace.id)).toEqual(
      {
        workspaceId: workspace.id,
        role: "OWNER",
      },
    );
    expect(
      await repository.getMembership(workspace.id, target.id),
    ).toMatchObject({
      id: target.id,
      userId: member.id,
      role: "MEMBER",
    });

    const updated = await repository.updateMembershipRole({
      workspaceId: workspace.id,
      membershipId: target.id,
      role: "ADMIN",
    });

    expect(updated).toMatchObject({
      id: target.id,
      workspaceId: workspace.id,
      userId: member.id,
      role: "ADMIN",
      fullName: "Membership Target",
      email: member.email,
    });
  });

  test("deletes only the requested membership", async () => {
    const owner = await prisma.user.create({
      data: {
        fullName: "Membership Delete Owner",
        email: "membership-delete-owner-" + randomUUID() + "@example.com",
        passwordHash: "argon2-hash",
      },
    });
    const member = await prisma.user.create({
      data: {
        fullName: "Membership Delete Target",
        email: "membership-delete-target-" + randomUUID() + "@example.com",
        passwordHash: "argon2-hash",
      },
    });
    createdUserIds.push(owner.id, member.id);

    const workspace = await prisma.workspace.create({
      data: {
        name: "Membership Delete " + randomUUID(),
        memberships: {
          create: [
            { userId: owner.id, role: "OWNER" },
            { userId: member.id, role: "MEMBER" },
          ],
        },
      },
    });
    createdWorkspaceIds.push(workspace.id);

    const target = await prisma.membership.findUniqueOrThrow({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: member.id,
        },
      },
    });

    await createMembershipRepository().deleteMembership({
      workspaceId: workspace.id,
      membershipId: target.id,
    });

    expect(
      await prisma.membership.findUnique({ where: { id: target.id } }),
    ).toBeNull();
    expect(
      await prisma.membership.count({
        where: { workspaceId: workspace.id, userId: owner.id },
      }),
    ).toBe(1);
  });
});
