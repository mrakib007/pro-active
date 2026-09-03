import { Router, type Router as ExpressRouter } from "express";
import { createRegisterController } from "./auth.controller.js";
import { createAuthService } from "./auth.service.js";
import type { AuthService } from "./auth.types.js";

const defaultAuthService = createAuthService();

export function createAuthRouter(
  registrationService: AuthService = defaultAuthService,
): ExpressRouter {
  const router = Router();

  router.post("/register", createRegisterController(registrationService));

  return router;
}
