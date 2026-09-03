import type { RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../../errors.js";
import { UserEmailAlreadyExistsError } from "./auth.repository.js";
import { registerUserSchema } from "./auth.schemas.js";
import type { AuthService } from "./auth.types.js";

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
