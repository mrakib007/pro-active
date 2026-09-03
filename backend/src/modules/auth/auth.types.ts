import type { RegisterUserInput } from "./auth.schemas.js";

export interface StoredUser {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRecord {
  fullName: string;
  email: string;
  passwordHash: string;
}

export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: Date;
}

export interface UserRepository {
  createUser(input: CreateUserRecord): Promise<StoredUser>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
}

export interface AuthService {
  registerUser(input: RegisterUserInput): Promise<PublicUser>;
}
