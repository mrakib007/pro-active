import type { Request, RequestHandler } from "express";
import { AppError } from "../../errors.js";
import { SESSION_COOKIE_NAME } from "./session.service.js";
import type { AuthContext, SessionService } from "./auth.types.js";

export type AuthenticatedRequest = Request & {
  auth: AuthContext;
};

function authenticationRequiredError() {
  return new AppError(
    401,
    "AUTHENTICATION_REQUIRED",
    "Authentication required",
  );
}

export function createAuthenticationMiddleware(
  sessionService: SessionService,
): RequestHandler {
  return async (request, _response, next) => {
    const sessionToken = request.cookies?.[SESSION_COOKIE_NAME];

    if (!sessionToken) {
      next(authenticationRequiredError());
      return;
    }

    try {
      const user = await sessionService.getCurrentUser(sessionToken);

      if (!user) {
        next(authenticationRequiredError());
        return;
      }

      (request as AuthenticatedRequest).auth = { sessionToken, user };
      next();
    } catch (error: unknown) {
      next(error);
    }
  };
}
