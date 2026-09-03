# Pro-Active Learning Charter

This repository is intentionally built for learning backend engineering and system design. It is not being treated as a syntax-copying exercise or as a production-ready product from day one.

The goal is to understand why each part exists, what problem it solves, what can go wrong, and how the system behaves under load. AI may help write syntax and boilerplate, but the design decisions, invariants, trade-offs, and verification remain part of the learning work.

## Working loop

Every concept follows the same loop:

1. **Concept** - explain the problem and build a mental model.
2. **Design** - decide the data, API, security, consistency, and failure boundaries.
3. **Tasks** - split the design into small, testable tasks.
4. **Build** - implement one vertical slice at a time.
5. **Verify** - run unit/integration tests and inspect relevant queries, logs, or load results.
6. **Document** - record what was learned, not just what code was written.
7. **Reflect** - write down remaining questions and the next experiment.

We do not move to the next concept merely because the code works. We move when the behavior, trade-offs, and failure modes can be explained clearly.

## Planned backend architecture

ProjectHub will be a feature-oriented modular monolith. We will use practical MVC inside each feature, supported by service and repository layers:

```text
Route → Controller → Service → Repository → Database
```

- **Routes** map HTTP methods and URLs.
- **Controllers** translate HTTP requests and responses; they should not contain core business rules.
- **Services** enforce business rules and define transaction boundaries.
- **Repositories** contain feature-specific persistence queries.
- **Models** are represented by Prisma schema/database entities.
- **Views** are JSON responses or serializers because the frontend is a separate project.
- **Infrastructure** contains shared technical integrations such as Prisma, Redis, and queues.

The planned shape is:

```text
backend/src/
├── modules/             # auth, workspaces, projects, tasks, etc.
├── infrastructure/     # database, cache, queue
├── shared/              # genuinely cross-feature code only
├── app.ts
├── server.ts
├── config.ts
├── logger.ts
└── errors.ts
```

We are not using pure textbook MVC, global folders that scatter each feature, or microservices at this stage. The structure will be introduced deliberately as each learning phase requires it; we will not create empty folders for every future feature now.

## Living concept notes

Yes: each major concept should have one living Markdown note that grows as we work through it. For example, the authentication note should be updated after signup, password hashing, login, sessions/tokens, authorization, logout, security tests, and failure experiments—not replaced with a separate note for every tiny task.

Each concept note should answer:

- What problem does this concept solve?
- What is the simplest mental model?
- What decision did we make, and what alternatives did we reject?
- Which tables, relationships, constraints, indexes, and transactions are involved?
- Which API or worker contracts depend on it?
- What are the security, failure, and concurrency concerns?
- What did we test or measure?
- What would change at larger scale?
- What questions remain?

Concept notes will live alongside the project documentation, while feature code will follow the planned modular structure above.

## Current backend concept notes

- [Phase 0: Runtime Foundation](backend/PHASE-0-RUNTIME-FOUNDATION.md)
- [Phase 1A: Database Connection](backend/PHASE-1-DATABASE-CONNECTION.md)
- [Phase 2A: User Signup](backend/PHASE-2-USER-SIGNUP.md)

## AI collaboration rules

Before asking an agent to write code for a task, ask it to explain:

- the user problem being solved;
- the entities and relationships required;
- the invariants that must always remain true;
- the transaction boundary;
- the expected query shape and indexes;
- failure, retry, and duplicate-request behavior;
- the tests that will prove the behavior.

After implementation, review the design and behavior before reviewing syntax. Generated code is useful only when its purpose and consequences are understood.

## Current scope

The product is **ProjectHub**, a multi-tenant team workspace with projects, tasks, comments, activity history, and notifications. The first implementation will be a modular monolith. Redis, background workers, realtime updates, and horizontal scaling will be introduced when the relevant concept requires them and when we can measure why they help.

The frontend is reserved for later. The backend is the primary learning surface.
