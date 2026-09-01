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
