# Project Strategy

## Decision

**Selected approach:** Option 1 — the micro-slice learning loop.

The project will move slowly through small, independently understandable decisions. The agent will explain alternatives before implementation, the learner will choose the approach, and each step will end with focused verification and reflection.

This is a workflow decision, not a product feature. No product code is changed by this document.

## Assessment as of 2026-09-20

The repository is clean on `master` and the latest commit is synchronized with `origin/master`.

ProjectHub currently contains:

- a Node.js/TypeScript/Express backend;
- PostgreSQL persistence through Prisma;
- Redis-backed login-rate-limiter integration and rate-limiter learning implementations;
- authentication, database-backed sessions, logout, and CSRF protection;
- workspace creation and management;
- workspace membership management with role-based authorization;
- workspace-scoped projects with backend and frontend coverage; and
- a Next.js frontend for authentication, workspaces, members, and projects.

The current baseline was freshly checked before this strategy change:

| Area | Result |
| --- | --- |
| Backend tests | 18 files, 105 tests passed |
| Frontend tests | 7 files, 35 tests passed |
| Backend typecheck/build/lint/format | Passed |
| Frontend typecheck/build/lint | Passed |
| PostgreSQL database check | Passed |
| `git diff --check` | Passed |

The codebase is therefore ready for the next concept. The main improvement needed is process: completed slices are documented well, but the next slice should be decomposed into smaller learner-approved decisions before code is written.

References:

- [Learning charter](../LEARNING.md)
- [Workspace projects concept note](../backend/WORKSPACE-PROJECTS.md)
- [Workspace projects implementation plan](superpowers/plans/2026-09-14-workspace-projects.md)

## Why the strategy changed

The existing loop is already concept → design → tasks → build → verify → document → reflect. The refinement is to make each stage smaller and explicit:

- one learning outcome rather than a whole feature;
- one selected design choice rather than an implicit default;
- one focused test target rather than a large batch of tests;
- one readable patch rather than a complete vertical stack; and
- one reflection before moving forward.

This protects the learner from receiving a correct but opaque implementation.

## Options considered

### Option 1 — Micro-slice learning loop (selected)

Each step covers one concept or behavior. The agent explains the problem, alternatives, invariants, and verification plan; the learner chooses; then the smallest useful change is implemented.

**Good:** strongest understanding, small diffs, frequent feedback, easy rollback, and clear evidence of what each test proves.

**Bad:** slower delivery, more pauses, and some repeated explanation when concepts are closely related.

**Why selected:** it best matches the stated learning goal: go slowly, understand every change, and build confidence rather than accumulate code.

### Option 2 — Vertical-slice ladder

Each step delivers a thin end-to-end behavior across schema, repository, service, route, and UI, with several small slices forming one feature.

**Good:** produces usable behavior early and keeps all layers integrated.

**Bad:** requires more decisions per step, makes trade-offs harder to isolate, and can lock in an unclear model before it is understood.

**When useful:** after the concept and contracts are already understood, especially for proving an end-to-end boundary.

### Option 3 — Socratic checkpoints

The agent asks explain-back questions and waits for the learner to reason through each layer before any code is written.

**Good:** maximizes conceptual recall and reveals misunderstandings early.

**Bad:** can become a bottleneck, especially for syntax or routine plumbing that does not need a long discussion.

**When useful:** for security, authorization, transaction, concurrency, and failure decisions—not as the only workflow for every small edit.

## Operating loop

Every future slice follows this sequence:

1. **Assess:** verify the current state and identify one learning outcome.
2. **Concept:** explain the problem and mental model.
3. **Options:** present two or three approaches with good/bad trade-offs.
4. **Selection:** record the learner’s choice and why it fits.
5. **Design:** define the smallest behavior, contracts, invariants, and tests.
6. **One step:** implement only that behavior.
7. **Verify:** run the focused test and inspect the diff.
8. **Reflect:** explain what was learned and update the concept note.
9. **Next step:** propose exactly one next action and pause.

The learner may request a larger batch explicitly, but the default is one step.

## Definition of a good micro-slice

A micro-slice:

- has one clear learning objective;
- changes a small, reviewable set of files;
- has a focused test or observable verification;
- does not require unrelated future decisions;
- can be explained without reading the entire codebase; and
- ends with a documented decision or question.

If a slice needs several unrelated decisions, split it before coding.

## Current next learning boundary: tasks inside projects

The workspace-projects note identifies tasks inside a project as the next product-domain experiment. The first step is design only.

Before implementation, decide:

- What task states exist, and which transitions are legal?
- Does a task belong directly to one project, and how is the workspace boundary inherited?
- Can a task be assigned to any workspace member, only project participants, or nobody initially?
- Which roles may create, view, update, reorder, complete, and delete tasks?
- What must remain true when a project or member is deleted?
- What ordering contract is needed, and which index supports it?
- Which operations need transactions?
- How should duplicate requests, stale updates, missing records, and cross-workspace IDs behave?
- Which service, route, repository, database, and frontend tests will prove those rules?

The next single action is to settle the task state model and its invariants. No task migration, API route, or frontend component should be written before that decision is recorded.

## Decision log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-09-20 | Adopt the micro-slice learning loop | Matches the learner’s need for small, explainable steps and explicit choice before implementation. |
| 2026-09-20 | Keep the backend as the primary learning surface | The repository’s charter treats backend boundaries, persistence, authorization, and failure behavior as the core lessons. |
| 2026-09-20 | Begin the next product slice with task-state design | Tasks are the documented next experiment, but their lifecycle and invariants are not yet selected. |

## Completion evidence for this strategy change

This strategy change is complete when:

- the root `AGENTS.md` instruction is present;
- this document records the selected approach and trade-offs;
- no product code was changed as part of the strategy change; and
- the repository still passes `git diff --check`.
