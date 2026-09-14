# Workspace Membership Management

This is the next multi-tenant learning slice after workspace creation,
sessions, and CSRF protection. It focuses on managing existing memberships
without introducing invitations or ownership transfer yet.

## Scope

The backend exposes three membership endpoints:

```text
GET    /api/workspaces/:workspaceId/members
PATCH  /api/workspaces/:workspaceId/members/:membershipId
DELETE /api/workspaces/:workspaceId/members/:membershipId
```

The update body is strict and accepts only:

```json
{ "role": "ADMIN" }
```

or:

```json
{ "role": "MEMBER" }
```

OWNER is deliberately not accepted as an update target. Ownership transfer
is a separate security-sensitive operation and will be designed later.

## Authorization matrix

| Actor role   | List members | Change non-owner role | Remove non-owner    |
| ------------ | ------------ | --------------------- | ------------------- |
| OWNER        | Yes          | Yes                   | Yes                 |
| ADMIN        | Yes          | Only MEMBER targets   | Only MEMBER targets |
| MEMBER       | Yes          | No                    | No                  |
| Not a member | No           | No                    | No                  |

Owner memberships are protected in this slice. That means the last owner
cannot be removed accidentally, and an owner cannot be demoted through these
endpoints. A future ownership-transfer operation can add an explicit,
auditable handoff.

For authorization failures, the service returns 403 MEMBERSHIP_FORBIDDEN.
When the actor is not a member, the service returns 404 WORKSPACE_NOT_FOUND
instead of revealing that a workspace exists. A missing target membership
returns 404 MEMBERSHIP_NOT_FOUND.

## Request flow

```text
Route
  -> session authentication
  -> CSRF protection for PATCH and DELETE
  -> controller (HTTP validation and response mapping)
  -> membership service (authorization rules)
  -> membership repository (workspace-scoped Prisma queries)
  -> PostgreSQL
```

The membership module is separate from the authentication module. Authentication
establishes who the actor is; the membership service decides what that actor
may do inside a workspace.

## Repository and consistency decisions

- Membership reads and writes always include the workspace ID.
- Role updates use a transaction for the scoped update and read-back.
- The existing unique constraint on (workspace_id, user_id) remains the
  database-level protection against duplicate membership rows.
- The service performs authorization before calling mutation methods.
- The repository still scopes the mutation itself, so a membership ID from a
  different workspace cannot be changed through this route.

## Deliberate non-goals

This slice does not include:

- inviting an unregistered user;
- email delivery or invitation tokens;
- ownership transfer;
- audit-log persistence;
- pagination for very large workspaces.

Those are separate lessons because each introduces additional state and
failure modes.

## Where to read the implementation

Read in this order:

1. src/modules/memberships/membership.routes.ts
2. src/modules/memberships/membership.controller.ts
3. src/modules/memberships/membership.service.ts
4. src/modules/memberships/membership.repository.ts
5. src/modules/memberships/membership.types.ts

## Explain-it-back questions

1. Why does the route apply authentication before CSRF validation?
2. Why can a member list the workspace but not change another membership?
3. Why does a non-member receive a workspace-not-found response?
4. Why is ownership transfer kept separate from ordinary role updates?
5. Which invariant belongs in PostgreSQL, and which belongs in the service?
