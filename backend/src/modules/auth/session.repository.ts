import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import type {
  CreateSessionRecord,
  SessionRepository,
  StoredSession,
  StoredSessionWithUser,
} from "./auth.types.js";

export function createSessionRepository(
  database: PrismaClient = prisma,
): SessionRepository {
  return {
    async createSession(input: CreateSessionRecord): Promise<StoredSession> {
      return database.session.create({ data: input });
    },

    async findValidSessionByTokenHash(
      tokenHash: string,
      now: Date,
    ): Promise<StoredSessionWithUser | null> {
      return database.session.findFirst({
        where: {
          tokenHash,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        include: { user: true },
      });
    },

    async revokeSessionByTokenHash(
      tokenHash: string,
      revokedAt: Date,
    ): Promise<void> {
      await database.session.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt },
      });
    },
  };
}
