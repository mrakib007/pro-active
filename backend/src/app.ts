import compression from "compression";
import cookieParser from "cookie-parser";
import express, { type ErrorRequestHandler, type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import type { Logger } from "pino";
import { AppError, normalizeError } from "./errors.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import type {
  AuthService,
  LoginService,
  SessionService,
} from "./modules/auth/auth.types.js";
import type { LoginRateLimiter } from "./modules/auth/login-rate-limiter.js";
import { createWorkspaceRouter } from "./modules/workspaces/workspace.routes.js";
import type { WorkspaceService } from "./modules/workspaces/workspace.types.js";
import { createMembershipRouter } from "./modules/memberships/membership.routes.js";
import type { MembershipService } from "./modules/memberships/membership.types.js";
import { createProjectRouter } from "./modules/projects/project.routes.js";
import type { ProjectService } from "./modules/projects/project.types.js";

export interface AppOptions {
  logger: Logger;
  loginService?: LoginService;
  loginRateLimiter?: LoginRateLimiter;
  readinessCheck?: () => Promise<void>;
  registrationService?: AuthService;
  sessionService?: SessionService;
  uptimeSeconds?: () => number;
  workspaceService?: WorkspaceService;
  membershipService?: MembershipService;
  projectService?: ProjectService;
}

export function createApp({
  logger,
  loginService,
  loginRateLimiter,
  readinessCheck = async () => undefined,
  registrationService,
  sessionService,
  uptimeSeconds = () => process.uptime(),
  workspaceService,
  membershipService,
  projectService,
}: AppOptions): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(compression());
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/health", (_request, response) => {
    response.status(200).json({
      status: "ok",
      service: "pro-active-backend",
      uptimeSeconds: uptimeSeconds(),
    });
  });

  app.get("/ready", async (_request, response, next) => {
    try {
      await readinessCheck();
      response.status(200).json({ status: "ready" });
    } catch {
      next(new AppError(503, "SERVICE_NOT_READY", "Service is not ready"));
    }
  });

  app.use(
    "/api/auth",
    createAuthRouter(
      registrationService,
      loginService,
      sessionService,
      loginRateLimiter,
    ),
  );
  app.use(
    "/api/workspaces",
    createWorkspaceRouter(workspaceService, sessionService),
  );
  app.use(
    "/api/workspaces/:workspaceId/members",
    createMembershipRouter(membershipService, sessionService),
  );
  app.use(
    "/api/workspaces/:workspaceId/projects",
    createProjectRouter(projectService, sessionService),
  );

  app.use((_request, _response, next) => {
    next(new AppError(404, "ROUTE_NOT_FOUND", "Route not found"));
  });

  const errorHandler: ErrorRequestHandler = (
    error,
    _request,
    response,
    next,
  ) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    const normalizedError = normalizeError(error);
    const logContext = { err: error, code: normalizedError.code };

    if (normalizedError.statusCode >= 500) {
      logger.error(logContext, normalizedError.message);
    } else {
      logger.warn(logContext, normalizedError.message);
    }

    response.status(normalizedError.statusCode).json({
      status: "error",
      code: normalizedError.code,
      message: normalizedError.message,
      ...(normalizedError.details === undefined
        ? {}
        : { details: normalizedError.details }),
    });
  };

  app.use(errorHandler);

  return app;
}
