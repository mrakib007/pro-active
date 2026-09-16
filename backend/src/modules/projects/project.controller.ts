import type { NextFunction, Request, RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../../errors.js";
import type { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { createProjectSchema, updateProjectSchema } from "./project.schemas.js";
import type { ProjectService } from "./project.types.js";

function getAuthenticatedUserId(
  request: Request,
  next: NextFunction,
): string | null {
  const authenticatedRequest = request as Partial<AuthenticatedRequest>;

  if (!authenticatedRequest.auth) {
    next(
      new AppError(401, "AUTHENTICATION_REQUIRED", "Authentication required"),
    );
    return null;
  }

  return authenticatedRequest.auth.user.id;
}

function getRouteParam(
  request: Request,
  name: string,
  next: NextFunction,
  errorCode: string,
): string | null {
  const value = request.params[name];

  if (typeof value !== "string" || value.length === 0) {
    next(new AppError(400, errorCode, "Route parameter is invalid"));
    return null;
  }

  return value;
}

function validationError(error: z.ZodError) {
  const formattedErrors = z.flattenError(error);

  return new AppError(400, "VALIDATION_ERROR", "Request validation failed", {
    formErrors: formattedErrors.formErrors,
    fieldErrors: formattedErrors.fieldErrors,
  });
}

export function listProjectsController(
  projectService: ProjectService,
): RequestHandler {
  return async (request, response, next) => {
    const actorUserId = getAuthenticatedUserId(request, next);
    const workspaceId = getRouteParam(
      request,
      "workspaceId",
      next,
      "INVALID_WORKSPACE_ID",
    );

    if (!actorUserId || !workspaceId) {
      return;
    }

    try {
      const projects = await projectService.listProjects(
        actorUserId,
        workspaceId,
      );

      response.status(200).json({
        status: "ok",
        data: { projects },
      });
    } catch (error: unknown) {
      next(error);
    }
  };
}

export function createProjectController(
  projectService: ProjectService,
): RequestHandler {
  return async (request, response, next) => {
    const parsedInput = createProjectSchema.safeParse(request.body);

    if (!parsedInput.success) {
      next(validationError(parsedInput.error));
      return;
    }

    const actorUserId = getAuthenticatedUserId(request, next);
    const workspaceId = getRouteParam(
      request,
      "workspaceId",
      next,
      "INVALID_WORKSPACE_ID",
    );

    if (!actorUserId || !workspaceId) {
      return;
    }

    try {
      const project = await projectService.createProject(
        actorUserId,
        workspaceId,
        parsedInput.data,
      );

      response.status(201).json({
        status: "ok",
        data: { project },
      });
    } catch (error: unknown) {
      next(error);
    }
  };
}

export function updateProjectController(
  projectService: ProjectService,
): RequestHandler {
  return async (request, response, next) => {
    const parsedInput = updateProjectSchema.safeParse(request.body);

    if (!parsedInput.success) {
      next(validationError(parsedInput.error));
      return;
    }

    const actorUserId = getAuthenticatedUserId(request, next);
    const workspaceId = getRouteParam(
      request,
      "workspaceId",
      next,
      "INVALID_WORKSPACE_ID",
    );
    const projectId = getRouteParam(
      request,
      "projectId",
      next,
      "INVALID_PROJECT_ID",
    );

    if (!actorUserId || !workspaceId || !projectId) {
      return;
    }

    try {
      const project = await projectService.updateProject(
        actorUserId,
        workspaceId,
        projectId,
        parsedInput.data,
      );

      response.status(200).json({
        status: "ok",
        data: { project },
      });
    } catch (error: unknown) {
      next(error);
    }
  };
}

export function deleteProjectController(
  projectService: ProjectService,
): RequestHandler {
  return async (request, response, next) => {
    const actorUserId = getAuthenticatedUserId(request, next);
    const workspaceId = getRouteParam(
      request,
      "workspaceId",
      next,
      "INVALID_WORKSPACE_ID",
    );
    const projectId = getRouteParam(
      request,
      "projectId",
      next,
      "INVALID_PROJECT_ID",
    );

    if (!actorUserId || !workspaceId || !projectId) {
      return;
    }

    try {
      await projectService.deleteProject(actorUserId, workspaceId, projectId);
      response.status(204).send();
    } catch (error: unknown) {
      next(error);
    }
  };
}
