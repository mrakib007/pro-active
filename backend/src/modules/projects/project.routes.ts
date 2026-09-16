import { Router, type Router as ExpressRouter } from "express";
import { createCsrfProtectionMiddleware } from "../../security/csrf.js";
import { createAuthenticationMiddleware } from "../auth/auth.middleware.js";
import { createSessionService } from "../auth/session.service.js";
import type { SessionService } from "../auth/auth.types.js";
import {
  createProjectController,
  deleteProjectController,
  listProjectsController,
  updateProjectController,
} from "./project.controller.js";
import { createProjectService } from "./project.service.js";
import type { ProjectService } from "./project.types.js";

const defaultProjectService = createProjectService();
const defaultSessionService = createSessionService();

export function createProjectRouter(
  projectService: ProjectService = defaultProjectService,
  sessionService: SessionService = defaultSessionService,
): ExpressRouter {
  const router = Router({ mergeParams: true });
  const authentication = createAuthenticationMiddleware(sessionService);
  const csrfProtection = createCsrfProtectionMiddleware();

  router.get("/", authentication, listProjectsController(projectService));
  router.post(
    "/",
    authentication,
    csrfProtection,
    createProjectController(projectService),
  );
  router.patch(
    "/:projectId",
    authentication,
    csrfProtection,
    updateProjectController(projectService),
  );
  router.delete(
    "/:projectId",
    authentication,
    csrfProtection,
    deleteProjectController(projectService),
  );

  return router;
}
