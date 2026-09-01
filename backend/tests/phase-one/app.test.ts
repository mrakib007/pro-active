import pino from "pino";
import request from "supertest";
import { describe, expect, test } from "vitest";
import { createApp } from "../../src/app.js";

const silentLogger = pino({ enabled: false });

function makeApp(readinessCheck: () => Promise<void> = async () => undefined) {
  return createApp({
    logger: silentLogger,
    readinessCheck,
    uptimeSeconds: () => 12.345,
  });
}

describe("HTTP application", () => {
  test("reports liveness without depending on external services", async () => {
    const response = await request(makeApp()).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "pro-active-backend",
      uptimeSeconds: 12.345,
    });
  });

  test("reports readiness when the readiness check succeeds", async () => {
    const response = await request(makeApp()).get("/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ready" });
  });

  test("reports service-not-ready when the readiness check fails", async () => {
    const response = await request(
      makeApp(async () => {
        throw new Error("database unavailable");
      }),
    ).get("/ready");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: "error",
      code: "SERVICE_NOT_READY",
      message: "Service is not ready",
    });
  });

  test("returns a stable error for an unknown route", async () => {
    const response = await request(makeApp()).get("/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      status: "error",
      code: "ROUTE_NOT_FOUND",
      message: "Route not found",
    });
  });

  test("returns a client error for malformed JSON", async () => {
    const response = await request(makeApp())
      .post("/health")
      .set("content-type", "application/json")
      .send('{"broken":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      status: "error",
      code: "INVALID_JSON",
      message: "Request body contains invalid JSON",
    });
  });
});
