import type { MembershipRole } from "@prisma/client";
import type { UpdateMembershipInput } from "./membership.schemas.js";

export type EditableMembershipRole = "ADMIN" | "MEMBER";

export interface MembershipAccess {
  workspaceId: string;
  role: MembershipRole;
}

export interface StoredMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: MembershipRole;
  createdAt: Date;
}

export interface MembershipMember extends StoredMembership {
  fullName: string;
  email: string;
}

export interface UpdateMembershipRoleRecord {
  workspaceId: string;
  membershipId: string;
  role: EditableMembershipRole;
}

export interface DeleteMembershipRecord {
  workspaceId: string;
  membershipId: string;
}

export interface MembershipRepository {
  getWorkspaceAccess(
    userId: string,
    workspaceId: string,
  ): Promise<MembershipAccess | null>;
  listMembers(workspaceId: string): Promise<MembershipMember[]>;
  getMembership(
    workspaceId: string,
    membershipId: string,
  ): Promise<StoredMembership | null>;
  updateMembershipRole(
    input: UpdateMembershipRoleRecord,
  ): Promise<MembershipMember>;
  deleteMembership(input: DeleteMembershipRecord): Promise<void>;
}

export interface MembershipService {
  listMembers(
    actorUserId: string,
    workspaceId: string,
  ): Promise<MembershipMember[]>;
  updateMemberRole(
    actorUserId: string,
    workspaceId: string,
    membershipId: string,
    input: UpdateMembershipInput,
  ): Promise<MembershipMember>;
  removeMember(
    actorUserId: string,
    workspaceId: string,
    membershipId: string,
  ): Promise<void>;
}
