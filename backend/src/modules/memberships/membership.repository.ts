import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import type {
  DeleteMembershipRecord,
  MembershipMember,
  MembershipRepository,
  UpdateMembershipRoleRecord,
} from "./membership.types.js";

export class MembershipNotFoundError extends Error {
  constructor() {
    super("Membership not found");
    this.name = "MembershipNotFoundError";
  }
}

const memberSelect = {
  id: true,
  workspaceId: true,
  userId: true,
  role: true,
  createdAt: true,
  user: {
    select: {
      fullName: true,
      email: true,
    },
  },
} satisfies Prisma.MembershipSelect;

type MembershipWithUser = Prisma.MembershipGetPayload<{
  select: typeof memberSelect;
}>;

function toMembershipMember(membership: MembershipWithUser): MembershipMember {
  return {
    id: membership.id,
    workspaceId: membership.workspaceId,
    userId: membership.userId,
    role: membership.role,
    createdAt: membership.createdAt,
    fullName: membership.user.fullName,
    email: membership.user.email,
  };
}

export function createMembershipRepository(
  database: PrismaClient = prisma,
): MembershipRepository {
  return {
    async getWorkspaceAccess(userId, workspaceId) {
      const membership = await database.membership.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
        select: { role: true },
      });

      return membership ? { workspaceId, role: membership.role } : null;
    },

    async listMembers(workspaceId) {
      const memberships = await database.membership.findMany({
        where: { workspaceId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: memberSelect,
      });

      return memberships.map(toMembershipMember);
    },

    async getMembership(workspaceId, membershipId) {
      return database.membership.findFirst({
        where: { id: membershipId, workspaceId },
        select: {
          id: true,
          workspaceId: true,
          userId: true,
          role: true,
          createdAt: true,
        },
      });
    },

    async updateMembershipRole({
      workspaceId,
      membershipId,
      role,
    }: UpdateMembershipRoleRecord) {
      const updatedMembership = await database.$transaction(
        async (transaction) => {
          const updateResult = await transaction.membership.updateMany({
            where: { id: membershipId, workspaceId },
            data: { role },
          });

          if (updateResult.count === 0) {
            throw new MembershipNotFoundError();
          }

          return transaction.membership.findFirstOrThrow({
            where: { id: membershipId, workspaceId },
            select: memberSelect,
          });
        },
      );

      return toMembershipMember(updatedMembership);
    },

    async deleteMembership({
      workspaceId,
      membershipId,
    }: DeleteMembershipRecord) {
      const deleteResult = await database.membership.deleteMany({
        where: { id: membershipId, workspaceId },
      });

      if (deleteResult.count === 0) {
        throw new MembershipNotFoundError();
      }
    },
  };
}
