import { afterEach, describe, expect, test } from "vitest";
import { prisma } from "../../src/infrastructure/database/prisma.js";
import {
  createUserRepository,
  UserEmailAlreadyExistsError,
} from "../../src/modules/auth/auth.repository.js";

const createdUserIds: string[] = [];

afterEach(async () => {
  await Promise.all(
    createdUserIds
      .splice(0)
      .map((id) =>
        prisma.user.delete({ where: { id } }).catch(() => undefined),
      ),
  );
});

describe("user repository", () => {
  test("persists a user record", async () => {
    const repository = createUserRepository();

    const user = await repository.createUser({
      fullName: "Database User",
      email: `database-${Date.now()}@example.com`,
      passwordHash: "argon2-hash",
    });
    createdUserIds.push(user.id);

    expect(user).toMatchObject({
      fullName: "Database User",
      passwordHash: "argon2-hash",
    });
  });

  test("maps a duplicate email to a domain error", async () => {
    const repository = createUserRepository();
    const email = `duplicate-${Date.now()}@example.com`;
    const firstUser = await repository.createUser({
      fullName: "First User",
      email,
      passwordHash: "argon2-hash",
    });
    createdUserIds.push(firstUser.id);

    await expect(
      repository.createUser({
        fullName: "Second User",
        email,
        passwordHash: "another-hash",
      }),
    ).rejects.toBeInstanceOf(UserEmailAlreadyExistsError);
  });
});
