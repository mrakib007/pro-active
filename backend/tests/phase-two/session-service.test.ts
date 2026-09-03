import { describe, expect, test } from "vitest";
import {
  createSessionService,
  hashSessionToken,
} from "../../src/modules/auth/session.service.js";
import type {
  SessionRepository,
  StoredSession,
  StoredSessionWithUser,
  StoredUser,
} from "../../src/modules/auth/auth.types.js";

const now = new Date("2026-09-03T00:00:00.000Z");
const storedUser: StoredUser = {
  id: "user-id",
  fullName: "Rakib Hasan",
  email: "person@example.com",
  passwordHash: "argon2-hash",
  createdAt: now,
  updatedAt: now,
};

describe("session service", () => {
  test("generates a token, stores only its hash, and calculates expiry", async () => {
    let repositoryInput:
      Parameters<SessionRepository["createSession"]>[0] | undefined;
    const storedSession: StoredSession = {
      id: "session-id",
      userId: "user-id",
      tokenHash: hashSessionToken("opaque-session-token"),
      expiresAt: new Date("2026-09-10T00:00:00.000Z"),
      revokedAt: null,
      createdAt: now,
    };
    const sessionRepository: SessionRepository = {
      createSession: async (input) => {
        repositoryInput = input;
        return storedSession;
      },
      findValidSessionByTokenHash: async () => null,
      revokeSessionByTokenHash: async () => undefined,
    };
    const service = createSessionService({
      now: () => now,
      sessionRepository,
      tokenGenerator: () => "opaque-session-token",
    });

    const result = await service.createSession("user-id");

    expect(repositoryInput).toEqual({
      userId: "user-id",
      tokenHash: hashSessionToken("opaque-session-token"),
      expiresAt: new Date("2026-09-10T00:00:00.000Z"),
    });
    expect(result).toEqual({
      token: "opaque-session-token",
      expiresAt: new Date("2026-09-10T00:00:00.000Z"),
    });
    expect(repositoryInput?.tokenHash).not.toBe("opaque-session-token");
  });

  test("maps a valid stored session to a public user", async () => {
    let receivedHash: string | undefined;
    let receivedNow: Date | undefined;
    const storedSession: StoredSessionWithUser = {
      id: "session-id",
      userId: storedUser.id,
      tokenHash: hashSessionToken("opaque-session-token"),
      expiresAt: new Date("2026-09-10T00:00:00.000Z"),
      revokedAt: null,
      createdAt: now,
      user: storedUser,
    };
    const sessionRepository: SessionRepository = {
      createSession: async () => storedSession,
      findValidSessionByTokenHash: async (tokenHash, lookupNow) => {
        receivedHash = tokenHash;
        receivedNow = lookupNow;
        return storedSession;
      },
      revokeSessionByTokenHash: async () => undefined,
    };
    const service = createSessionService({
      now: () => now,
      sessionRepository,
      tokenGenerator: () => "unused-token",
    });

    const result = await service.getCurrentUser("opaque-session-token");

    expect(receivedHash).toBe(hashSessionToken("opaque-session-token"));
    expect(receivedNow).toBe(now);
    expect(result).toEqual({
      id: storedUser.id,
      fullName: storedUser.fullName,
      email: storedUser.email,
      createdAt: storedUser.createdAt,
    });
    expect(result).not.toHaveProperty("passwordHash");
  });
});
