# Project Learning Instructions

This repository is an educational backend-engineering and system-design project. Optimize for understanding, not for the fastest feature delivery. The human learner should be able to explain why a design exists, what can go wrong, and how the tests prove the behavior.

## Default working method

Use one micro-slice at a time:

1. **Assess** the current repository state and identify the single next learning outcome.
2. **Explain the concept** in plain language before proposing code.
3. **Present 2–3 approaches** in Markdown. For each approach, describe the good, bad, risks, and what it teaches.
4. **Wait for the learner to choose** an approach before implementation.
5. **Design one narrow behavior** with its entities, relationships, invariants, authorization, transaction boundary, query shape, failure behavior, and tests.
6. **Implement the smallest testable step**. Do not combine unrelated layers or features in one change.
7. **Verify immediately** with the narrowest useful command, then run broader checks when the slice is complete.
8. **Reflect and document** what changed, why, what the tests prove, and the next single step.

Do not silently skip a decision gate because the implementation appears obvious. If a new requirement expands the slice, pause and re-scope it.

## Before writing code

State:

- the user problem and the learning objective;
- the relevant entities and relationships;
- the invariants that must always remain true;
- the authorization rule and tenant boundary;
- the transaction boundary and expected query/index shape;
- failure, retry, duplicate-request, and concurrency behavior; and
- the test that will prove the behavior.

If a design choice has meaningful trade-offs, show the alternatives before coding. The learner chooses the approach; the agent explains the consequences and records the decision.

## Implementation boundaries

- Prefer one concept, one behavior, and one focused test target per step.
- Keep patches small enough for the learner to read in one sitting.
- Show only the relevant code and explain unfamiliar syntax; never drop a large unannotated code block when a smaller edit will teach the same thing.
- Follow the existing feature-oriented modular-monolith structure: route → controller → service → repository → database.
- Keep authorization in the service layer and tenant scoping in every repository read and write.
- Use test-first development for behavior changes: write a focused failing test, run it, make the smallest implementation change, and run it again.
- Do not add speculative fields, abstractions, dependencies, queues, caching, pagination, or UI work before their learning objective is selected.
- Treat the frontend as a later consumer unless the current learning slice specifically requires a frontend boundary.

## After each step

Report:

- the exact files changed;
- the behavior now supported;
- the command run and its observed result;
- what the learner should be able to explain; and
- the next single proposed step.

Then pause for confirmation before starting the next step. Do not implement a whole plan in one turn unless the learner explicitly asks for that.

## Documentation rules

- Keep one living concept note per major concept; update it instead of creating a note for every tiny task.
- Keep the current workflow and decision history in `docs/PROJECT-STRATEGY.md`.
- Keep implementation designs and plans under `docs/superpowers/` when a slice is large enough to need them.
- Record rejected alternatives and their reasons; this project values design reasoning as much as code.
- Mark verification with real commands and observed results. Do not claim a test, build, or requirement is complete without fresh evidence.

## Current project direction

The completed workspace-projects slice established the tenant boundary. The next learning boundary is tasks inside a project. Start with task states, relationships, invariants, authorization, deletion behavior, ordering, and transaction decisions. Do not write the task schema or API until that design is selected and understood.

The root instruction applies to the whole repository. `frontend/AGENTS.md` contains framework-specific generated guidance and remains in force for frontend work.
