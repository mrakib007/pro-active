# Workspace and Membership: Learning Note

This feature is the first multi-tenant piece of ProjectHub. It answers one
question: how do we let an authenticated user create a workspace and become
its owner?

## The tables

The project now has four related tables:

```text
users                 Who the person is
sessions              How the person stays logged in
workspaces            A team or project area
memberships           Which users belong to which workspaces
```

The important relationship is:

```text
User 1 ───< Membership >─── 1 Workspace
```

`memberships` is a join table. It contains:

- `user_id`: the member
- `workspace_id`: the workspace
- `role`: `OWNER`, `ADMIN`, or `MEMBER`

The database also has a unique constraint on `(workspace_id, user_id)`, so the
same user cannot be added to the same workspace twice.

## Why these exact relations?

`User` to `Session` is one-to-many: one person may have several active login
sessions, for example one on a laptop and one on a phone. Each session belongs
to exactly one user.

`User` to `Workspace` is many-to-many: one user may join several workspaces,
and one workspace may contain many users. Relational databases represent this
with the `Membership` join table:

```text
users.id          ← memberships.user_id
workspaces.id     ← memberships.workspace_id
```

This join is more than a connection. Each membership stores facts about that
specific connection: the user’s role and, later, invitation or membership
timestamps. That is why `role` belongs on `memberships`, not on `users` or
`workspaces`.

For example, the same user can be an `OWNER` in one workspace and a `MEMBER`
in another:

```text
Rakib ── OWNER  ── Product Team
Rakib ── MEMBER  ── Freelance Team
Nadia ── ADMIN   ── Product Team
```

The foreign keys ensure that every membership points to real records. Cascade
deletion removes memberships when their user or workspace is deleted, so no
orphaned membership rows remain.

## Why not put `owner_id` on `workspaces`?

That would work for a very small prototype, but it only models one owner. A
membership table models ownership as a role and already supports future
members, administrators, invitations, and permission checks.

## What happens when a workspace is created?

Request:

```http
POST /api/workspaces
Cookie: pro_active_session=<session-token>
Content-Type: application/json

{"name":"Product Team"}
```

The request travels through these layers:

```text
Route
  → authentication middleware
  → controller (HTTP validation)
  → service (business operation)
  → repository (database transaction)
```

The repository performs two writes inside one transaction:

1. Create the `workspaces` row.
2. Create a `memberships` row with `role = OWNER`.

If either write fails, PostgreSQL rolls back both writes. This prevents a
workspace from existing without its owner membership.

## Where to read the implementation

Read in this order:

1. `prisma/schema.prisma` — the data model and relationships
2. `src/modules/workspaces/workspace.routes.ts` — the endpoint and middleware
3. `src/modules/workspaces/workspace.controller.ts` — HTTP input/output
4. `src/modules/workspaces/workspace.service.ts` — business boundary
5. `src/modules/workspaces/workspace.repository.ts` — Prisma transaction

## Expected responses

Without a valid session:

```json
{
  "status": "error",
  "code": "AUTHENTICATION_REQUIRED",
  "message": "Authentication required"
}
```

With a valid session and workspace name, the response is `201 Created` and
contains the new workspace plus its `OWNER` membership.

## What is intentionally not built yet

This slice only creates a workspace. The next separate slices can add:

- listing a user’s workspaces
- inviting members
- membership permission checks
- changing or removing roles

Keeping those separate makes the authorization concepts easier to learn.
