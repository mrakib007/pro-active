import compression from "compression";
import express, { type ErrorRequestHandler, type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import type { Logger } from "pino";
import { AppError, normalizeError } from "./errors.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import type { AuthService } from "./modules/auth/auth.types.js";

export interface AppOptions {
  logger: Logger;
  readinessCheck?: () => Promise<void>;
  registrationService?: AuthService;
  uptimeSeconds?: () => number;
}

export function createApp({
  logger,
  readinessCheck = async () => undefined,
  registrationService,
  uptimeSeconds = () => process.uptime(),
}: AppOptions): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(compression());
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: "1mb" }));

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

  app.use("/api/auth", createAuthRouter(registrationService));

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
