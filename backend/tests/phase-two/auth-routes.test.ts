import pino from "pino";
import request from "supertest";
import { describe, expect, test, vi } from "vitest";
import { createApp } from "../../src/app.js";
import { UserEmailAlreadyExistsError } from "../../src/modules/auth/auth.repository.js";
import { InvalidCredentialsError } from "../../src/modules/auth/auth.service.js";
import { SESSION_COOKIE_NAME } from "../../src/modules/auth/session.service.js";
import type {
  AuthService,
  LoginResult,
  LoginService,
  PublicUser,
  SessionService,
} from "../../src/modules/auth/auth.types.js";

const silentLogger = pino({ enabled: false });
const publicUser: PublicUser = {
  id: "user-id",
  fullName: "Rakib Hasan",
  email: "person@example.com",
  createdAt: new Date("2026-09-03T00:00:00.000Z"),
};
const csrfCookieName = "pro_active_csrf";
const csrfToken = "csrf-token";

function makeSessionService(
  overrides: Partial<SessionService> = {},
): SessionService {
  return {
    createSession: async () => ({
      token: "session-token",
      expiresAt: new Date("2026-09-10T00:00:00.000Z"),
    }),
    getCurrentUser: async () => null,
    revokeSession: async () => undefined,
    ...overrides,
  };
}

function makeApp(
  registrationService: AuthService,
  options: {
    loginService?: LoginService;
    sessionService?: SessionService;
  } = {},
) {
  return createApp({
    logger: silentLogger,
    readinessCheck: async () => undefined,
    registrationService,
    ...options,
  });
}

describe("registration route", () => {
  test("registers a valid user and returns only public user data", async () => {
    const registerUser = vi.fn(async () => publicUser);
    const registrationService: AuthService = { registerUser };

    const response = await request(makeApp(registrationService))
      .post("/api/auth/register")
      .send({
        fullName: "  Rakib Hasan  ",
        email: " PERSON@Example.COM ",
        password: "A secure password",
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      status: "ok",
      data: {
        user: {
          id: "user-id",
          fullName: "Rakib Hasan",
          email: "person@example.com",
          createdAt: "2026-09-03T00:00:00.000Z",
        },
      },
    });
    expect(response.body.data.user).not.toHaveProperty("passwordHash");
    expect(registerUser).toHaveBeenCalledWith({
      fullName: "Rakib Hasan",
      email: "person@example.com",
      password: "A secure password",
    });
  });

  test("rejects invalid input before calling the registration service", async () => {
    const registerUser = vi.fn(async () => publicUser);
    const registrationService: AuthService = { registerUser };

    const response = await request(makeApp(registrationService))
      .post("/api/auth/register")
      .send({
        fullName: "",
        email: "not-an-email",
        password: "short",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      status: "error",
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      details: {
        formErrors: [],
        fieldErrors: {
          fullName: ["Full name is required"],
          email: ["Enter a valid email address"],
          password: ["Password must be at least eight characters"],
        },
      },
    });
    expect(registerUser).not.toHaveBeenCalled();
  });

  test("does not accept a client-selected role", async () => {
    const registerUser = vi.fn(async () => publicUser);
    const registrationService: AuthService = { registerUser };

    const response = await request(makeApp(registrationService))
      .post("/api/auth/register")
      .send({
        fullName: "Rakib Hasan",
        email: "person@example.com",
        password: "A secure password",
        role: "OWNER",
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(registerUser).not.toHaveBeenCalled();
  });

  test("returns a conflict when the email is already registered", async () => {
    const registerUser = vi.fn(async () => {
      throw new UserEmailAlreadyExistsError();
    });
    const registrationService: AuthService = { registerUser };

    const response = await request(makeApp(registrationService))
      .post("/api/auth/register")
      .send({
        fullName: "Rakib Hasan",
        email: "person@example.com",
        password: "A secure password",
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      status: "error",
      code: "EMAIL_ALREADY_REGISTERED",
      message: "An account with that email already exists",
    });
  });
});

describe("login route", () => {
  test("logs in a valid user and sets an HttpOnly session cookie", async () => {
    const loginResult: LoginResult = {
      user: publicUser,
      sessionToken: "session-token",
      expiresAt: new Date("2026-09-10T00:00:00.000Z"),
    };
    const loginUser = vi.fn(async () => loginResult);
    const loginService: LoginService = { loginUser };
    const registrationService: AuthService = {
      registerUser: async () => publicUser,
    };

    const response = await request(
      makeApp(registrationService, { loginService }),
    )
      .post("/api/auth/login")
      .send({
        email: " PERSON@Example.COM ",
        password: "A secure password",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      data: {
        user: {
          ...publicUser,
          createdAt: "2026-09-03T00:00:00.000Z",
        },
      },
    });
    expect(response.body.data.user).not.toHaveProperty("passwordHash");
    expect(loginUser).toHaveBeenCalledWith({
      email: "person@example.com",
      password: "A secure password",
    });
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${SESSION_COOKIE_NAME}=session-token`),
        expect.stringContaining(`${csrfCookieName}=`),
        expect.stringContaining("HttpOnly"),
        expect.stringContaining("SameSite=Lax"),
      ]),
    );

    const setCookies = response.headers["set-cookie"] as unknown as string[];
    const csrfCookie = setCookies.find((cookie) =>
      cookie.startsWith(`${csrfCookieName}=`),
    );
    expect(csrfCookie).not.toContain("HttpOnly");
  });

  test("rejects invalid login input before calling the login service", async () => {
    const loginUser = vi.fn(async () => ({
      user: publicUser,
      sessionToken: "session-token",
      expiresAt: new Date("2026-09-10T00:00:00.000Z"),
    }));
    const loginService: LoginService = { loginUser };
    const registrationService: AuthService = {
      registerUser: async () => publicUser,
    };

    const response = await request(
      makeApp(registrationService, { loginService }),
    )
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: "short" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(loginUser).not.toHaveBeenCalled();
  });

  test("returns a generic unauthorized response for invalid credentials", async () => {
    const loginService: LoginService = {
      loginUser: async () => {
        throw new InvalidCredentialsError();
      },
    };
    const registrationService: AuthService = {
      registerUser: async () => publicUser,
    };

    const response = await request(
      makeApp(registrationService, { loginService }),
    )
      .post("/api/auth/login")
      .send({
        email: "person@example.com",
        password: "A wrong password",
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      status: "error",
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
    });
  });
});

describe("session routes", () => {
  const registrationService: AuthService = {
    registerUser: async () => publicUser,
  };

  test("returns the current user for a valid session cookie", async () => {
    let receivedToken: string | undefined;
    const sessionService = makeSessionService({
      getCurrentUser: async (token) => {
        receivedToken = token;
        return publicUser;
      },
    });

    const response = await request(
      makeApp(registrationService, { sessionService }),
    )
      .get("/api/auth/me")
      .set("Cookie", `${SESSION_COOKIE_NAME}=session-token`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      data: {
        user: {
          ...publicUser,
          createdAt: "2026-09-03T00:00:00.000Z",
        },
      },
    });
    expect(receivedToken).toBe("session-token");
  });

  test("rejects a request without a session", async () => {
    const getCurrentUser = vi.fn(async () => publicUser);
    const sessionService = makeSessionService({ getCurrentUser });

    const response = await request(
      makeApp(registrationService, { sessionService }),
    ).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      status: "error",
      code: "AUTHENTICATION_REQUIRED",
      message: "Authentication required",
    });
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  test("revokes the session and clears the cookie on logout", async () => {
    let revokedToken: string | undefined;
    const sessionService = makeSessionService({
      revokeSession: async (token) => {
        revokedToken = token;
      },
    });

    const response = await request(
      makeApp(registrationService, { sessionService }),
    )
      .post("/api/auth/logout")
      .set(
        "Cookie",
        `${SESSION_COOKIE_NAME}=session-token; ${csrfCookieName}=${csrfToken}`,
      )
      .set("X-CSRF-Token", csrfToken);

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(revokedToken).toBe("session-token");
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${SESSION_COOKIE_NAME}=;`),
        expect.stringContaining(`${csrfCookieName}=;`),
      ]),
    );
  });

  test("rejects logout without a CSRF token", async () => {
    const revokeSession = vi.fn(async () => undefined);
    const sessionService = makeSessionService({ revokeSession });

    const response = await request(
      makeApp(registrationService, { sessionService }),
    )
      .post("/api/auth/logout")
      .set("Cookie", `${SESSION_COOKIE_NAME}=session-token`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      status: "error",
      code: "CSRF_TOKEN_MISSING",
      message: "CSRF token is required",
    });
    expect(revokeSession).not.toHaveBeenCalled();
  });
});
