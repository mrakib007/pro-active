import { Router, type Router as ExpressRouter } from "express";
import { createSessionService } from "../auth/session.service.js";
import { createAuthenticationMiddleware } from "../auth/auth.middleware.js";
import { createCsrfProtectionMiddleware } from "../../security/csrf.js";
import type { SessionService } from "../auth/auth.types.js";
import {
  createWorkspaceController,
  deleteWorkspaceController,
  listWorkspacesController,
  updateWorkspaceController,
} from "./workspace.controller.js";
import { createWorkspaceService } from "./workspace.service.js";
import type { WorkspaceService } from "./workspace.types.js";

const defaultSessionService = createSessionService();
const defaultWorkspaceService = createWorkspaceService();

export function createWorkspaceRouter(
  workspaceService: WorkspaceService = defaultWorkspaceService,
  sessionService: SessionService = defaultSessionService,
): ExpressRouter {
  const router = Router();
  const csrfProtection = createCsrfProtectionMiddleware();

  router.get(
    "/",
    createAuthenticationMiddleware(sessionService),
    listWorkspacesController(workspaceService),
  );
  router.post(
    "/",
    createAuthenticationMiddleware(sessionService),
    csrfProtection,
    createWorkspaceController(workspaceService),
  );
  router.patch(
    "/:workspaceId",
    createAuthenticationMiddleware(sessionService),
    csrfProtection,
    updateWorkspaceController(workspaceService),
  );
  router.delete(
    "/:workspaceId",
    createAuthenticationMiddleware(sessionService),
    csrfProtection,
    deleteWorkspaceController(workspaceService),
  );

  return router;
}
