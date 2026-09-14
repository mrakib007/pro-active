import { AppError } from "../../errors.js";
import {
  createMembershipRepository,
  MembershipNotFoundError,
} from "./membership.repository.js";
import { updateMembershipSchema } from "./membership.schemas.js";
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

function mapRepositoryError(error: unknown): never {
  if (error instanceof MembershipNotFoundError) {
    throw membershipNotFoundError();
  }

  throw error;
}

export function createMembershipService({
  membershipRepository = createMembershipRepository(),
}: MembershipServiceDependencies = {}): MembershipService {
  return {
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
