# Workspace Projects Implementation Plan

> **For agentic workers:** This plan is executed inline in the current task. Steps use checkbox syntax for tracking.

**Goal:** Add a persisted workspace-scoped Project resource with typed backend APIs, role-based authorization, and a frontend projects page.

**Architecture:** Projects are owned by a Workspace through a required foreign key. The project repository scopes every read and write by workspace ID, the service enforces membership and OWNER/ADMIN mutation policy, and controllers handle HTTP validation and response mapping. The frontend uses a typed RTK Query slice and a dynamic workspace project page.

**Tech Stack:** Prisma/PostgreSQL, Express, Zod, TypeScript, Vitest, Next.js, React, RTK Query, Tailwind CSS.

**Spec:** backend/WORKSPACE-PROJECTS.md

## Status

The workspace-projects slice was implemented in commit `d7dcec5`.
This checklist is reconciled to the committed implementation and the final
verification evidence recorded below. The original RED checkpoints describe
the historical test-first workflow; this documentation update does not
re-run those pre-implementation failures.

## Global Constraints

- Every project query must include workspace ID.
- OWNER and ADMIN may create, update, and delete; MEMBER may list only.
- Non-members receive WORKSPACE_NOT_FOUND; cross-workspace project IDs receive PROJECT_NOT_FOUND.
- Unsafe project methods require the existing session and CSRF middleware.
- Project names are trimmed and limited to 100 characters.
- Project descriptions are trimmed and limited to 500 characters; empty descriptions become null.
- Tasks, progress, status, archiving, pagination, and project invitations remain out of scope.

---

### Task 1: Add the Prisma Project model and migration

**Files:**
- Modify: backend/prisma/schema.prisma
- Create: backend/prisma/migrations/<timestamp>_add_project/migration.sql

**Interfaces:**
- Produce Prisma Project type with id, workspaceId, name, description, createdAt, updatedAt.
- Produce Workspace.projects relation.
- Produce a workspaceId/createdAt index and workspace cascade deletion.

- [x] Add Project and Workspace.projects to the Prisma schema.
- [x] Add a migration using Prisma's migration workflow and verify the SQL creates the table, foreign key, and index.
- [x] Run Prisma client generation and backend typecheck.

### Task 2: Add backend project contracts and authorization tests

**Files:**
- Create: backend/src/modules/projects/project.schemas.ts
- Create: backend/src/modules/projects/project.types.ts
- Create: backend/tests/phase-five/project-service.test.ts
- Create: backend/tests/phase-five/project-routes.test.ts

**Interfaces:**
- project schemas export createProjectSchema, updateProjectSchema, CreateProjectInput, and UpdateProjectInput.
- ProjectRepository exposes getWorkspaceAccess, listProjects, createProject, getProject, updateProject, and deleteProject.
- ProjectService exposes listProjects, createProject, updateProject, and deleteProject.

- [x] Write failing service tests for member listing, owner/admin mutation, member mutation rejection, and non-member workspace hiding.
- [x] Write failing route tests for strict validation, response status/body, authentication, and CSRF on POST/PATCH/DELETE.
- [x] Run phase-five tests and confirm they fail because the project module is absent.

### Task 3: Implement the backend project module

**Files:**
- Create: backend/src/modules/projects/project.repository.ts
- Create: backend/src/modules/projects/project.service.ts
- Create: backend/src/modules/projects/project.controller.ts
- Create: backend/src/modules/projects/project.routes.ts
- Modify: backend/src/app.ts

**Interfaces:**
- GET lists projects ordered by createdAt then id.
- POST returns 201 with the created project.
- PATCH returns 200 with the updated project.
- DELETE returns 204.
- Mutation authorization is implemented in project.service.ts, not in controllers or only in the UI.
- Repository updates/deletes are scoped by both projectId and workspaceId.

- [x] Implement the repository with Prisma projections and workspace-scoped mutation queries.
- [x] Implement service validation and OWNER/ADMIN authorization.
- [x] Implement controllers with Zod validation and consistent AppError mapping.
- [x] Wire the router under /api/workspaces/:workspaceId/projects with authentication and CSRF.
- [x] Run phase-five tests and confirm they pass.

### Task 4: Add database integration coverage

**Files:**
- Create: backend/tests/phase-five/project-repository.database.test.ts

**Interfaces:**
- Integration tests create isolated users/workspaces/projects and clean them up.
- Tests prove list scoping, project persistence, cross-workspace mutation protection, and workspace cascade deletion.

- [x] Write the failing database tests against the repository contract.
- [x] Run them against the local PostgreSQL database.
- [x] Keep the integration tests as permanent regression coverage for the tenant boundary.

### Task 5: Add the typed frontend project API and page

**Files:**
- Create: frontend/lib/api/project-api.ts
- Create: frontend/app/workspace/[workspaceId]/projects/page.tsx
- Create: frontend/components/workspace/workspace-projects.tsx
- Modify: frontend/components/workspace/workspace-creator.tsx
- Modify: frontend/lib/api/base-api.ts

**Interfaces:**
- The frontend project type mirrors the backend JSON shape.
- The project page lists projects and provides owner/admin create/edit/delete controls.
- Members can view the list but do not receive mutation controls.
- Project mutations invalidate the workspace project list tag.
- The workspace list exposes a Projects link for every workspace.

- [x] Add failing component/API tests for list rendering, create/update/delete requests, CSRF headers, and member read-only behavior.
- [x] Implement the RTK Query endpoints and project page.
- [x] Add the workspace Projects link.
- [x] Run focused frontend tests and confirm they pass.

### Task 6: Replace the project placeholder path and document the lesson

**Files:**
- Modify: frontend/app/workspace/page.tsx
- Modify: backend/WORKSPACE-PROJECTS.md
- Create: frontend/tests/workspace-projects.test.tsx

- [x] Add a clear link from the workspace shell to persisted projects without presenting mock projects as persisted data.
- [x] Add frontend coverage for the real project navigation.
- [x] Update the learning document with the final request flow and implementation order.

### Task 7: Final verification

**Files:**
- No temporary files.

- [x] Run backend tests, typecheck, build, lint, format check, and database check.
- [x] Run frontend tests, typecheck, lint, and production build.
- [x] Run git diff --check.
- [x] Review the final status and confirm no unrelated files were changed.

## Verification evidence

Verified on 2026-09-17 from the repository root and the `backend` and
`frontend` workspaces:

- Backend: `npm test` passed with 18 test files and 105 tests.
- Frontend: `npm test` passed with 7 test files and 35 tests.
- Backend typecheck, build, lint, format check, and `npm run db:check` passed.
- Frontend typecheck, lint, and production build passed.
- `git diff --check` passed.

The database check completed successfully against the local PostgreSQL
instance. The project resource now has permanent service, route, repository,
and frontend regression coverage for its workspace boundary.
