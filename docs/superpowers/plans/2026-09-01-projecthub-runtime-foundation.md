# ProjectHub Runtime Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working backend slice for ProjectHub: a testable HTTP runtime with validated configuration, structured request logging, health/readiness checks, stable errors, and graceful shutdown.

**Architecture:** Build ProjectHub as a feature-oriented modular monolith. Within each feature, use practical MVC: routes and controllers handle HTTP concerns, services contain business rules and transaction boundaries, repositories contain persistence queries, and schemas/types describe contracts. Keep infrastructure concerns such as Prisma, Redis, and queues outside the feature modules. `createApp()` remains separated from server startup, and dependencies such as the logger and readiness check are injected so tests can run without PostgreSQL or Redis.

**Tech Stack:** Node.js 20+, TypeScript, Express, Zod, Pino, pino-http, Helmet, compression, Vitest, Supertest, ESLint, and Prettier. Prisma, PostgreSQL, Redis, and BullMQ remain installed but are not required for this runtime phase.

**Spec:** `C:\Projects\pro-active\LEARNING.md` plus the approved Phase 1 runtime proposal in the conversation.

## Global Constraints

- This repository is for backend engineering and system-design learning; every phase must explain its problem, trade-offs, failure modes, and evidence.
- The first implementation phase must not require PostgreSQL, Redis, or a frontend to run its tests.
- Production behavior must be written only after a test has demonstrated the missing behavior.
- Configuration is parsed once at startup through an explicit `loadConfig()` function.
- Health checks must not expose secrets or internal stack traces.
- Application errors use `{ status: "error", code, message }`; unknown errors return a generic 500 response.
- The planned domain structure is feature-oriented modular MVC; this runtime phase may remain minimal, and the feature folders will be introduced deliberately as the related phases begin.

---

## Persistent learning roadmap

- [x] **Phase 0 - Runtime foundation:** HTTP lifecycle, configuration, logging, error handling, health/readiness, graceful shutdown.
- [x] **Phase 1 - Database foundation:** PostgreSQL connection, migrations, schema design, constraints, joins, transactions.
  - [x] **Phase 1A - Database connection:** local database, Prisma client lifecycle, readiness check, and graceful disconnect.
- [x] **Phase 2 - Authentication:** registration, password hashing, opaque sessions, cookies, logout, revocation, security tests.
- [x] **Phase 3 - Authorization and tenancy:** workspaces, memberships, roles, policy checks, object-level access control.
- [ ] **Phase 4 - Core product:** projects, tasks, comments, activity history, validation, API contracts, transactional writes. *(In progress: workspace-scoped projects are complete; tasks, comments, and activity history remain.)*
- [ ] **Phase 5 - Database performance:** filtering, sorting, pagination, indexes, query plans, N+1 investigation.
- [ ] **Phase 6 - Redis:** rate limiting, cache-aside reads, invalidation, TTLs, cache stampedes, Redis failure behavior.
- [ ] **Phase 7 - Background work:** notification events, outbox records, queues, retries, idempotency, backoff, dead letters.
- [ ] **Phase 8 - Concurrency and realtime:** optimistic locking, race-condition tests, SSE/WebSockets, live updates.
- [ ] **Phase 9 - Scaling and operations:** load tests, metrics, structured logs, stateless replicas, connection pooling, failure drills.

Each phase is allowed to advance only after its implementation, tests, concept note, and system-design reflection are reviewed.

## Planned application architecture

We will reorganize the backend around features before feature implementation begins. This is practical MVC rather than textbook MVC:

```text
backend/src/
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.repository.ts
│   │   ├── auth.schemas.ts
│   │   └── auth.types.ts
│   ├── workspaces/
│   ├── projects/
│   └── tasks/
├── infrastructure/
│   ├── database/
│   ├── cache/
│   └── queue/
├── shared/
├── app.ts
├── server.ts
├── config.ts
├── logger.ts
└── errors.ts
```

The request flow is `route → controller → service → repository → database`. Because the frontend is separate, the API's JSON response/serializer acts as the view; we do not need server-rendered view templates. We will not create every future folder at once—each module and infrastructure boundary will be added when its phase requires it.

## Phase 0 acceptance criteria

The phase is complete when all of the following are true:

- `GET /health` returns HTTP 200 with `{ "status": "ok", "service": "pro-active-backend", "uptimeSeconds": number }`.
- `GET /ready` returns HTTP 200 with `{ "status": "ready" }` when the injected readiness check succeeds.
- `GET /ready` returns HTTP 503 with code `SERVICE_NOT_READY` when the injected readiness check fails.
- An unknown route returns HTTP 404 with code `ROUTE_NOT_FOUND`.
- Malformed JSON returns HTTP 400 with code `INVALID_JSON`.
- Invalid configuration fails before the server starts and reports which fields are invalid without printing secret values.
- The server can listen on an ephemeral port for tests and can close cleanly through an exported shutdown function.
- The test suite, typecheck, build, lint, and formatting checks pass.
- A runtime-foundation concept note records the request lifecycle, readiness versus liveness, error contract, logging choice, shutdown behavior, and observed test evidence.

## Phase 0 file map

- Create `backend/tsconfig.json` - strict TypeScript compiler settings for the minimal source and test directories.
- Modify `backend/package.json` - scripts for development, tests, typechecking, building, linting, and formatting.
- Create `backend/eslint.config.js` - flat ESLint configuration for TypeScript source and tests.
- Create `backend/src/config.ts` - environment parsing and the `loadConfig()` function.
- Create `backend/src/errors.ts` - the application error type and error normalization helpers.
- Create `backend/src/app.ts` - Express app factory, middleware, health/readiness routes, and terminal error handling.
- Create `backend/src/logger.ts` - Pino logger factory used by request logging and application code.
- Create `backend/src/server.ts` - HTTP server startup, direct-run entrypoint, and graceful shutdown.
- Create `backend/tests/phase-one/config.test.ts` - configuration behavior tests.
- Create `backend/tests/phase-one/app.test.ts` - HTTP behavior and error contract tests.
- Create `backend/tests/phase-one/server.test.ts` - real ephemeral-server and shutdown tests.
- Create `backend/PHASE-0-RUNTIME-FOUNDATION.md` - cumulative concept notes and evidence for this phase.
- Modify `backend/.env.example` - add runtime-only defaults without adding real secrets.

---

### Task 1: Establish the test and TypeScript contract

**Files:**

- Modify: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/eslint.config.js`
- Test: `backend/tests/phase-one/config.test.ts`
- Create: `backend/src/config.ts`

**Interfaces:**

- Produces `loadConfig(env?: NodeJS.ProcessEnv): AppConfig`.
- `AppConfig` contains `NODE_ENV`, `HOST`, `PORT`, and `LOG_LEVEL`.

- [x] **Step 1: Add the phase scripts and compiler configuration**

Add these scripts to `backend/package.json`:

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/server.ts",
    "start": "node dist/src/server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src tests",
    "format:check": "prettier --check ."
  }
}
```

Create `backend/tsconfig.json` with strict NodeNext compilation, `outDir` set to `dist`, and `include` set to `src/**/*.ts` and `tests/**/*.ts`.

- [x] **Step 2: Write the failing configuration tests**

Create tests for the default configuration and invalid ports:

```ts
import { describe, expect, test } from "vitest";
import { loadConfig } from "../../src/config.js";

describe("loadConfig", () => {
  test("uses safe development defaults when runtime values are absent", () => {
    expect(loadConfig({})).toMatchObject({
      NODE_ENV: "development",
      HOST: "127.0.0.1",
      PORT: 3000,
      LOG_LEVEL: "info",
    });
  });

  test("rejects a port outside the TCP port range", () => {
    expect(() => loadConfig({ PORT: "70000" })).toThrow();
  });
});
```

- [x] **Step 3: Run the focused test and verify the expected RED failure**

Run from `backend`:

```powershell
npm test -- tests/phase-one/config.test.ts
```

Expected result: the test fails because `src/config.ts` and `loadConfig()` do not exist yet.

- [x] **Step 4: Implement the smallest configuration parser**

Implement `loadConfig()` with Zod defaults and numeric port coercion. Load `.env` at module startup, but keep the function parameterized so tests can provide an isolated environment object.

- [x] **Step 5: Run the focused test and verify GREEN**

Run:

```powershell
npm test -- tests/phase-one/config.test.ts
```

Expected result: both configuration tests pass.

- [x] **Step 6: Run the typecheck for the new contract**

Run `npm run typecheck` and resolve any TypeScript errors before continuing.

### Task 2: Implement the HTTP application behavior

**Files:**

- Create: `backend/src/errors.ts`
- Create: `backend/src/logger.ts`
- Test: `backend/tests/phase-one/app.test.ts`
- Create: `backend/src/app.ts`

**Interfaces:**

- `createLogger(config?: AppConfig): Logger` returns a Pino logger.
- `createApp(options: AppOptions): Express` accepts a logger, an optional async readiness check, and an optional uptime provider.
- `AppError` contains `statusCode`, `code`, `message`, and optional safe `details`.

- [x] **Step 1: Write failing HTTP behavior tests**

Cover health, readiness success, readiness failure, unknown routes, and malformed JSON with Supertest. Use a disabled Pino logger in tests so output does not obscure assertions.

- [x] **Step 2: Run the focused HTTP tests and verify RED**

Run `npm test -- tests/phase-one/app.test.ts`. The expected failure is that `createApp()` and the route behavior are missing.

- [x] **Step 3: Implement the error and logger contracts**

Create `AppError`, an error-normalization helper, and the Pino logger factory. Unknown errors must map to `INTERNAL_SERVER_ERROR` without returning the original error message.

- [x] **Step 4: Implement `createApp()` minimally**

Configure `helmet`, `compression`, `express.json({ limit: '1mb' })`, and `pino-http`. Add the `/health` and `/ready` routes, then terminal 404 and error middleware. Readiness failures must become HTTP 503.

- [x] **Step 5: Run the HTTP tests and verify GREEN**

Run `npm test -- tests/phase-one/app.test.ts` and confirm all focused tests pass.

- [x] **Step 6: Run typecheck and lint**

Run `npm run typecheck` and `npm run lint`. Fix only issues caused by this phase.

### Task 3: Add server startup and graceful shutdown

**Files:**

- Test: `backend/tests/phase-one/server.test.ts`
- Create: `backend/src/server.ts`

**Interfaces:**

- `startServer(options?: ServerOptions): Promise<http.Server>` starts the app on the configured host and port, including port `0` for tests.
- `closeServer(server: http.Server, logger?: Logger): Promise<void>` closes the listener and resolves only after the close callback completes.
- Direct execution of `src/server.ts` starts the server and handles `SIGINT` and `SIGTERM` by calling `closeServer()`.

- [x] **Step 1: Write the failing lifecycle tests**

Start the server on port `0`, request `/health` through the actual listener, close it with `closeServer()`, and assert that the close promise resolves. Add a test that a second close call does not throw.

- [x] **Step 2: Run lifecycle tests and verify RED**

Run `npm test -- tests/phase-one/server.test.ts`. The expected failure is that the lifecycle exports do not exist.

- [x] **Step 3: Implement startup and shutdown**

Create the HTTP server from `createApp()`, listen through a Promise that rejects on startup errors, and expose a shutdown function that is safe to call once or more than once. Keep direct-run detection separate from imported test behavior.

- [x] **Step 4: Run lifecycle tests and verify GREEN**

Run `npm test -- tests/phase-one/server.test.ts` and confirm the real listener starts and closes cleanly.

- [x] **Step 5: Run the complete automated suite**

Run `npm test` and confirm every Phase 0 test passes.

### Task 4: Document and verify the completed learning phase

**Files:**

- Create: `backend/PHASE-0-RUNTIME-FOUNDATION.md`
- Modify: `backend/.env.example`
- Modify: `backend/README.md`
- Modify: this plan file

- [x] **Step 1: Update the runtime environment example**

Add `HOST=127.0.0.1` and `LOG_LEVEL=info` to `.env.example` while keeping database and Redis values documented for later phases.

- [x] **Step 2: Write the cumulative concept note**

Record the request path, why liveness and readiness are separate, the error response contract, structured logging choice, graceful-shutdown behavior, tests run, and the failure cases observed. Include a short “explain it back” section in plain language.

- [x] **Step 3: Update the backend README**

Document the available scripts and the fact that this phase runs without PostgreSQL or Redis.

- [x] **Step 4: Run the full verification commands**

Run each command from `backend`:

```powershell
npm test
npm run typecheck
npm run build
npm run lint
npm run format:check
npm audit --audit-level=high
```

Expected results: exit code `0`, all tests pass, the TypeScript build emits `dist/`, lint and formatting report no issues, and the audit reports no high-severity vulnerabilities.

- [x] **Step 5: Mark the phase evidence in this plan**

Update the roadmap and acceptance checklist with the verified results. Do not mark the next database phase as started until the runtime concept note has been reviewed.
