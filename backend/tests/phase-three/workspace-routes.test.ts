import { MembershipRole } from "@prisma/client";
import pino from "pino";
import request from "supertest";
import { describe, expect, test, vi } from "vitest";
import { createApp } from "../../src/app.js";
import type {
  AuthService,
  PublicUser,
  SessionService,
} from "../../src/modules/auth/auth.types.js";
import { SESSION_COOKIE_NAME } from "../../src/modules/auth/session.service.js";
import type {
  CreatedWorkspace,
  WorkspaceService,
} from "../../src/modules/workspaces/workspace.types.js";

const silentLogger = pino({ enabled: false });
const publicUser: PublicUser = {
  id: "user-id",
  fullName: "Rakib Hasan",
  email: "person@example.com",
  createdAt: new Date("2026-09-03T00:00:00.000Z"),
};

const createdWorkspace: CreatedWorkspace = {
  workspace: {
    id: "workspace-id",
    name: "Product Team",
    createdAt: new Date("2026-09-06T00:00:00.000Z"),
    updatedAt: new Date("2026-09-06T00:00:00.000Z"),
  },
  membership: {
    id: "membership-id",
    workspaceId: "workspace-id",
    userId: "user-id",
    role: MembershipRole.OWNER,
    createdAt: new Date("2026-09-06T00:00:00.000Z"),
  },
};

function makeSessionService(
  overrides: Partial<SessionService> = {},
): SessionService {
  return {
    createSession: async () => ({
      token: "session-token",
      expiresAt: new Date("2026-09-13T00:00:00.000Z"),
    }),
    getCurrentUser: async () => null,
    revokeSession: async () => undefined,
    ...overrides,
  };
}

function makeApp(
  workspaceService: WorkspaceService,
  sessionService: SessionService = makeSessionService(),
) {
  const registrationService: AuthService = {
    registerUser: async () => publicUser,
  };

  return createApp({
    logger: silentLogger,
    readinessCheck: async () => undefined,
    registrationService,
    sessionService,
    workspaceService,
  });
}

describe("workspace routes", () => {
  test("requires an authenticated session", async () => {
    const createWorkspace = vi.fn(async () => createdWorkspace);
    const workspaceService: WorkspaceService = { createWorkspace };

    const response = await request(makeApp(workspaceService))
      .post("/api/workspaces")
      .send({ name: "Product Team" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      status: "error",
      code: "AUTHENTICATION_REQUIRED",
      message: "Authentication required",
    });
    expect(createWorkspace).not.toHaveBeenCalled();
  });

  test("rejects invalid input before calling the workspace service", async () => {
    const createWorkspace = vi.fn(async () => createdWorkspace);
    const workspaceService: WorkspaceService = { createWorkspace };
    const sessionService = makeSessionService({
      getCurrentUser: async () => publicUser,
    });

    const response = await request(makeApp(workspaceService, sessionService))
      .post("/api/workspaces")
      .set("Cookie", SESSION_COOKIE_NAME + "=session-token")
      .send({ name: "" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: "error",
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      details: {
        fieldErrors: { name: ["Workspace name is required"] },
      },
    });
    expect(createWorkspace).not.toHaveBeenCalled();
  });

  test("rejects client-selected membership roles", async () => {
    const createWorkspace = vi.fn(async () => createdWorkspace);
    const workspaceService: WorkspaceService = { createWorkspace };
    const sessionService = makeSessionService({
      getCurrentUser: async () => publicUser,
    });

    const response = await request(makeApp(workspaceService, sessionService))
      .post("/api/workspaces")
      .set("Cookie", SESSION_COOKIE_NAME + "=session-token")
      .send({ name: "Product Team", role: "ADMIN" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(createWorkspace).not.toHaveBeenCalled();
  });

  test("creates a workspace for the authenticated user as its owner", async () => {
    const createWorkspace = vi.fn(async () => createdWorkspace);
    const workspaceService: WorkspaceService = { createWorkspace };
    const sessionService = makeSessionService({
      getCurrentUser: async () => publicUser,
    });

    const response = await request(makeApp(workspaceService, sessionService))
      .post("/api/workspaces")
      .set("Cookie", SESSION_COOKIE_NAME + "=session-token")
      .send({ name: "  Product Team  " });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      status: "ok",
      data: {
        workspace: {
          id: "workspace-id",
          name: "Product Team",
          createdAt: "2026-09-06T00:00:00.000Z",
          updatedAt: "2026-09-06T00:00:00.000Z",
        },
        membership: {
          id: "membership-id",
          workspaceId: "workspace-id",
          userId: "user-id",
          role: "OWNER",
          createdAt: "2026-09-06T00:00:00.000Z",
        },
      },
    });
    expect(createWorkspace).toHaveBeenCalledWith("user-id", {
      name: "Product Team",
    });
  });
});
