import { describe, expect, test } from "vitest";
import { createAuthService } from "../../src/modules/auth/auth.service.js";
import { InvalidCredentialsError } from "../../src/modules/auth/auth.service.js";
import type {
  PasswordHasher,
  PasswordVerifier,
  SessionService,
  StoredUser,
  UserLookupRepository,
  UserRepository,
} from "../../src/modules/auth/auth.types.js";

const storedUser: StoredUser = {
  id: "user-id",
  fullName: "Rakib Hasan",
  email: "person@example.com",
  passwordHash: "argon2-hash",
  createdAt: new Date("2026-09-03T00:00:00.000Z"),
  updatedAt: new Date("2026-09-03T00:00:00.000Z"),
};

describe("registration service", () => {
  test("normalizes the email, hashes the password, and returns a public user", async () => {
    let repositoryInput:
      Parameters<UserRepository["createUser"]>[0] | undefined;
    let hashedPassword: string | undefined;

    const userRepository: UserRepository = {
      createUser: async (input) => {
        repositoryInput = input;
        return storedUser;
      },
    };
    const passwordHasher: PasswordHasher = {
      hash: async (password) => {
        hashedPassword = password;
        return storedUser.passwordHash;
      },
    };
    const service = createAuthService({ userRepository, passwordHasher });

    const result = await service.registerUser({
      fullName: "  Rakib Hasan  ",
      email: " PERSON@Example.COM ",
      password: "A secure password",
    });

    expect(hashedPassword).toBe("A secure password");
    expect(repositoryInput).toEqual({
      fullName: "Rakib Hasan",
      email: "person@example.com",
      passwordHash: "argon2-hash",
    });
    expect(result).toEqual({
      id: "user-id",
      fullName: "Rakib Hasan",
      email: "person@example.com",
      createdAt: storedUser.createdAt,
    });
    expect(result).not.toHaveProperty("passwordHash");
  });

  test("rejects a password shorter than eight characters", async () => {
    const userRepository: UserRepository = {
      createUser: async () => storedUser,
    };
    const passwordHasher: PasswordHasher = {
      hash: async () => storedUser.passwordHash,
    };
    const service = createAuthService({ userRepository, passwordHasher });

    await expect(
      service.registerUser({
        fullName: "Rakib Hasan",
        email: "person@example.com",
        password: "short",
      }),
    ).rejects.toMatchObject({
      name: "ZodError",
    });
  });
});

describe("login service", () => {
  test("normalizes the email, verifies the password, and creates a session", async () => {
    let lookedUpEmail: string | undefined;
    let verifiedHash: string | undefined;
    let verifiedPassword: string | undefined;
    let sessionUserId: string | undefined;

    const userLookupRepository: UserLookupRepository = {
      findUserByEmail: async (email) => {
        lookedUpEmail = email;
        return storedUser;
      },
    };
    const passwordVerifier: PasswordVerifier = {
      verify: async (passwordHash, password) => {
        verifiedHash = passwordHash;
        verifiedPassword = password;
        return true;
      },
    };
    const sessionService: SessionService = {
      createSession: async (userId) => {
        sessionUserId = userId;
        return {
          token: "session-token",
          expiresAt: new Date("2026-09-10T00:00:00.000Z"),
        };
      },
      getCurrentUser: async () => null,
      revokeSession: async () => undefined,
    };
    const service = createAuthService({
      passwordVerifier,
      sessionService,
      userLookupRepository,
    });

    const result = await service.loginUser({
      email: " PERSON@Example.COM ",
      password: "A secure password",
    });

    expect(lookedUpEmail).toBe("person@example.com");
    expect(verifiedHash).toBe(storedUser.passwordHash);
    expect(verifiedPassword).toBe("A secure password");
    expect(sessionUserId).toBe(storedUser.id);
    expect(result).toEqual({
      user: {
        id: storedUser.id,
        fullName: storedUser.fullName,
        email: storedUser.email,
        createdAt: storedUser.createdAt,
      },
      sessionToken: "session-token",
      expiresAt: new Date("2026-09-10T00:00:00.000Z"),
    });
  });

  test("returns the same invalid-credentials error when the password is wrong", async () => {
    let createdSessions = 0;
    const userLookupRepository: UserLookupRepository = {
      findUserByEmail: async () => storedUser,
    };
    const passwordVerifier: PasswordVerifier = {
      verify: async () => false,
    };
    const sessionService: SessionService = {
      createSession: async () => {
        createdSessions += 1;
        return {
          token: "session-token",
          expiresAt: new Date("2026-09-10T00:00:00.000Z"),
        };
      },
      getCurrentUser: async () => null,
      revokeSession: async () => undefined,
    };
    const service = createAuthService({
      passwordVerifier,
      sessionService,
      userLookupRepository,
    });

    await expect(
      service.loginUser({
        email: "person@example.com",
        password: "A wrong password",
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(createdSessions).toBe(0);
  });

  test("returns invalid credentials when the email is not found", async () => {
    const userLookupRepository: UserLookupRepository = {
      findUserByEmail: async () => null,
    };
    const passwordVerifier: PasswordVerifier = {
      verify: async () => true,
    };
    const sessionService: SessionService = {
      createSession: async () => ({
        token: "session-token",
        expiresAt: new Date("2026-09-10T00:00:00.000Z"),
      }),
      getCurrentUser: async () => null,
      revokeSession: async () => undefined,
    };
    const service = createAuthService({
      passwordVerifier,
      sessionService,
      userLookupRepository,
    });

    await expect(
      service.loginUser({
        email: "missing@example.com",
        password: "A secure password",
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
