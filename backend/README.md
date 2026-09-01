# Pro-Active Backend

This directory contains the backend workspace for ProjectHub, a deliberately educational multi-tenant team workspace.

The application source and final folder structure are intentionally not created yet. We will choose them after designing the first authentication and data-modeling slice.

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

Development uses `npm run dev`; the compiled entrypoint uses `npm start`. Phase 0 does not require PostgreSQL, Redis, or the frontend.

The runtime exposes `GET /health` for liveness and `GET /ready` for readiness. See [PHASE-0-RUNTIME-FOUNDATION.md](PHASE-0-RUNTIME-FOUNDATION.md) for the reasoning, failure behavior, and verification evidence.
