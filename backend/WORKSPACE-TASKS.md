# Workspace Tasks: State Model

This note begins the task learning slice. It deliberately covers the task
state model before adding a database table, HTTP route, or frontend screen.

## Learning objective

Understand how a small finite state machine protects a business rule. A task
is not allowed to jump between arbitrary labels; its state changes must be
intentional and testable.

## Relationship boundary

The planned relationship is:

```text
Workspace 1 ──< Project 1 ──< Task
```

A task belongs to one project. The workspace boundary is inherited through
that project, so a task must never be read or changed through a project from a
different workspace.

## Selected states

```text
TODO ↔ IN_PROGRESS → DONE
  ↑                    │
  └────────────────────┘
```

The selected states are:

- `TODO`: work has not started;
- `IN_PROGRESS`: someone is actively working on it; and
- `DONE`: the work is complete.

The intended transitions are:

| Current       | Next          | Meaning                  |
| ------------- | ------------- | ------------------------ |
| `TODO`        | `IN_PROGRESS` | Start work               |
| `IN_PROGRESS` | `TODO`        | Put unfinished work back |
| `IN_PROGRESS` | `DONE`        | Complete the work        |
| `DONE`        | `TODO`        | Reopen the task          |
| any state     | same state    | Idempotent no-op         |

Direct `TODO → DONE` is not allowed. `BLOCKED`, `CANCELED`, task history,
priority, assignment, and progress percentages are intentionally deferred.

## Invariants

1. Every new task starts as `TODO`.
2. A task always has exactly one known state.
3. State validation belongs in the service/domain boundary, not only in the
   frontend.
4. A task operation must remain scoped to its project and workspace.
5. Adding a new state later requires an explicit transition decision and
   regression tests.

## Current implementation

The first micro-step adds the pure helper
`src/modules/tasks/task-state.ts`. It defines the state vocabulary and the
transition table without coupling the lesson to Prisma or Express.

Current coverage:

- `task-state.test.ts` proves `TODO → IN_PROGRESS`;
- `task-state-progress.test.ts` proves `IN_PROGRESS → DONE`; and
- `task-state-reopen.test.ts` proves `DONE → TODO`.

The transition table was implemented in the first helper step; the later
tests make each approved transition visible as a regression contract.

## Deferred boundaries

- Workspace membership will control authorization when the service boundary
  is added.
- The task-list query and its index are not designed yet.
- Persistence concurrency behavior is not selected yet; a later step must
  decide how stale transitions are detected.
- A single status change is expected to be one-row persistence work. A future
  status-history or activity-log write may require a transaction.

## Next single step

Add a focused test proving that the invalid `TODO → DONE` transition is
rejected, then run the focused test and the full backend suite again.
