import { describe, expect, test } from "vitest";
import { createAuthService } from "../../src/modules/auth/auth.service.js";
import type {
  PasswordHasher,
  StoredUser,
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
