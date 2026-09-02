import type { Server } from "node:http";
import pino from "pino";
import request from "supertest";
import { afterAll, afterEach, describe, expect, test } from "vitest";
import { disconnectDatabase } from "../../src/infrastructure/database/prisma.js";
import { closeServer, startServer } from "../../src/server.js";

const silentLogger = pino({ enabled: false });
const activeServers: Server[] = [];

afterEach(async () => {
  for (const server of activeServers.splice(0)) {
    await closeServer(server, silentLogger);
  }
});

afterAll(async () => {
  await disconnectDatabase();
});

describe("HTTP server lifecycle", () => {
  test("starts on an ephemeral port and serves the application", async () => {
    const server = await startServer({
      host: "127.0.0.1",
      logger: silentLogger,
      port: 0,
    });
    activeServers.push(server);

    expect(server.listening).toBe(true);
    expect(server.address()).not.toBeNull();

    const response = await request(server).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  test("uses the injected readiness check for the default application", async () => {
    let checks = 0;
    const readinessCheck = async () => {
      checks += 1;
    };
    const server = await startServer({
      host: "127.0.0.1",
      logger: silentLogger,
      port: 0,
      readinessCheck,
    });
    activeServers.push(server);

    const response = await request(server).get("/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ready" });
    expect(checks).toBe(1);
  });

  test("uses PostgreSQL for the default readiness check", async () => {
    const server = await startServer({
      host: "127.0.0.1",
      logger: silentLogger,
      port: 0,
    });
    activeServers.push(server);

    const response = await request(server).get("/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ready" });
  });

  test("closes cleanly and treats repeated shutdown as safe", async () => {
    const server = await startServer({
      host: "127.0.0.1",
      logger: silentLogger,
      port: 0,
    });
    activeServers.push(server);

    await expect(closeServer(server, silentLogger)).resolves.toBeUndefined();
    await expect(closeServer(server, silentLogger)).resolves.toBeUndefined();
    expect(server.listening).toBe(false);
  });
});
