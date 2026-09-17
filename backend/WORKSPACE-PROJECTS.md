# Workspace Projects

This is the next multi-tenant learning slice after workspace membership
management. It introduces a real workspace-scoped resource without adding
project-specific roles or task management yet.

## Scope

Each project belongs to exactly one workspace:

```text
Workspace 1 ──< Project
```

The backend exposes:

```text
GET    /api/workspaces/:workspaceId/projects
POST   /api/workspaces/:workspaceId/projects
PATCH  /api/workspaces/:workspaceId/projects/:projectId
DELETE /api/workspaces/:workspaceId/projects/:projectId
```

Project creation and updates accept a name and an optional description:

```json
{
  "name": "Editorial launch",
  "description": "Prepare the next release."
}
```

Names are trimmed and limited to 100 characters. Descriptions are trimmed and
limited to 500 characters. Empty descriptions are stored as null.

## Authorization matrix

| Actor role   | List projects | Create | Update | Delete |
| ------------ | ------------- | ------ | ------ | ------ |
| OWNER        | Yes           | Yes    | Yes    | Yes    |
| ADMIN        | Yes           | Yes    | Yes    | Yes    |
| MEMBER       | Yes           | No     | No     | No     |
| Not a member | No            | No     | No     | No     |

Non-members receive 404 WORKSPACE_NOT_FOUND so the API does not reveal that a
workspace exists. A project ID is always queried together with its workspace
ID; a project from another workspace therefore appears as
PROJECT_NOT_FOUND.

Unsafe methods require the existing session authentication and CSRF checks.
The service owns the role policy, while the repository owns workspace-scoped
queries and persistence.

## Database decisions

- Project IDs use the same UUID convention as users, workspaces, and
  memberships.
- Deleting a workspace cascades to its projects.
- The index on workspace ID and creation time supports the default list order.
- There is intentionally no unique project-name constraint yet. Two projects
  may have the same name while the product is still learning the resource
  model.

## Frontend

The page /workspace/:workspaceId/projects loads persisted projects, lists
their names and descriptions, and gives owners/admins create, edit, and delete
controls. The existing workspace list links to this page.

## Request flow and layer responsibilities

```text
Browser
  -> Next.js projects page and typed RTK Query API
  -> Express route with session and CSRF middleware
  -> Controller: route parameters, Zod validation, response status
  -> Service: membership lookup and OWNER/ADMIN policy
  -> Repository: workspace-scoped Prisma queries
  -> PostgreSQL projects table
```

The frontend role check only controls the user experience. The service is the
security boundary because a caller can bypass the UI and send HTTP requests
directly. The repository repeats the workspace scope on reads and mutations,
so a project identifier from another workspace cannot be used as an object
access path. The database foreign key and cascade rule protect persistence
consistency even if application code is wrong.

## Verification evidence

The slice was verified on 2026-09-17. Backend tests passed with 18 test files
and 105 tests; frontend tests passed with 7 test files and 35 tests. Backend
and frontend typechecks, lint, builds, formatting, the PostgreSQL database
check, and `git diff --check` also passed.

The tests cover the role matrix, strict request contracts, authentication,
CSRF-protected mutations, workspace-scoped repository operations, cross-
workspace isolation, workspace deletion cascades, frontend rendering, and
RTK Query refresh behavior.

## Deliberate non-goals

This slice does not include:

- tasks inside projects;
- project-specific roles;
- progress or status fields;
- archiving;
- pagination or search;
- project invitations.

Those are follow-up lessons after the workspace-scoped resource boundary is
understood.

## Explain-it-back questions

1. Why must every project query include both project ID and workspace ID?
2. Why does the service decide authorization instead of the controller?
3. Why can a MEMBER read a project but not mutate it?
4. Which database constraint protects workspace deletion consistency?
5. What would change if projects became independently shareable?

## Next experiment

After this reflection, the next product slice should introduce tasks inside a
project. Design the task states, assignee relationship, ordering, deletion
behavior, authorization policy, API contract, indexes, and transaction
boundaries before writing the first failing tests.
