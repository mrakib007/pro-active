import type { LoginUserInput, RegisterUserInput } from "./auth.schemas.js";

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

export interface AuthContext {
  user: PublicUser;
  sessionToken: string;
}

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    createdAt: user.createdAt,
  };
}

export interface UserRepository {
  createUser(input: CreateUserRecord): Promise<StoredUser>;
}

export interface UserLookupRepository {
  findUserByEmail(email: string): Promise<StoredUser | null>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
}

export interface PasswordVerifier {
  verify(passwordHash: string, password: string): Promise<boolean>;
}

export interface AuthService {
  registerUser(input: RegisterUserInput): Promise<PublicUser>;
}

export interface CreatedSession {
  token: string;
  expiresAt: Date;
}

export interface LoginResult {
  user: PublicUser;
  sessionToken: string;
  expiresAt: Date;
}

export interface LoginService {
  loginUser(input: LoginUserInput): Promise<LoginResult>;
}

export interface CreateSessionRecord {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface StoredSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface StoredSessionWithUser extends StoredSession {
  user: StoredUser;
}

export interface SessionRepository {
  createSession(input: CreateSessionRecord): Promise<StoredSession>;
  findValidSessionByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<StoredSessionWithUser | null>;
  revokeSessionByTokenHash(tokenHash: string, revokedAt: Date): Promise<void>;
}

export interface SessionService {
  createSession(userId: string): Promise<CreatedSession>;
  getCurrentUser(token: string): Promise<PublicUser | null>;
  revokeSession(token: string): Promise<void>;
}
