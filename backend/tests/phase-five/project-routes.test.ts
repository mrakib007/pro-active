import pino from "pino";
import request from "supertest";
import { describe, expect, test, vi } from "vitest";
import { createApp } from "../../src/app.js";
import type {
  PublicUser,
  SessionService,
} from "../../src/modules/auth/auth.types.js";
import { SESSION_COOKIE_NAME } from "../../src/modules/auth/session.service.js";

const silentLogger = pino({ enabled: false });
const publicUser: PublicUser = {
  id: "user-id",
  fullName: "Rakib Hasan",
  email: "person@example.com",
  createdAt: new Date("2026-09-03T00:00:00.000Z"),
};
const csrfCookieName = "pro_active_csrf";
const csrfToken = "csrf-token";
const project = {
  id: "project-id",
  workspaceId: "workspace-id",
  name: "Editorial launch",
  description: "Prepare the next release.",
  createdAt: new Date("2026-09-14T00:00:00.000Z"),
  updatedAt: new Date("2026-09-14T00:00:00.000Z"),
};

type ProjectServiceDouble = {
  listProjects(actorUserId: string, workspaceId: string): Promise<unknown[]>;
  createProject(
    actorUserId: string,
    workspaceId: string,
    input: { name: string; description?: string },
  ): Promise<unknown>;
  updateProject(
    actorUserId: string,
    workspaceId: string,
    projectId: string,
    input: { name: string; description?: string },
  ): Promise<unknown>;
  deleteProject(
    actorUserId: string,
    workspaceId: string,
    projectId: string,
  ): Promise<void>;
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
  projectService: ProjectServiceDouble,
  sessionService: SessionService = makeSessionService(),
) {
  const appOptions = {
    logger: silentLogger,
    readinessCheck: async () => undefined,
    sessionService,
    projectService,
  };

  return createApp(appOptions as unknown as Parameters<typeof createApp>[0]);
}

function mutationCookies() {
  return (
    SESSION_COOKIE_NAME +
    "=" +
    "session-token; " +
    csrfCookieName +
    "=" +
    csrfToken
  );
}

function makeProjectService(
  overrides: Partial<ProjectServiceDouble> = {},
): ProjectServiceDouble {
  return {
    listProjects: async () => [project],
    createProject: async () => project,
    updateProject: async () => project,
    deleteProject: async () => undefined,
    ...overrides,
  };
}

describe("project routes", () => {
  test("validates project creation before calling the service", async () => {
    const createProject = vi.fn(async () => project);
    const sessionService = makeSessionService({
      getCurrentUser: async () => publicUser,
    });

    const response = await request(
      makeApp(makeProjectService({ createProject }), sessionService),
    )
      .post("/api/workspaces/workspace-id/projects")
      .set("Cookie", mutationCookies())
      .set("X-CSRF-Token", csrfToken)
      .send({ name: "", extra: true });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(createProject).not.toHaveBeenCalled();
  });

  test("creates a project through the authenticated API", async () => {
    const createProject = vi.fn(async () => project);
    const sessionService = makeSessionService({
      getCurrentUser: async () => publicUser,
    });

    const response = await request(
      makeApp(makeProjectService({ createProject }), sessionService),
    )
      .post("/api/workspaces/workspace-id/projects")
      .set("Cookie", mutationCookies())
      .set("X-CSRF-Token", csrfToken)
      .send({
        name: " Editorial launch ",
        description: " Prepare the next release. ",
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      status: "ok",
      data: {
        project: {
          ...project,
          createdAt: "2026-09-14T00:00:00.000Z",
          updatedAt: "2026-09-14T00:00:00.000Z",
        },
      },
    });
    expect(createProject).toHaveBeenCalledWith("user-id", "workspace-id", {
      name: "Editorial launch",
      description: "Prepare the next release.",
    });
  });

  test("lists projects for an authenticated workspace member", async () => {
    const listProjects = vi.fn(async () => [project]);
    const sessionService = makeSessionService({
      getCurrentUser: async () => publicUser,
    });

    const response = await request(
      makeApp(makeProjectService({ listProjects }), sessionService),
    )
      .get("/api/workspaces/workspace-id/projects")
      .set("Cookie", SESSION_COOKIE_NAME + "=session-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      data: {
        projects: [
          {
            ...project,
            createdAt: "2026-09-14T00:00:00.000Z",
            updatedAt: "2026-09-14T00:00:00.000Z",
          },
        ],
      },
    });
    expect(listProjects).toHaveBeenCalledWith("user-id", "workspace-id");
  });

  test("updates a project through the authenticated API", async () => {
    const updatedProject = { ...project, name: "Editorial launch v2" };
    const updateProject = vi.fn(async () => updatedProject);
    const sessionService = makeSessionService({
      getCurrentUser: async () => publicUser,
    });

    const response = await request(
      makeApp(makeProjectService({ updateProject }), sessionService),
    )
      .patch("/api/workspaces/workspace-id/projects/project-id")
      .set("Cookie", mutationCookies())
      .set("X-CSRF-Token", csrfToken)
      .send({ name: "Editorial launch v2", description: "" });

    expect(response.status).toBe(200);
    expect(response.body.data.project.name).toBe("Editorial launch v2");
    expect(updateProject).toHaveBeenCalledWith(
      "user-id",
      "workspace-id",
      "project-id",
      { name: "Editorial launch v2", description: "" },
    );
  });

  test("deletes a project through the authenticated API", async () => {
    const deleteProject = vi.fn(async () => undefined);
    const sessionService = makeSessionService({
      getCurrentUser: async () => publicUser,
    });

    const response = await request(
      makeApp(makeProjectService({ deleteProject }), sessionService),
    )
      .delete("/api/workspaces/workspace-id/projects/project-id")
      .set("Cookie", mutationCookies())
      .set("X-CSRF-Token", csrfToken);

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(deleteProject).toHaveBeenCalledWith(
      "user-id",
      "workspace-id",
      "project-id",
    );
  });

  test("rejects project mutations without a CSRF token", async () => {
    const createProject = vi.fn(async () => project);
    const sessionService = makeSessionService({
      getCurrentUser: async () => publicUser,
    });

    const response = await request(
      makeApp(makeProjectService({ createProject }), sessionService),
    )
      .post("/api/workspaces/workspace-id/projects")
      .set("Cookie", SESSION_COOKIE_NAME + "=session-token")
      .send({ name: "Editorial launch" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("CSRF_TOKEN_MISSING");
    expect(createProject).not.toHaveBeenCalled();
  });

  test("requires authentication when listing projects", async () => {
    const listProjects = vi.fn(async () => [project]);

    const response = await request(
      makeApp(makeProjectService({ listProjects })),
    ).get("/api/workspaces/workspace-id/projects");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("AUTHENTICATION_REQUIRED");
    expect(listProjects).not.toHaveBeenCalled();
  });
});
