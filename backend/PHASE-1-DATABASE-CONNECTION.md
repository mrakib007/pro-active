# Phase 1A: Database Connection

## Scope

This phase connects the backend to the local PostgreSQL database through Prisma. It intentionally creates no ProjectHub domain tables and no product migrations. The purpose is to understand the database boundary before designing entities and relationships.

## Why this boundary exists

The application should not create a new database connection in every route or service. A process owns one reusable `PrismaClient`; Prisma manages the underlying database communication and pooling for that process. Keeping the client in `src/infrastructure/database/prisma.ts` gives the rest of the application one explicit dependency and gives startup/shutdown a clear lifecycle.

The connection string lives in the ignored local `backend/.env`. Source code and documentation use only the variable name or a safe example. A database credential is runtime configuration, not application logic.

## Liveness versus readiness

- `GET /health` is a liveness check. It answers whether the Node.js process can respond to HTTP. It does not query PostgreSQL, so a temporarily unavailable database does not make the process look dead.
- `GET /ready` is a readiness check. It executes `SELECT 1` through Prisma and returns ready only when the database dependency is usable. A failure becomes the existing `503 SERVICE_NOT_READY` response.

This distinction matters to a deployment system: an alive but unready process can be removed from traffic while the database problem is investigated, instead of being mistaken for a crashed process.

## What `SELECT 1` proves

The query proves that the configured credentials, network path, database server, and Prisma connection path can complete a trivial query at that moment. It does not prove that our future tables, constraints, indexes, transactions, authorization rules, or business queries are correct. Those require separate schema and feature tests.

## Lifecycle

```text
server startup → create reusable Prisma client
GET /ready     → Prisma executes SELECT 1
server shutdown → close HTTP listener → disconnect Prisma client
```

The default server injects `checkDatabase` into the application readiness route. Tests can inject another readiness function because dependency injection lets us test the HTTP boundary without changing PostgreSQL state. Direct-run shutdown disconnects Prisma after the HTTP listener closes, which prevents a process from leaving database resources open.

## Failure modes considered

- Wrong or missing `DATABASE_URL`: Prisma cannot connect; `/health` can still respond, while `/ready` reports not ready.
- PostgreSQL service stopped or unreachable: the readiness query fails; the application does not report false readiness.
- Database exists but future schema is missing: `SELECT 1` can still pass; feature-level queries and migrations must detect schema problems later.
- Multiple Prisma clients in one process: unnecessary connections and harder shutdown behavior; the shared client avoids this accidental pool multiplication.
- Password committed to Git: credential exposure; `.env` is ignored and the example file contains only a safe placeholder.

## Current boundary

- `prisma/schema.prisma` contains only the PostgreSQL datasource and Prisma Client generator.
- `src/infrastructure/database/prisma.ts` exports `prisma`, `checkDatabase()`, and `disconnectDatabase()`.
- `src/server.ts` uses the database check for the default `/ready` route and disconnects Prisma during direct-run shutdown.
- `npm run db:generate` generates the client.
- `npm run db:check` performs a real connectivity query and exits without printing the connection string.

## Verification evidence

- PostgreSQL service `postgresql-x64-18` was running.
- `pg_isready -h localhost -p 5432` reported that the server was accepting connections.
- The local `pro_active` database was created without modifying any existing database.
- `npm run db:generate` generated Prisma Client `6.12.0`.
- `npm run db:check` completed successfully.
- The database integration test passed.
- The server readiness test passed against the real PostgreSQL database.
- The complete automated test suite passed with `4` test files and `12` tests.
- TypeScript typechecking passed.
- The TypeScript build, ESLint, Prettier check, and high-severity npm audit passed.

## Explain it back

1. Why should `/health` avoid querying PostgreSQL while `/ready` queries it?
2. What does one `PrismaClient` per process protect us from?
3. Why does a successful `SELECT 1` not mean that our future schema or business queries are correct?
4. Why should the HTTP listener close before Prisma disconnects during shutdown?
5. What new evidence will we need once we add migrations and domain tables?

## Next experiment

After this note is reviewed, the next database step will design the first domain schema. We will decide which entities and relationships ProjectHub needs, then learn how primary keys, foreign keys, unique constraints, indexes, and migrations enforce the invariants before adding those models.
