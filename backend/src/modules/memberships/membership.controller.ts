import type { RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../../errors.js";
import type { AuthenticatedRequest } from "../auth/auth.middleware.js";
import { updateMembershipSchema } from "./membership.schemas.js";
import type { MembershipService } from "./membership.types.js";

function getAuthenticatedUserId(
  request: Parameters<RequestHandler>[0],
  next: Parameters<RequestHandler>[2],
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
  request: Parameters<RequestHandler>[0],
  name: string,
  next: Parameters<RequestHandler>[2],
  errorCode: string,
): string | null {
  const value = request.params[name];

  if (typeof value !== "string" || value.length === 0) {
    next(new AppError(400, errorCode, "Route parameter is invalid"));
    return null;
  }

  return value;
}

export function listMembersController(
  membershipService: MembershipService,
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
      const members = await membershipService.listMembers(
        actorUserId,
        workspaceId,
      );

      response.status(200).json({
        status: "ok",
        data: { members },
      });
    } catch (error: unknown) {
      next(error);
    }
  };
}

export function updateMemberRoleController(
  membershipService: MembershipService,
): RequestHandler {
  return async (request, response, next) => {
    const parsedInput = updateMembershipSchema.safeParse(request.body);

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

    const actorUserId = getAuthenticatedUserId(request, next);
    const workspaceId = getRouteParam(
      request,
      "workspaceId",
      next,
      "INVALID_WORKSPACE_ID",
    );
    const membershipId = getRouteParam(
      request,
      "membershipId",
      next,
      "INVALID_MEMBERSHIP_ID",
    );

    if (!actorUserId || !workspaceId || !membershipId) {
      return;
    }

    try {
      const membership = await membershipService.updateMemberRole(
        actorUserId,
        workspaceId,
        membershipId,
        parsedInput.data,
      );

      response.status(200).json({
        status: "ok",
        data: { membership },
      });
    } catch (error: unknown) {
      next(error);
    }
  };
}

export function removeMemberController(
  membershipService: MembershipService,
): RequestHandler {
  return async (request, response, next) => {
    const actorUserId = getAuthenticatedUserId(request, next);
    const workspaceId = getRouteParam(
      request,
      "workspaceId",
      next,
      "INVALID_WORKSPACE_ID",
    );
    const membershipId = getRouteParam(
      request,
      "membershipId",
      next,
      "INVALID_MEMBERSHIP_ID",
    );

    if (!actorUserId || !workspaceId || !membershipId) {
      return;
    }

    try {
      await membershipService.removeMember(
        actorUserId,
        workspaceId,
        membershipId,
      );
      response.status(204).send();
    } catch (error: unknown) {
      next(error);
    }
  };
}
