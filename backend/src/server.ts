import { createServer, type Server } from "node:http";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import type { Express } from "express";
import type { Logger } from "pino";
import { createApp } from "./app.js";
import { config } from "./config.js";
import {
  checkDatabase,
  disconnectDatabase,
} from "./infrastructure/database/prisma.js";
import { logger } from "./logger.js";

export interface ServerOptions {
  app?: Express;
  host?: string;
  logger?: Logger;
  port?: number;
  readinessCheck?: () => Promise<void>;
}

const pendingClosures = new WeakMap<Server, Promise<void>>();

export async function startServer({
  app,
  host = config.HOST,
  logger: serverLogger = logger,
  port = config.PORT,
  readinessCheck,
}: ServerOptions = {}): Promise<Server> {
  const server = createServer(
    app ??
      createApp({
        logger: serverLogger,
        readinessCheck: readinessCheck ?? checkDatabase,
      }),
  );

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const handleError = (error: Error) => {
      server.off("listening", handleListening);
      rejectPromise(error);
    };

    const handleListening = () => {
      server.off("error", handleError);
      resolvePromise();
    };

    server.once("error", handleError);
    server.once("listening", handleListening);
    server.listen(port, host);
  });

  serverLogger.info({ address: server.address() }, "server listening");
  return server;
}

export function closeServer(
  server: Server,
  shutdownLogger: Logger = logger,
): Promise<void> {
  const existingClosure = pendingClosures.get(server);
  if (existingClosure) {
    return existingClosure;
  }

  const closure = new Promise<void>((resolvePromise, rejectPromise) => {
    if (!server.listening) {
      resolvePromise();
      return;
    }

    server.close((error) => {
      if (error) {
        shutdownLogger.error({ err: error }, "server shutdown failed");
        rejectPromise(error);
        return;
      }

      resolvePromise();
    });
  });

  pendingClosures.set(server, closure);
  return closure;
}

async function main(): Promise<void> {
  const runningServer = await startServer();

  const shutdown = (signal: NodeJS.Signals) => {
    logger.info({ signal }, "shutdown signal received");

    void closeServer(runningServer)
      .then(() => disconnectDatabase())
      .then(() => {
        logger.info("server closed");
      })
      .catch((error: unknown) => {
        logger.fatal({ err: error }, "server shutdown failed");
        process.exitCode = 1;
      });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : undefined;

if (invokedFile === currentFile) {
  void main().catch((error: unknown) => {
    logger.fatal({ err: error }, "server failed to start");
    process.exitCode = 1;
  });
}
