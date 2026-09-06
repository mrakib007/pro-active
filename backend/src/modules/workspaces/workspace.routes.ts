import { Router, type Router as ExpressRouter } from "express";
import { createSessionService } from "../auth/session.service.js";
import { createAuthenticationMiddleware } from "../auth/auth.middleware.js";
import type { SessionService } from "../auth/auth.types.js";
import { createWorkspaceController } from "./workspace.controller.js";
import { createWorkspaceService } from "./workspace.service.js";
import type { WorkspaceService } from "./workspace.types.js";

const defaultSessionService = createSessionService();
const defaultWorkspaceService = createWorkspaceService();

export function createWorkspaceRouter(
  workspaceService: WorkspaceService = defaultWorkspaceService,
  sessionService: SessionService = defaultSessionService,
): ExpressRouter {
  const router = Router();

  router.post(
    "/",
    createAuthenticationMiddleware(sessionService),
    createWorkspaceController(workspaceService),
  );

  return router;
}
