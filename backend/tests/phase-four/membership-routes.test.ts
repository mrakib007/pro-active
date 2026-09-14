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

const listedMember = {
  id: "membership-id",
  workspaceId: "workspace-id",
  userId: "member-id",
  fullName: "Nadia Ahmed",
  email: "nadia@example.com",
  role: "MEMBER",
  createdAt: new Date("2026-09-07T00:00:00.000Z"),
};

type MembershipServiceDouble = {
  listMembers(actorUserId: string, workspaceId: string): Promise<unknown[]>;
  addMember?: (
    actorUserId: string,
    workspaceId: string,
    input: { email: string; role: "ADMIN" | "MEMBER" },
  ) => Promise<unknown>;
  updateMemberRole(
    actorUserId: string,
    workspaceId: string,
    membershipId: string,
    input: { role: "ADMIN" | "MEMBER" },
  ): Promise<unknown>;
  removeMember(
    actorUserId: string,
    workspaceId: string,
    membershipId: string,
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
  membershipService: MembershipServiceDouble,
  sessionService: SessionService = makeSessionService(),
) {
  const appOptions = {
    logger: silentLogger,
    readinessCheck: async () => undefined,
    sessionService,
    membershipService,
  };

  return createApp(appOptions as unknown as Parameters<typeof createApp>[0]);
}

function mutationCookies() {
  return (
    SESSION_COOKIE_NAME + "=session-token; " + csrfCookieName + "=" + csrfToken
  );
}

describe("membership routes", () => {
  test("validates a new member before calling the service", async () => {
    const addMember = vi.fn(async () => listedMember);
    const membershipService: MembershipServiceDouble = {
      listMembers: async () => [listedMember],
      addMember,
      updateMemberRole: async () => listedMember,
      removeMember: async () => undefined,
    };
    const sessionService = makeSessionService({
      getCurrentUser: async () => publicUser,
    });

    const response = await request(makeApp(membershipService, sessionService))
      .post("/api/workspaces/workspace-id/members")
      .set("Cookie", mutationCookies())
      .set("X-CSRF-Token", csrfToken)
      .send({ email: "not-an-email", role: "OWNER" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(addMember).not.toHaveBeenCalled();
  });

  test("adds a member through the authenticated API", async () => {
    const addedMember = {
      ...listedMember,
      userId: "new-member-id",
      fullName: "Fahim Rahman",
      email: "fahim@example.com",
    };
    const addMember = vi.fn(async () => addedMember);
    const membershipService: MembershipServiceDouble = {
      listMembers: async () => [listedMember],
      addMember,
      updateMemberRole: async () => listedMember,
      removeMember: async () => undefined,
    };
    const sessionService = makeSessionService({
      getCurrentUser: async () => publicUser,
    });

    const response = await request(makeApp(membershipService, sessionService))
      .post("/api/workspaces/workspace-id/members")
      .set("Cookie", mutationCookies())
      .set("X-CSRF-Token", csrfToken)
      .send({ email: " Fahim@Example.com ", role: "MEMBER" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      status: "ok",
      data: {
        membership: {
          ...addedMember,
          createdAt: "2026-09-07T00:00:00.000Z",
        },
      },
    });
    expect(addMember).toHaveBeenCalledWith("user-id", "workspace-id", {
      email: "fahim@example.com",
      role: "MEMBER",
    });
  });

  test("rejects adding a member without a CSRF token", async () => {
    const addMember = vi.fn(async () => listedMember);
    const membershipService: MembershipServiceDouble = {
      listMembers: async () => [listedMember],
      addMember,
      updateMemberRole: async () => listedMember,
      removeMember: async () => undefined,
    };
    const sessionService = makeSessionService({
      getCurrentUser: async () => publicUser,
    });

    const response = await request(makeApp(membershipService, sessionService))
      .post("/api/workspaces/workspace-id/members")
      .set("Cookie", SESSION_COOKIE_NAME + "=session-token")
      .send({ email: "fahim@example.com", role: "MEMBER" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("CSRF_TOKEN_MISSING");
    expect(addMember).not.toHaveBeenCalled();
  });

  test("requires authentication when listing workspace members", async () => {
    const listMembers = vi.fn(async () => [listedMember]);
    const membershipService: MembershipServiceDouble = {
      listMembers,
      updateMemberRole: async () => listedMember,
      removeMember: async () => undefined,
    };

    const response = await request(makeApp(membershipService)).get(
      "/api/workspaces/workspace-id/members",
    );

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      status: "error",
      code: "AUTHENTICATION_REQUIRED",
      message: "Authentication required",
    });
    expect(listMembers).not.toHaveBeenCalled();
  });

  test("lists workspace members for an authenticated member", async () => {
    const listMembers = vi.fn(async () => [listedMember]);
    const membershipService: MembershipServiceDouble = {
      listMembers,
      updateMemberRole: async () => listedMember,
      removeMember: async () => undefined,
    };
    const sessionService = makeSessionService({
      getCurrentUser: async () => publicUser,
    });

    const response = await request(makeApp(membershipService, sessionService))
      .get("/api/workspaces/workspace-id/members")
      .set("Cookie", SESSION_COOKIE_NAME + "=session-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      data: {
        members: [
          {
            id: "membership-id",
            workspaceId: "workspace-id",
            userId: "member-id",
            fullName: "Nadia Ahmed",
            email: "nadia@example.com",
            role: "MEMBER",
            createdAt: "2026-09-07T00:00:00.000Z",
          },
        ],
      },
    });
    expect(listMembers).toHaveBeenCalledWith("user-id", "workspace-id");
  });

  test("validates the role before updating a membership", async () => {
    const updateMemberRole = vi.fn(async () => listedMember);
    const membershipService: MembershipServiceDouble = {
      listMembers: async () => [listedMember],
      updateMemberRole,
      removeMember: async () => undefined,
    };
    const sessionService = makeSessionService({
      getCurrentUser: async () => publicUser,
    });

    const response = await request(makeApp(membershipService, sessionService))
      .patch("/api/workspaces/workspace-id/members/membership-id")
      .set("Cookie", mutationCookies())
      .set("X-CSRF-Token", csrfToken)
      .send({ role: "OWNER" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(updateMemberRole).not.toHaveBeenCalled();
  });

  test("changes a membership role through the authenticated API", async () => {
    const updatedMember = { ...listedMember, role: "ADMIN" };
    const updateMemberRole = vi.fn(async () => updatedMember);
    const membershipService: MembershipServiceDouble = {
      listMembers: async () => [listedMember],
      updateMemberRole,
      removeMember: async () => undefined,
    };
    const sessionService = makeSessionService({
      getCurrentUser: async () => publicUser,
    });

    const response = await request(makeApp(membershipService, sessionService))
      .patch("/api/workspaces/workspace-id/members/membership-id")
      .set("Cookie", mutationCookies())
      .set("X-CSRF-Token", csrfToken)
      .send({ role: "ADMIN" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      data: {
        membership: {
          ...updatedMember,
          createdAt: "2026-09-07T00:00:00.000Z",
        },
      },
    });
    expect(updateMemberRole).toHaveBeenCalledWith(
      "user-id",
      "workspace-id",
      "membership-id",
      { role: "ADMIN" },
    );
  });

  test("removes a membership through the authenticated API", async () => {
    const removeMember = vi.fn(async () => undefined);
    const membershipService: MembershipServiceDouble = {
      listMembers: async () => [listedMember],
      updateMemberRole: async () => listedMember,
      removeMember,
    };
    const sessionService = makeSessionService({
      getCurrentUser: async () => publicUser,
    });

    const response = await request(makeApp(membershipService, sessionService))
      .delete("/api/workspaces/workspace-id/members/membership-id")
      .set("Cookie", mutationCookies())
      .set("X-CSRF-Token", csrfToken);

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(removeMember).toHaveBeenCalledWith(
      "user-id",
      "workspace-id",
      "membership-id",
    );
  });

  test("rejects membership mutations without a CSRF token", async () => {
    const updateMemberRole = vi.fn(async () => listedMember);
    const membershipService: MembershipServiceDouble = {
      listMembers: async () => [listedMember],
      updateMemberRole,
      removeMember: async () => undefined,
    };
    const sessionService = makeSessionService({
      getCurrentUser: async () => publicUser,
    });

    const response = await request(makeApp(membershipService, sessionService))
      .patch("/api/workspaces/workspace-id/members/membership-id")
      .set("Cookie", SESSION_COOKIE_NAME + "=session-token")
      .send({ role: "ADMIN" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("CSRF_TOKEN_MISSING");
    expect(updateMemberRole).not.toHaveBeenCalled();
  });
});
