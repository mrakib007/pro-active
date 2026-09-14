import { describe, expect, test, vi } from "vitest";
import { createMembershipService } from "../../src/modules/memberships/membership.service.js";
import type {
  MembershipRepository,
  StoredMembership,
} from "../../src/modules/memberships/membership.types.js";

const ownerMembership: StoredMembership = {
  id: "owner-membership-id",
  workspaceId: "workspace-id",
  userId: "owner-id",
  role: "OWNER",
  createdAt: new Date("2026-09-06T00:00:00.000Z"),
};
const adminMembership: StoredMembership = {
  id: "admin-membership-id",
  workspaceId: "workspace-id",
  userId: "admin-id",
  role: "ADMIN",
  createdAt: new Date("2026-09-06T00:00:00.000Z"),
};
const memberMembership: StoredMembership = {
  id: "member-membership-id",
  workspaceId: "workspace-id",
  userId: "member-id",
  role: "MEMBER",
  createdAt: new Date("2026-09-07T00:00:00.000Z"),
};
const memberView = {
  ...memberMembership,
  fullName: "Nadia Ahmed",
  email: "nadia@example.com",
};

function makeRepository(
  overrides: Partial<MembershipRepository> = {},
): MembershipRepository {
  return {
    getWorkspaceAccess: async () => ({
      workspaceId: "workspace-id",
      role: "OWNER",
    }),
    listMembers: async () => [memberView],
    getMembership: async () => memberMembership,
    findUserByEmail: async () => ({
      id: "new-member-id",
      fullName: "Fahim Rahman",
      email: "fahim@example.com",
    }),
    getMembershipByUserId: async () => null,
    createMembership: async () => ({
      ...memberView,
      userId: "new-member-id",
      fullName: "Fahim Rahman",
      email: "fahim@example.com",
    }),
    updateMembershipRole: async () => ({
      ...memberView,
      role: "ADMIN",
    }),
    deleteMembership: async () => undefined,
    ...overrides,
  };
}

describe("membership service", () => {
  test("allows an owner to add an administrator", async () => {
    const createMembership = vi.fn(async () => ({
      ...memberView,
      userId: "new-member-id",
      role: "ADMIN" as const,
    }));
    const service = createMembershipService({
      membershipRepository: makeRepository({ createMembership }),
    });

    await service.addMember("owner-id", "workspace-id", {
      email: "Fahim@Example.com",
      role: "ADMIN",
    });

    expect(createMembership).toHaveBeenCalledWith({
      workspaceId: "workspace-id",
      userId: "new-member-id",
      role: "ADMIN",
    });
  });

  test("allows an admin to add a member", async () => {
    const createMembership = vi.fn(async () => ({
      ...memberView,
      userId: "new-member-id",
      role: "MEMBER" as const,
    }));
    const service = createMembershipService({
      membershipRepository: makeRepository({
        getWorkspaceAccess: async () => ({
          workspaceId: "workspace-id",
          role: "ADMIN",
        }),
        createMembership,
      }),
    });

    await service.addMember("admin-id", "workspace-id", {
      email: "fahim@example.com",
      role: "MEMBER",
    });

    expect(createMembership).toHaveBeenCalled();
  });

  test("rejects an admin from adding another administrator", async () => {
    const createMembership = vi.fn(async () => memberView);
    const service = createMembershipService({
      membershipRepository: makeRepository({
        getWorkspaceAccess: async () => ({
          workspaceId: "workspace-id",
          role: "ADMIN",
        }),
        createMembership,
      }),
    });

    await expect(
      service.addMember("admin-id", "workspace-id", {
        email: "fahim@example.com",
        role: "ADMIN",
      }),
    ).rejects.toMatchObject({
      code: "MEMBERSHIP_FORBIDDEN",
      statusCode: 403,
    });
    expect(createMembership).not.toHaveBeenCalled();
  });

  test("rejects adding an unknown user", async () => {
    const createMembership = vi.fn(async () => memberView);
    const service = createMembershipService({
      membershipRepository: makeRepository({
        findUserByEmail: async () => null,
        createMembership,
      }),
    });

    await expect(
      service.addMember("owner-id", "workspace-id", {
        email: "missing@example.com",
        role: "MEMBER",
      }),
    ).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
      statusCode: 404,
    });
    expect(createMembership).not.toHaveBeenCalled();
  });

  test("rejects adding an existing workspace member", async () => {
    const createMembership = vi.fn(async () => memberView);
    const service = createMembershipService({
      membershipRepository: makeRepository({
        getMembershipByUserId: async () => memberMembership,
        createMembership,
      }),
    });

    await expect(
      service.addMember("owner-id", "workspace-id", {
        email: "fahim@example.com",
        role: "MEMBER",
      }),
    ).rejects.toMatchObject({
      code: "MEMBERSHIP_ALREADY_EXISTS",
      statusCode: 409,
    });
    expect(createMembership).not.toHaveBeenCalled();
  });

  test("lists members for any workspace member", async () => {
    const listedMembers = [memberView];
    const listMembers = vi.fn(async () => listedMembers);
    const service = createMembershipService({
      membershipRepository: makeRepository({ listMembers }),
    });

    const result = await service.listMembers("member-id", "workspace-id");

    expect(result).toEqual(listedMembers);
    expect(listMembers).toHaveBeenCalledWith("workspace-id");
  });

  test("hides a workspace from users without membership", async () => {
    const listMembers = vi.fn(async () => [memberView]);
    const service = createMembershipService({
      membershipRepository: makeRepository({
        getWorkspaceAccess: async () => null,
        listMembers,
      }),
    });

    await expect(
      service.listMembers("outsider-id", "workspace-id"),
    ).rejects.toMatchObject({
      code: "WORKSPACE_NOT_FOUND",
      statusCode: 404,
    });
    expect(listMembers).not.toHaveBeenCalled();
  });

  test("allows an owner to change a non-owner role", async () => {
    const updateMembershipRole = vi.fn(async () => ({
      ...memberView,
      role: "ADMIN" as const,
    }));
    const service = createMembershipService({
      membershipRepository: makeRepository({ updateMembershipRole }),
    });

    await service.updateMemberRole(
      "owner-id",
      "workspace-id",
      "member-membership-id",
      { role: "ADMIN" },
    );

    expect(updateMembershipRole).toHaveBeenCalledWith({
      workspaceId: "workspace-id",
      membershipId: "member-membership-id",
      role: "ADMIN",
    });
  });

  test("allows an admin to promote a member", async () => {
    const updateMembershipRole = vi.fn(async () => ({
      ...memberView,
      role: "ADMIN" as const,
    }));
    const service = createMembershipService({
      membershipRepository: makeRepository({
        getWorkspaceAccess: async () => ({
          workspaceId: "workspace-id",
          role: "ADMIN",
        }),
        updateMembershipRole,
      }),
    });

    await service.updateMemberRole(
      "admin-id",
      "workspace-id",
      "member-membership-id",
      { role: "ADMIN" },
    );

    expect(updateMembershipRole).toHaveBeenCalled();
  });

  test("rejects an admin from changing another admin", async () => {
    const updateMembershipRole = vi.fn(async () => ({
      ...memberView,
      role: "MEMBER" as const,
    }));
    const service = createMembershipService({
      membershipRepository: makeRepository({
        getWorkspaceAccess: async () => ({
          workspaceId: "workspace-id",
          role: "ADMIN",
        }),
        getMembership: async () => adminMembership,
        updateMembershipRole,
      }),
    });

    await expect(
      service.updateMemberRole(
        "admin-id",
        "workspace-id",
        "admin-membership-id",
        { role: "MEMBER" },
      ),
    ).rejects.toMatchObject({
      code: "MEMBERSHIP_FORBIDDEN",
      statusCode: 403,
    });
    expect(updateMembershipRole).not.toHaveBeenCalled();
  });

  test("protects owner memberships from role changes", async () => {
    const updateMembershipRole = vi.fn(async () => ({
      ...memberView,
      role: "MEMBER" as const,
    }));
    const service = createMembershipService({
      membershipRepository: makeRepository({
        getMembership: async () => ownerMembership,
        updateMembershipRole,
      }),
    });

    await expect(
      service.updateMemberRole(
        "owner-id",
        "workspace-id",
        "owner-membership-id",
        { role: "MEMBER" },
      ),
    ).rejects.toMatchObject({
      code: "MEMBERSHIP_FORBIDDEN",
      statusCode: 403,
    });
    expect(updateMembershipRole).not.toHaveBeenCalled();
  });

  test("allows an owner to remove an administrator", async () => {
    const deleteMembership = vi.fn(async () => undefined);
    const service = createMembershipService({
      membershipRepository: makeRepository({
        getMembership: async () => adminMembership,
        deleteMembership,
      }),
    });

    await service.removeMember(
      "owner-id",
      "workspace-id",
      "admin-membership-id",
    );

    expect(deleteMembership).toHaveBeenCalledWith({
      workspaceId: "workspace-id",
      membershipId: "admin-membership-id",
    });
  });

  test("rejects a member from removing another membership", async () => {
    const deleteMembership = vi.fn(async () => undefined);
    const service = createMembershipService({
      membershipRepository: makeRepository({
        getWorkspaceAccess: async () => ({
          workspaceId: "workspace-id",
          role: "MEMBER",
        }),
        deleteMembership,
      }),
    });

    await expect(
      service.removeMember("member-id", "workspace-id", "admin-membership-id"),
    ).rejects.toMatchObject({
      code: "MEMBERSHIP_FORBIDDEN",
      statusCode: 403,
    });
    expect(deleteMembership).not.toHaveBeenCalled();
  });
});
