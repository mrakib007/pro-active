import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import type {
  CreateUserRecord,
  StoredUser,
  UserRepository,
} from "./auth.types.js";

export class UserEmailAlreadyExistsError extends Error {
  constructor() {
    super("A user with that email already exists");
    this.name = "UserEmailAlreadyExistsError";
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export function createUserRepository(
  database: PrismaClient = prisma,
): UserRepository {
  return {
    async createUser(input: CreateUserRecord): Promise<StoredUser> {
      try {
        return await database.user.create({ data: input });
      } catch (error: unknown) {
        if (isUniqueConstraintError(error)) {
          throw new UserEmailAlreadyExistsError();
        }

        throw error;
      }
    },
  };
}
