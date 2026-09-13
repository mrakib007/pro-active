import { randomBytes, timingSafeEqual } from "node:crypto";
import type { RequestHandler, Response } from "express";
import { AppError } from "../errors.js";

export const CSRF_COOKIE_NAME = "pro_active_csrf";
export const CSRF_HEADER_NAME = "X-CSRF-Token";
export const CSRF_TTL_SECONDS = 60 * 60 * 24 * 7;

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function generateCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

export function csrfCookieOptions() {
  return {
    httpOnly: false,
    maxAge: CSRF_TTL_SECONDS * 1000,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

function clearCsrfCookieOptions() {
  return {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function setCsrfCookie(
  response: Response,
  token = generateCsrfToken(),
): void {
  response.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions());
}

export function clearCsrfCookie(response: Response): void {
  response.clearCookie(CSRF_COOKIE_NAME, clearCsrfCookieOptions());
}

function tokensMatch(expected: string, received: string): boolean {
  const expectedBytes = Buffer.from(expected, "utf8");
  const receivedBytes = Buffer.from(received, "utf8");

  if (expectedBytes.length !== receivedBytes.length) {
    return false;
  }

  return timingSafeEqual(expectedBytes, receivedBytes);
}

export function createCsrfProtectionMiddleware(): RequestHandler {
  return (request, _response, next) => {
    if (safeMethods.has(request.method)) {
      next();
      return;
    }

    const cookieToken = request.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = request.get(CSRF_HEADER_NAME);

    if (!cookieToken || !headerToken) {
      next(new AppError(403, "CSRF_TOKEN_MISSING", "CSRF token is required"));
      return;
    }

    if (!tokensMatch(cookieToken, headerToken)) {
      next(new AppError(403, "CSRF_TOKEN_INVALID", "CSRF token is invalid"));
      return;
    }

    next();
  };
}
