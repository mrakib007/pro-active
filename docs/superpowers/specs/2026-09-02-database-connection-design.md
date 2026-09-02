# Database Connection Design

## Goal

Connect the Pro-Active backend to the local PostgreSQL server through Prisma while keeping this phase limited to database connectivity. This phase must establish a reliable connection boundary without introducing ProjectHub domain tables or a broad application refactor.

## Approved approach

Use a local PostgreSQL database named `pro_active` with the standard local connection settings:

- Host: `localhost`
- Port: `5432`
- User: `postgres`
- Database: `pro_active`
- Password: supplied locally by the developer and stored only in the ignored `backend/.env`

Prisma will be the database access boundary. The application will use one reusable `PrismaClient` instance, a small `checkDatabase()` function for readiness, and a shutdown function that disconnects Prisma cleanly.

## Scope

This phase will:

1. Create the local `pro_active` database if it does not already exist.
2. Add a minimal Prisma schema containing only the PostgreSQL datasource and Prisma Client generator.
3. Add the local `DATABASE_URL` without committing the password.
4. Add `src/infrastructure/database/prisma.ts` with the reusable client, connectivity check, and disconnect operation.
5. Connect the existing `/ready` endpoint to the database check when the real server starts.
6. Add only the scripts and tests needed to generate Prisma Client and verify the connection.
7. Add a cumulative connection-phase learning note.

## Out of scope

- No `User`, `Workspace`, `Project`, `Task`, or other domain tables.
- No migrations containing product data models.
- No authentication, repositories, controllers, or feature modules yet.
- No Redis, queues, caching, or frontend work.
- No change to the existing HTTP error contract or unrelated runtime files.

## Runtime flow

```text
server startup → create Prisma client → GET /ready → SELECT 1 → ready response
server shutdown → close HTTP listener → disconnect Prisma client
```

The liveness endpoint will remain independent of PostgreSQL. `/health` answers whether the process is alive; `/ready` answers whether the process can use its required database dependency.

## File boundary

- `backend/prisma/schema.prisma` — datasource and client generator only.
- `backend/src/infrastructure/database/prisma.ts` — Prisma lifecycle and connectivity check.
- `backend/src/server.ts` — inject the database readiness check and close Prisma during direct-run shutdown.
- `backend/package.json` — database generation/check commands only.
- `backend/.env` — local connection string; ignored and never committed.
- `backend/.env.example` — safe placeholder connection string without the real password.
- `backend/tests/phase-one/database.test.ts` — connection behavior against the configured local database.
- `backend/PHASE-1-DATABASE-CONNECTION.md` — concepts, evidence, and explain-it-back questions.

## Verification contract

The phase is successful when:

- Prisma Client generates successfully.
- A database check can execute `SELECT 1` against `pro_active`.
- `/health` still works without querying PostgreSQL.
- `/ready` returns ready when PostgreSQL is available and `SERVICE_NOT_READY` when the check fails.
- Prisma disconnects during graceful shutdown.
- Existing runtime tests and type/lint/format checks remain green.

The next phase will begin only after this connection behavior and its concepts have been reviewed. Product schema design will be documented separately before any domain tables are added.
