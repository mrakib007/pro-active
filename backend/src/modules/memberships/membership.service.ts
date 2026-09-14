import { AppError } from "../../errors.js";
import {
  MembershipAlreadyExistsError,
  createMembershipRepository,
  MembershipNotFoundError,
} from "./membership.repository.js";
import {
  createMembershipSchema,
  updateMembershipSchema,
} from "./membership.schemas.js";
import type {
  MembershipAccess,
  MembershipRepository,
  MembershipService,
  StoredMembership,
} from "./membership.types.js";

export interface MembershipServiceDependencies {
  membershipRepository?: MembershipRepository;
}

function workspaceNotFoundError() {
  return new AppError(404, "WORKSPACE_NOT_FOUND", "Workspace not found");
}

function membershipNotFoundError() {
  return new AppError(404, "MEMBERSHIP_NOT_FOUND", "Membership not found");
}

function membershipForbiddenError() {
  return new AppError(
    403,
    "MEMBERSHIP_FORBIDDEN",
    "You do not have permission to manage this membership",
  );
}

function userNotFoundError() {
  return new AppError(404, "USER_NOT_FOUND", "User not found");
}

function membershipAlreadyExistsError() {
  return new AppError(
    409,
    "MEMBERSHIP_ALREADY_EXISTS",
    "User is already a member of this workspace",
  );
}

function requireWorkspaceAccess(access: MembershipAccess | null) {
  if (!access) {
    throw workspaceNotFoundError();
  }

  return access;
}

function requireTargetMembership(
  membership: StoredMembership | null,
): StoredMembership {
  if (!membership) {
    throw membershipNotFoundError();
  }

  return membership;
}

function canManageMembership(
  actorRole: MembershipAccess["role"],
  targetRole: StoredMembership["role"],
): boolean {
  if (targetRole === "OWNER") {
    return false;
  }

  if (actorRole === "OWNER") {
    return true;
  }

  return actorRole === "ADMIN" && targetRole === "MEMBER";
}

function canAddMembership(
  actorRole: MembershipAccess["role"],
  requestedRole: "ADMIN" | "MEMBER",
): boolean {
  return (
    actorRole === "OWNER" ||
    (actorRole === "ADMIN" && requestedRole === "MEMBER")
  );
}

function mapRepositoryError(error: unknown): never {
  if (error instanceof MembershipNotFoundError) {
    throw membershipNotFoundError();
  }

  throw error;
}

function mapCreateRepositoryError(error: unknown): never {
  if (error instanceof MembershipAlreadyExistsError) {
    throw membershipAlreadyExistsError();
  }

  throw error;
}

export function createMembershipService({
  membershipRepository = createMembershipRepository(),
}: MembershipServiceDependencies = {}): MembershipService {
  return {
    async addMember(actorUserId, workspaceId, input) {
      const values = createMembershipSchema.parse(input);
      const actorAccess = requireWorkspaceAccess(
        await membershipRepository.getWorkspaceAccess(actorUserId, workspaceId),
      );

      if (!canAddMembership(actorAccess.role, values.role)) {
        throw membershipForbiddenError();
      }

      const user = await membershipRepository.findUserByEmail(values.email);

      if (!user) {
        throw userNotFoundError();
      }

      const existingMembership =
        await membershipRepository.getMembershipByUserId(workspaceId, user.id);

      if (existingMembership) {
        throw membershipAlreadyExistsError();
      }

      try {
        return await membershipRepository.createMembership({
          workspaceId,
          userId: user.id,
          role: values.role,
        });
      } catch (error: unknown) {
        return mapCreateRepositoryError(error);
      }
    },

    async listMembers(actorUserId, workspaceId) {
      requireWorkspaceAccess(
        await membershipRepository.getWorkspaceAccess(actorUserId, workspaceId),
      );

      return membershipRepository.listMembers(workspaceId);
    },

    async updateMemberRole(actorUserId, workspaceId, membershipId, input) {
      const values = updateMembershipSchema.parse(input);
      const actorAccess = requireWorkspaceAccess(
        await membershipRepository.getWorkspaceAccess(actorUserId, workspaceId),
      );
      const targetMembership = requireTargetMembership(
        await membershipRepository.getMembership(workspaceId, membershipId),
      );

      if (!canManageMembership(actorAccess.role, targetMembership.role)) {
        throw membershipForbiddenError();
      }

      try {
        return await membershipRepository.updateMembershipRole({
          workspaceId,
          membershipId,
          role: values.role,
        });
      } catch (error: unknown) {
        return mapRepositoryError(error);
      }
    },

    async removeMember(actorUserId, workspaceId, membershipId) {
      const actorAccess = requireWorkspaceAccess(
        await membershipRepository.getWorkspaceAccess(actorUserId, workspaceId),
      );
      const targetMembership = requireTargetMembership(
        await membershipRepository.getMembership(workspaceId, membershipId),
      );

      if (!canManageMembership(actorAccess.role, targetMembership.role)) {
        throw membershipForbiddenError();
      }

      try {
        await membershipRepository.deleteMembership({
          workspaceId,
          membershipId,
        });
      } catch (error: unknown) {
        mapRepositoryError(error);
      }
    },
  };
}
