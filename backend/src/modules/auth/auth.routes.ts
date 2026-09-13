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
import { createCsrfProtectionMiddleware } from "../../security/csrf.js";
import {
  createLoginRateLimiter,
  type LoginRateLimiter,
} from "./login-rate-limiter.js";
import type {
  AuthService,
  LoginService,
  SessionService,
} from "./auth.types.js";

const defaultSessionService = createSessionService();
const defaultAuthService = createAuthService({
  sessionService: defaultSessionService,
});
const defaultLoginRateLimiter = createLoginRateLimiter();

export function createAuthRouter(
  registrationService: AuthService = defaultAuthService,
  loginService: LoginService = defaultAuthService,
  sessionService: SessionService = defaultSessionService,
  loginRateLimiter: LoginRateLimiter = defaultLoginRateLimiter,
): ExpressRouter {
  const router = Router();
  const csrfProtection = createCsrfProtectionMiddleware();

  router.post("/register", createRegisterController(registrationService));
  router.post("/login", createLoginController(loginService, loginRateLimiter));
  router.get(
    "/me",
    createAuthenticationMiddleware(sessionService),
    createCurrentUserController(),
  );
  router.post(
    "/logout",
    csrfProtection,
    createLogoutController(sessionService),
  );

  return router;
}
