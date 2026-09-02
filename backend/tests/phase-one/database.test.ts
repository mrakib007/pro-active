import { afterAll, describe, expect, test } from "vitest";
import {
  checkDatabase,
  disconnectDatabase,
} from "../../src/infrastructure/database/prisma.js";

describe("database connection", () => {
  afterAll(async () => {
    await disconnectDatabase();
  });

  test("executes a connectivity query against PostgreSQL", async () => {
    await expect(checkDatabase()).resolves.toBeUndefined();
  });
});
