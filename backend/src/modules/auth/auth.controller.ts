import type { RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../../errors.js";
import type { AuthenticatedRequest } from "./auth.middleware.js";
import { UserEmailAlreadyExistsError } from "./auth.repository.js";
import { InvalidCredentialsError } from "./auth.service.js";
import {
  clearSessionCookieOptions,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "./session.service.js";
import { loginUserSchema, registerUserSchema } from "./auth.schemas.js";
import type {
  AuthService,
  LoginService,
  SessionService,
} from "./auth.types.js";

export function createRegisterController(
  registrationService: AuthService,
): RequestHandler {
  return async (request, response, next) => {
    const parsedInput = registerUserSchema.safeParse(request.body);

    if (!parsedInput.success) {
      const formattedErrors = z.flattenError(parsedInput.error);

      next(
        new AppError(400, "VALIDATION_ERROR", "Request validation failed", {
          formErrors: formattedErrors.formErrors,
          fieldErrors: formattedErrors.fieldErrors,
        }),
      );
      return;
    }

    try {
      const user = await registrationService.registerUser(parsedInput.data);

      response.status(201).json({
        status: "ok",
        data: { user },
      });
    } catch (error: unknown) {
      if (error instanceof UserEmailAlreadyExistsError) {
        next(
          new AppError(
            409,
            "EMAIL_ALREADY_REGISTERED",
            "An account with that email already exists",
          ),
        );
        return;
      }

      next(error);
    }
  };
}

export function createLoginController(
  loginService: LoginService,
): RequestHandler {
  return async (request, response, next) => {
    const parsedInput = loginUserSchema.safeParse(request.body);

    if (!parsedInput.success) {
      const formattedErrors = z.flattenError(parsedInput.error);

      next(
        new AppError(400, "VALIDATION_ERROR", "Request validation failed", {
          formErrors: formattedErrors.formErrors,
          fieldErrors: formattedErrors.fieldErrors,
        }),
      );
      return;
    }

    try {
      const loginResult = await loginService.loginUser(parsedInput.data);

      response.cookie(
        SESSION_COOKIE_NAME,
        loginResult.sessionToken,
        sessionCookieOptions(),
      );
      response.status(200).json({
        status: "ok",
        data: { user: loginResult.user },
      });
    } catch (error: unknown) {
      if (error instanceof InvalidCredentialsError) {
        next(
          new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password"),
        );
        return;
      }

      next(error);
    }
  };
}

export function createCurrentUserController(): RequestHandler {
  return (request, response, next) => {
    const authenticatedRequest = request as Partial<AuthenticatedRequest>;

    if (!authenticatedRequest.auth) {
      next(
        new AppError(401, "AUTHENTICATION_REQUIRED", "Authentication required"),
      );
      return;
    }

    response.status(200).json({
      status: "ok",
      data: { user: authenticatedRequest.auth.user },
    });
  };
}

export function createLogoutController(
  sessionService: SessionService,
): RequestHandler {
  return async (request, response, next) => {
    const sessionToken = request.cookies?.[SESSION_COOKIE_NAME];

    try {
      if (sessionToken) {
        await sessionService.revokeSession(sessionToken);
      }

      response.clearCookie(SESSION_COOKIE_NAME, clearSessionCookieOptions());
      response.status(204).send();
    } catch (error: unknown) {
      next(error);
    }
  };
}
