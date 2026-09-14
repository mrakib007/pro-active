import { Router, type Router as ExpressRouter } from "express";
import { createAuthenticationMiddleware } from "../auth/auth.middleware.js";
import { createSessionService } from "../auth/session.service.js";
import { createCsrfProtectionMiddleware } from "../../security/csrf.js";
import type { SessionService } from "../auth/auth.types.js";
import {
  listMembersController,
  removeMemberController,
  updateMemberRoleController,
} from "./membership.controller.js";
import { createMembershipService } from "./membership.service.js";
import type { MembershipService } from "./membership.types.js";

const defaultSessionService = createSessionService();
const defaultMembershipService = createMembershipService();

export function createMembershipRouter(
  membershipService: MembershipService = defaultMembershipService,
  sessionService: SessionService = defaultSessionService,
): ExpressRouter {
  const router = Router({ mergeParams: true });
  const authentication = createAuthenticationMiddleware(sessionService);
  const csrfProtection = createCsrfProtectionMiddleware();

  router.get("/", authentication, listMembersController(membershipService));
  router.patch(
    "/:membershipId",
    authentication,
    csrfProtection,
    updateMemberRoleController(membershipService),
  );
  router.delete(
    "/:membershipId",
    authentication,
    csrfProtection,
    removeMemberController(membershipService),
  );

  return router;
}
