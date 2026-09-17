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

## Frontend route convention

For a simple route with no reuse requirement, keep the page implementation directly in its `app/<route>/page.tsx` file. Do not create a component only to import it immediately into the page. Extract a component when the UI is reused, the page becomes meaningfully easier to understand when split, or an independent boundary is genuinely useful.

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
- [Workspace Projects](backend/WORKSPACE-PROJECTS.md)

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

## Current lesson: Workspace-scoped projects

This slice adds the first real resource inside a workspace. The important
lesson is not the project form; it is how a new resource keeps the tenant
boundary intact from the browser to the database.

### Mental model: one request, several responsibilities

```text
Browser
  → Next.js projects page + typed RTK Query API
  → Express route + session/CSRF middleware
  → Controller: HTTP parameters, Zod input, response shape
  → Service: membership and OWNER/ADMIN policy
  → Repository: workspace-scoped Prisma queries
  → PostgreSQL projects table
```

Each layer answers a different question:

- The **frontend** makes the feature usable and refreshes stale data after a
  mutation. Hiding buttons for MEMBER is only a usability improvement.
- The **controller** translates HTTP. It should not decide who is allowed to
  change a project.
- The **service** owns the business rule: a workspace member may list, but
  only OWNER and ADMIN may create, update, or delete.
- The **repository** owns persistence details and must include `workspaceId`
  in every project read and write.
- The **database** enforces relationships even if application code fails.

Keeping these responsibilities separate lets us test policy without a real
HTTP server and test tenant isolation against a real database.

### The tenant boundary

```text
Workspace 1 ──< Project
```

`Project.workspaceId` is required and is a foreign key to `Workspace.id`.
That gives every project one clear owner and prevents orphaned projects. The
foreign key uses `ON DELETE CASCADE`, so deleting a workspace also deletes its
projects; otherwise the database could be left with records that point to
nothing.

Every project lookup uses both identifiers:

```text
projectId + workspaceId
```

An ID alone is not enough. A UUID may be valid but belong to another tenant.
The combined filter prevents an IDOR-style bug where a user guesses or obtains
a project ID from another workspace and then reads or changes it. The service
also checks membership before asking the repository for project data, so a
non-member receives `WORKSPACE_NOT_FOUND` instead of learning that the
workspace exists. A project from another workspace appears as
`PROJECT_NOT_FOUND`.

The `(workspace_id, created_at)` index supports the default list query: find
projects for one workspace and return them in creation order. The project name
is intentionally not unique yet; that product decision can be revisited after
we understand naming and rename behavior.

### Authorization and request contract

| Actor | List | Create | Update | Delete |
| --- | --- | --- | --- | --- |
| OWNER | yes | yes | yes | yes |
| ADMIN | yes | yes | yes | yes |
| MEMBER | yes | no | no | no |
| Not a member | no | no | no | no |

The API is deliberately workspace-shaped:

```text
GET    /api/workspaces/:workspaceId/projects
POST   /api/workspaces/:workspaceId/projects
PATCH  /api/workspaces/:workspaceId/projects/:projectId
DELETE /api/workspaces/:workspaceId/projects/:projectId
```

The response statuses carry meaning: `200` for list/update, `201` for create,
and `204` for delete. Session authentication protects every route; POST,
PATCH, and DELETE also require the existing CSRF check because they mutate
state through cookie-based authentication.

Names are trimmed and limited to 100 characters. Descriptions are trimmed,
limited to 500 characters, and stored as `null` when empty. Strict Zod schemas
reject unknown fields. The controller validates the HTTP boundary, and the
service parses again at the business boundary so callers cannot bypass the
same contract by calling the service directly. The current PATCH contract
requires a name, so it behaves like a validated replacement of the editable
fields rather than a fully partial update; that is an intentional follow-up
question if partial updates become useful.

### Why the implementation order matters

1. **Schema and migration first** — establish the relationship, index, and
   deletion behavior before writing queries.
2. **Contracts and service tests** — define the inputs, outputs, role policy,
   normalization, and failure codes before implementation details.
3. **Repository, service, controller, and routes** — build one backend slice
   while keeping persistence, policy, and HTTP concerns in their own places.
4. **Database integration tests** — prove that the filters and cascade work in
   PostgreSQL, not only in mocks.
5. **Typed frontend API and page** — consume the real persisted resource and
   let RTK Query invalidate the workspace project tag after mutations.
6. **Remove the mock project cards** — avoid showing data that looks persisted
   but is only hard-coded in the workspace dashboard.

### What each test layer proves

| Test layer | Main question it answers |
| --- | --- |
| Service unit tests | Are roles, normalization, and hidden-workspace errors correct? |
| Route tests | Are auth, CSRF, validation, status codes, and JSON envelopes correct? |
| Repository integration tests | Are reads/writes scoped, and does workspace deletion cascade? |
| Frontend tests | Does the page load persisted data, send CSRF-protected mutations, refresh, and keep MEMBER read-only? |

The frontend role check improves the experience, but the service test is the
real security check. A malicious client can call the API without rendering the
page, so authorization must live on the server.

### Deliberate limits and next experiments

This lesson does not add tasks, project-specific roles, status/progress,
archiving, invitations, search, or pagination. Leaving them out keeps the
resource boundary understandable and prevents fields from being added before
their behavior is designed.

Questions to revisit at larger scale:

- Should long project lists use cursor pagination, and how should the index
  support that order?
- Should names be unique within a workspace, or are duplicates useful?
- Do updates need optimistic concurrency protection if two admins edit at once?
- If projects become shareable across workspaces, which ownership and query
  assumptions must change?

Explain-it-back prompts are collected in
[backend/WORKSPACE-PROJECTS.md](backend/WORKSPACE-PROJECTS.md). If you can
explain why the service checks membership, why every query carries the
workspace ID, and what each test layer catches, you understand the design—not
just the syntax.

### Current status

The workspace-projects implementation and its final verification are complete.
The detailed checklist and evidence are recorded in
[docs/superpowers/plans/2026-09-14-workspace-projects.md](docs/superpowers/plans/2026-09-14-workspace-projects.md).
The next learning experiment is a task resource nested under a project; its
state model and consistency rules should be designed before implementation.
