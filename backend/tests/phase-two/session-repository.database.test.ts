import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, test } from "vitest";
import { prisma } from "../../src/infrastructure/database/prisma.js";
import { createSessionRepository } from "../../src/modules/auth/session.repository.js";
import { createUserRepository } from "../../src/modules/auth/auth.repository.js";

const createdSessionIds: string[] = [];
const createdUserIds: string[] = [];

afterEach(async () => {
  await prisma.session.deleteMany({
    where: { id: { in: createdSessionIds.splice(0) } },
  });
  await Promise.all(
    createdUserIds
      .splice(0)
      .map((id) =>
        prisma.user.delete({ where: { id } }).catch(() => undefined),
      ),
  );
});

describe("session repository", () => {
  test("finds a non-expired session and includes its user", async () => {
    const user = await createUserRepository().createUser({
      fullName: "Session User",
      email: `session-${randomUUID()}@example.com`,
      passwordHash: "argon2-hash",
    });
    createdUserIds.push(user.id);

    const expiresAt = new Date(Date.now() + 60_000);
    const session = await createSessionRepository().createSession({
      userId: user.id,
      tokenHash: randomUUID().replaceAll("-", "").padEnd(64, "a"),
      expiresAt,
    });
    createdSessionIds.push(session.id);

    const found = await createSessionRepository().findValidSessionByTokenHash(
      session.tokenHash,
      new Date(),
    );

    expect(found).toMatchObject({
      id: session.id,
      userId: user.id,
      tokenHash: session.tokenHash,
    });
    expect(found?.user.email).toBe(user.email);
  });

  test("does not return an expired or revoked session", async () => {
    const user = await createUserRepository().createUser({
      fullName: "Session User",
      email: `session-${randomUUID()}@example.com`,
      passwordHash: "argon2-hash",
    });
    createdUserIds.push(user.id);

    const tokenHash = randomUUID().replaceAll("-", "").padEnd(64, "b");
    const session = await createSessionRepository().createSession({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
    });
    createdSessionIds.push(session.id);
    const repository = createSessionRepository();

    await repository.revokeSessionByTokenHash(tokenHash, new Date());

    expect(
      await repository.findValidSessionByTokenHash(tokenHash, new Date()),
    ).toBeNull();
    expect(
      await repository.findValidSessionByTokenHash(
        tokenHash,
        new Date(Date.now() + 120_000),
      ),
    ).toBeNull();
  });
});
