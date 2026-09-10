import type { RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../../errors.js";
import type { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { createWorkspaceSchema } from "./workspace.schemas.js";
import type { WorkspaceService } from "./workspace.types.js";

export function listWorkspacesController(
  workspaceService: WorkspaceService,
): RequestHandler {
  return async (request, response, next) => {
    const authenticatedRequest = request as Partial<AuthenticatedRequest>;

    if (!authenticatedRequest.auth) {
      next(
        new AppError(401, "AUTHENTICATION_REQUIRED", "Authentication required"),
      );
      return;
    }

    try {
      const workspaces = await workspaceService.listWorkspaces(
        authenticatedRequest.auth.user.id,
      );

      response.status(200).json({
        status: "ok",
        data: { workspaces },
      });
    } catch (error: unknown) {
      next(error);
    }
  };
}

export function createWorkspaceController(
  workspaceService: WorkspaceService,
): RequestHandler {
  return async (request, response, next) => {
    const parsedInput = createWorkspaceSchema.safeParse(request.body);

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

    const authenticatedRequest = request as Partial<AuthenticatedRequest>;

    if (!authenticatedRequest.auth) {
      next(
        new AppError(401, "AUTHENTICATION_REQUIRED", "Authentication required"),
      );
      return;
    }

    try {
      const createdWorkspace = await workspaceService.createWorkspace(
        authenticatedRequest.auth.user.id,
        parsedInput.data,
      );

      response.status(201).json({
        status: "ok",
        data: createdWorkspace,
      });
    } catch (error: unknown) {
      next(error);
    }
  };
}
