import { createHash, randomBytes } from "node:crypto";
import { createSessionRepository } from "./session.repository.js";
import type { SessionRepository, SessionService } from "./auth.types.js";
import { toPublicUser } from "./auth.types.js";

export const SESSION_COOKIE_NAME = "pro_active_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function clearSessionCookieOptions() {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export interface SessionServiceDependencies {
  now?: () => Date;
  sessionRepository?: SessionRepository;
  tokenGenerator?: () => string;
}

export function createSessionService({
  now = () => new Date(),
  sessionRepository = createSessionRepository(),
  tokenGenerator = () => randomBytes(32).toString("base64url"),
}: SessionServiceDependencies = {}): SessionService {
  return {
    async createSession(userId: string) {
      const token = tokenGenerator();
      const expiresAt = new Date(now().getTime() + SESSION_TTL_SECONDS * 1000);

      await sessionRepository.createSession({
        userId,
        tokenHash: hashSessionToken(token),
        expiresAt,
      });

      return { token, expiresAt };
    },

    async getCurrentUser(token: string) {
      const session = await sessionRepository.findValidSessionByTokenHash(
        hashSessionToken(token),
        now(),
      );

      return session ? toPublicUser(session.user) : null;
    },

    async revokeSession(token: string) {
      await sessionRepository.revokeSessionByTokenHash(
        hashSessionToken(token),
        now(),
      );
    },
  };
}
