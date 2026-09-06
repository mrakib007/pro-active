# Phase 0: Runtime Foundation

This note records the concepts and evidence behind the first ProjectHub backend phase. It is part of the learning work; the implementation is intentionally small and is not a claim that the service is production-ready.

## What problem this phase solves

Before adding users, workspaces, or tasks, the backend needs a reliable runtime boundary. We need to know how a request enters the process, how configuration is validated, how errors become safe HTTP responses, how operators check service health, and how the process stops without abruptly dropping work.

## Request lifecycle

```text
client
  -> Node HTTP server
  -> request logger
  -> security and compression middleware
  -> JSON body parser
  -> route handler
  -> 404 middleware when no route matches
  -> error middleware when a handler fails
  -> HTTP response
```

`createApp()` builds this behavior without binding a network port. `startServer()` owns the network listener. Keeping those responsibilities separate makes the HTTP behavior testable without starting a process and lets the same application be mounted by another runtime later.

## Configuration

`loadConfig()` parses environment values with Zod at startup. Defaults are explicit for local development: `NODE_ENV=development`, `HOST=127.0.0.1`, `PORT=3001`, and `LOG_LEVEL=info`.

The important rule is fail-fast configuration. A value such as port `70000` is rejected before the server starts. This prevents a process from running with a configuration that will fail only when traffic arrives. The parser accepts an environment object as an argument so tests do not need to mutate the real process environment.

## Liveness versus readiness

- `/health` answers: “Is this process alive enough to answer HTTP?” It does not call PostgreSQL or Redis.
- `/ready` answers: “Can this process safely receive normal traffic?” It runs an injected readiness check. The current default succeeds because external services are not part of this phase; future phases will connect the check to the database and Redis.

This distinction matters during deployments. A process can be alive while its database connection is unavailable. A load balancer should not send normal traffic to a process that is alive but not ready.

## Error contract

Client-visible errors have a stable shape:

```json
{
  "status": "error",
  "code": "ROUTE_NOT_FOUND",
  "message": "Route not found"
}
```

Malformed JSON becomes `400 INVALID_JSON`; an unknown route becomes `404 ROUTE_NOT_FOUND`; a failed readiness check becomes `503 SERVICE_NOT_READY`. Unknown failures become `500 INTERNAL_SERVER_ERROR` without exposing stack traces or internal messages. The logger still receives the original error for diagnosis.

## Logging and middleware

Pino provides structured logs, and `pino-http` attaches request-level logging around the Express application. Helmet adds baseline security headers, compression reduces response size, and the JSON parser has a `1mb` limit so a client cannot send an unbounded request body by default.

The logger is injected into `createApp()`. Tests use a disabled logger, while the runtime uses the configured logger. This avoids coupling the application behavior to a global output stream.

## Graceful shutdown

`closeServer()` closes the HTTP listener and resolves after the close callback completes. It is idempotent: repeated shutdown requests reuse the same promise. The direct server entrypoint registers `SIGINT` and `SIGTERM` handlers that call this function, allowing existing connections to finish before the process exits naturally.

## Evidence

Verified from `backend` on 2026-09-01:

- `npm test` - 3 test files passed, 9 tests passed.
- `npm run typecheck` - passed.
- `npm run build` - passed and emitted `dist/`.
- `npm run lint` - passed with no errors.
- `npm run format:check` - all matched files use Prettier code style.

The tests cover default and invalid configuration, liveness, readiness success and failure, stable 404 and malformed-JSON responses, ephemeral-port startup, and repeated shutdown.

## Explain it back

The key ideas to be able to explain without looking at the code are:

1. Why `/health` should not depend on a database while `/ready` may depend on it.
2. Why `createApp()` and `startServer()` are separate functions.
3. Why the error handler hides unknown error messages from clients but logs the original error.
4. Why shutdown must stop accepting new connections and wait for the close callback.
5. Why configuration validation belongs at startup instead of inside individual route handlers.

## Next experiment

The next phase will add PostgreSQL and migrations. The readiness check will then become a real database check, and we will compare what a liveness-only deployment does when PostgreSQL is unavailable.
