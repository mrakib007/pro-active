import pino from "pino";
import request from "supertest";
import { describe, expect, test, vi } from "vitest";
import { createApp } from "../../src/app.js";
import { UserEmailAlreadyExistsError } from "../../src/modules/auth/auth.repository.js";
import type {
  AuthService,
  PublicUser,
} from "../../src/modules/auth/auth.types.js";

const silentLogger = pino({ enabled: false });
const publicUser: PublicUser = {
  id: "user-id",
  fullName: "Rakib Hasan",
  email: "person@example.com",
  createdAt: new Date("2026-09-03T00:00:00.000Z"),
};

function makeApp(registrationService: AuthService) {
  return createApp({
    logger: silentLogger,
    readinessCheck: async () => undefined,
    registrationService,
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
