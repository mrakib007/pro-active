# Database Connection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the Pro-Active backend to the local `pro_active` PostgreSQL database through Prisma while keeping this phase limited to connectivity, readiness, and clean shutdown.

**Architecture:** Use one reusable `PrismaClient` in `src/infrastructure/database/prisma.ts`. The existing server will inject its `checkDatabase()` function into `/ready`, while `/health` remains independent of PostgreSQL. Direct-run shutdown will close the HTTP listener before disconnecting Prisma; no domain modules or product tables are introduced.

**Tech Stack:** PostgreSQL 18, Prisma `6.12.0`, TypeScript, Express, Vitest, Supertest, and `tsx`.

**Spec:** `C:\Projects\pro-active\docs\superpowers\specs\2026-09-02-database-connection-design.md`

## Global Constraints

- This phase is for database connectivity only; do not create `User`, `Workspace`, `Project`, `Task`, or other domain models.
- Do not create product migrations; the Prisma schema contains only the PostgreSQL datasource and Prisma Client generator.
- Store the real `DATABASE_URL` only in the ignored `backend/.env`; never print or commit its password.
- Keep `/health` independent of PostgreSQL and use `/ready` for the database dependency check.
- Preserve the existing `{ status: "error", code, message }` error contract and Phase 0 behavior.
- Write tests before production code for each new behavior and run the focused test to observe the RED state.
- PostgreSQL must be reachable at `localhost:5432` with the `postgres` role and database `pro_active` for the integration verification.

---

### Task 1: Prepare the local database and environment

**Files:**

- Create: `backend/.env` (ignored local secret file)
- Create: `backend/prisma/schema.prisma`
- Modify: `backend/package.json`
- Modify: `backend/tsconfig.json`

**Interfaces:**

- `DATABASE_URL` points Prisma at the local `pro_active` database.
- `prisma/schema.prisma` provides the PostgreSQL datasource and `prisma-client-js` generator without domain models.
- `npm run db:generate` generates Prisma Client.

- [x] **Step 1: Confirm the local PostgreSQL service and listener**

Run from the repository root:

```powershell
Get-Service -Name postgresql-x64-18
& 'C:\Program Files\PostgreSQL\18\bin\pg_isready.exe' -h localhost -p 5432
```

Expected: the service is running and `pg_isready` reports that the server is accepting connections.

- [x] **Step 2: Create the project database idempotently**

Using the locally supplied PostgreSQL password without printing it, query `pg_database` as the `postgres` role. If `pro_active` is absent, create it with `createdb`; if it exists, leave it unchanged.

Expected: exactly one usable database named `pro_active` exists; no existing database is dropped or overwritten.

- [x] **Step 3: Add the ignored local connection string**

Create `backend/.env` with the local connection URL using the supplied password. Do not display the file after creation. Confirm only that `Test-Path backend/.env` is true and `git check-ignore backend/.env` reports it is ignored.

- [x] **Step 4: Add the minimal Prisma schema**

Create `backend/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Do not add models or migrations in this task.

- [x] **Step 5: Add database scripts and include scripts in typechecking**

Add `db:generate` and `db:check` scripts to `backend/package.json`, and include `scripts/**/*.ts` in `backend/tsconfig.json` once the check script is introduced in Task 2.

- [x] **Step 6: Generate Prisma Client**

Run from `backend`:

```powershell
npm run db:generate
```

Expected: Prisma Client generates successfully from the datasource-only schema.

### Task 2: Add and verify the Prisma connection boundary

**Files:**

- Test: `backend/tests/phase-one/database.test.ts`
- Create: `backend/src/infrastructure/database/prisma.ts`
- Create: `backend/scripts/check-database.ts`

**Interfaces:**

- `prisma: PrismaClient` is the reusable client instance.
- `checkDatabase(): Promise<void>` resolves after executing `SELECT 1`.
- `disconnectDatabase(): Promise<void>` disconnects the shared client.
- `npm run db:check` executes the real database check and exits cleanly.

- [x] **Step 1: Write the failing database integration test**

Create `backend/tests/phase-one/database.test.ts`:

```typescript
import { afterAll, describe, expect, test } from "vitest";
import { checkDatabase, disconnectDatabase } from "../../src/infrastructure/database/prisma.js";

describe("database connection", () => {
  afterAll(async () => {
    await disconnectDatabase();
  });

  test("executes a connectivity query against PostgreSQL", async () => {
    await expect(checkDatabase()).resolves.toBeUndefined();
  });
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run from `backend`:

```powershell
npm test -- tests/phase-one/database.test.ts
```

Expected: the test fails because the Prisma connection module does not exist yet.

- [x] **Step 3: Implement the smallest Prisma lifecycle module**

Create `backend/src/infrastructure/database/prisma.ts` with dotenv loading, one `PrismaClient`, `checkDatabase()` using `$queryRaw\`SELECT 1\``, and `disconnectDatabase()` using `$disconnect()`.

- [x] **Step 4: Add the executable database check**

Create `backend/scripts/check-database.ts` to call `checkDatabase()`, print only a success message, disconnect in a `finally` block, and set a nonzero exit code for failures without printing the connection string.

- [x] **Step 5: Run the focused test and database script to verify GREEN**

Run:

```powershell
npm test -- tests/phase-one/database.test.ts
npm run db:check
```

Expected: the integration test passes and the check command exits with code `0`.

- [x] **Step 6: Typecheck the connection boundary**

Run `npm run typecheck` and fix only errors caused by this phase.

### Task 3: Wire readiness and graceful shutdown

**Files:**

- Test: `backend/tests/phase-one/server.test.ts`
- Modify: `backend/src/server.ts`

**Interfaces:**

- `startServer()` creates the default app with `checkDatabase` as its readiness check.
- `startServer({ readinessCheck })` allows the readiness dependency to be exercised in isolation; the default remains `checkDatabase`.
- Direct-run shutdown closes the HTTP server and then calls `disconnectDatabase()`.
- Custom apps passed to `startServer({ app })` remain untouched for isolated tests.

- [x] **Step 1: Write the failing server readiness test**

Extend the server lifecycle tests with a test that supplies an async readiness function, starts `startServer({ port: 0, readinessCheck })`, requests `/ready`, and asserts that the function was called and its result is reflected in the response. Also add a real listener test that starts the default server, requests `/ready`, and expects HTTP `200` with `{ status: "ready" }` while PostgreSQL is available. Close listeners and disconnect the shared client in test cleanup.

- [x] **Step 2: Run the focused server test and verify RED**

Run:

```powershell
npm test -- tests/phase-one/server.test.ts
```

Expected: the new readiness assertion fails because the default app currently has the no-op readiness check.

- [x] **Step 3: Inject the database readiness check**

Update `backend/src/server.ts` so `ServerOptions` accepts an optional `readinessCheck` dependency and the default `createApp()` call receives `readinessCheck: readinessCheck ?? checkDatabase`. Do not change the `createApp()` public contract or custom-app behavior.

- [x] **Step 4: Disconnect Prisma in direct-run shutdown**

Update the direct-run shutdown sequence to await `closeServer(runningServer)` first and then `disconnectDatabase()`. If shutdown fails, preserve the existing fatal logging and nonzero exit behavior.

- [x] **Step 5: Run the focused and complete tests**

Run:

```powershell
npm test -- tests/phase-one/server.test.ts
npm test
```

Expected: the new readiness test and all existing Phase 0 tests pass.

### Task 4: Document the connection phase and verify the repository

**Files:**

- Create: `backend/PHASE-1-DATABASE-CONNECTION.md`
- Modify: `backend/README.md`
- Modify: `backend/.env.example`
- Modify: `docs/superpowers/plans/2026-09-02-database-connection.md`
- Modify: `docs/superpowers/plans/2026-09-01-projecthub-runtime-foundation.md`

**Interfaces:**

- The concept note explains the database connection boundary, liveness/readiness distinction, Prisma lifecycle, local-secret handling, and observed evidence.
- The implementation plan marks only completed connection tasks; the product schema phase remains pending.

- [x] **Step 1: Write the cumulative connection concept note**

Record why a database client boundary exists, why `/health` and `/ready` differ, what `$queryRaw\`SELECT 1\`` proves and does not prove, why one client is reused, how shutdown prevents leaked connections, and what changes when a pool or multiple replicas are introduced. Include an explain-it-back section and the exact commands/results used for verification.

- [x] **Step 2: Update the backend README**

Document `db:generate`, `db:check`, the local `.env` requirement, and that this phase creates no product tables or migrations.

- [x] **Step 3: Run the full verification suite**

Run from `backend`:

```powershell
npm test
npm run typecheck
npm run build
npm run lint
npm run format:check
npm audit --audit-level=high
```

Expected: all commands exit with code `0`; no secret values appear in output.

- [x] **Step 4: Review the diff and database scope**

Run `git diff --check`, inspect the changed file list, confirm no `backend/.env` or password appears in tracked changes, and confirm no Prisma model or product migration was added.

- [x] **Step 5: Mark this connection phase complete**

Update this plan only after the verification commands pass. Leave the domain schema/database foundation phase pending until the connection concept has been reviewed.
