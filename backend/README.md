# Pro-Active Backend

This directory contains the backend workspace for ProjectHub, a deliberately educational multi-tenant team workspace. The runtime foundation and the database connection boundary are implemented; product features and domain tables are added phase-by-phase.

The backend follows a feature-oriented modular monolith with practical MVC, services, and repositories. The current connection work is intentionally smaller than the final structure and does not create feature modules yet.

## Initial technology choices

- Node.js with TypeScript
- Express for explicit HTTP boundaries
- PostgreSQL with Prisma for relational data and migrations
- Redis with ioredis for shared state, caching, and rate limiting experiments
- BullMQ for background-job experiments
- Vitest and Supertest for verification
- ESLint and Prettier for maintainability

The project does not use an all-in-one authentication or backend framework at this stage. The purpose is to understand the boundaries and trade-offs before adding abstractions.

## Phase 0 commands

Run these commands from this directory:

```powershell
npm test
npm run typecheck
npm run build
npm run lint
npm run format:check
```

Development uses `npm run dev`; the compiled entrypoint uses `npm start`. Phase 0 did not require PostgreSQL, Redis, or the frontend. The current database connection phase requires local PostgreSQL.

## Database connection phase

From this directory, keep the real connection string in the ignored `.env` file. A new machine can start from the safe example with:

```powershell
Copy-Item .env.example .env
```

Replace `change-me` with the local PostgreSQL password, then generate Prisma Client and verify the connection:

```powershell
npm run db:generate
npm run db:check
```

This phase creates only the `pro_active` database connection boundary. It does not create ProjectHub tables or product migrations. See [PHASE-1-DATABASE-CONNECTION.md](PHASE-1-DATABASE-CONNECTION.md) for the concepts, failure modes, and evidence.

The runtime exposes `GET /health` for liveness and `GET /ready` for readiness. See [PHASE-0-RUNTIME-FOUNDATION.md](PHASE-0-RUNTIME-FOUNDATION.md) for the reasoning, failure behavior, and verification evidence.
