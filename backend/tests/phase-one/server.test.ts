import type { Server } from "node:http";
import pino from "pino";
import request from "supertest";
import { afterEach, describe, expect, test } from "vitest";
import { closeServer, startServer } from "../../src/server.js";

const silentLogger = pino({ enabled: false });
const activeServers: Server[] = [];

afterEach(async () => {
  for (const server of activeServers.splice(0)) {
    await closeServer(server, silentLogger);
  }
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
