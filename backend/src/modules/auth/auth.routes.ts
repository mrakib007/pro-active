import { Router, type Router as ExpressRouter } from "express";
import {
  createCurrentUserController,
  createLoginController,
  createLogoutController,
  createRegisterController,
} from "./auth.controller.js";
import { createAuthenticationMiddleware } from "./auth.middleware.js";
import { createAuthService } from "./auth.service.js";
import { createSessionService } from "./session.service.js";
import type {
  AuthService,
  LoginService,
  SessionService,
} from "./auth.types.js";

const defaultSessionService = createSessionService();
const defaultAuthService = createAuthService({
  sessionService: defaultSessionService,
});

export function createAuthRouter(
  registrationService: AuthService = defaultAuthService,
  loginService: LoginService = defaultAuthService,
  sessionService: SessionService = defaultSessionService,
): ExpressRouter {
  const router = Router();

  router.post("/register", createRegisterController(registrationService));
  router.post("/login", createLoginController(loginService));
  router.get(
    "/me",
    createAuthenticationMiddleware(sessionService),
    createCurrentUserController(),
  );
  router.post("/logout", createLogoutController(sessionService));

  return router;
}
