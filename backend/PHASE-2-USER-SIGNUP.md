# Phase 2A: User Signup — Living Authentication Note

This note records the learning work for authentication. It will grow with the
later login, sessions, authorization, logout, security-test, and failure-
experiment phases. It is intentionally a concept record, not just a list of
files that were changed.

## Learning loop for this phase

```text
Concept -> Design -> Tasks -> Build -> Verify -> Reflect
```

The goal is to be able to explain the boundaries and failure modes before
moving to the next authentication slice.

## Concept: what problem does signup solve?

Signup creates a durable identity that the rest of the product can refer to.
Before this phase, the backend could receive HTTP requests and connect to
PostgreSQL, but it had no account record. Without a persisted user, there is
nothing to authenticate later, attach to a workspace, or use as the owner of
projects and tasks.

The simplest mental model is:

```text
trusted application rules + untrusted request
  -> validated account data
  -> safely stored credential verifier
  -> public user identity
```

The password is not the user's identity. It is a secret used to prove control
of that identity, so the database stores only a one-way hash.

## Design decisions

- Use `POST /api/auth/register`; “sign up” is the UI term and “register” is
  the API action.
- Persist one `User` record in this phase.
- Normalize email once at the request boundary and enforce uniqueness in the
  database.
- Hash the password with Argon2 before persistence.
- Return a public user projection, never the password or password hash.
- Reject unknown input such as a client-selected `role`.
- Keep password confirmation in the client because it compares two submitted
  values but is not needed to create the account.
- Do not create a workspace, membership, role, session, login state, or email
  verification flow yet. Each is a separate concept with its own design.
- Use structured validation errors so a future Formik client can map a backend
  error to the correct field.

## Tasks completed

- [x] Define the `User` table and its constraints.
- [x] Define the registration request and response contract.
- [x] Validate and normalize input with Zod.
- [x] Hash the password with Argon2.
- [x] Keep HTTP, business, and persistence responsibilities separate.
- [x] Persist users through an injected repository.
- [x] Map the database unique-email violation to a stable `409` error.
- [x] Return only safe public user data.
- [x] Add route, service, and PostgreSQL integration tests.
- [x] Expose field-level and form-level validation details.

## Scope

This slice persists a user account through `POST /api/auth/register`. It does
not create a workspace, membership, role, session, or login flow. Those are
separate concerns for later phases.

## User model

The `users` table stores:

- a UUID primary key;
- the user's full name;
- a normalized, unique email address;
- an Argon2 password hash; and
- creation and update timestamps.

The raw password is never sent to the repository or returned in the response.
The password confirmation field remains a client-side concern.

## Request and response

The registration request accepts:

```json
{
  "fullName": "Rakib Hasan",
  "email": "person@example.com",
  "password": "A secure password"
}
```

Successful registration returns HTTP `201` with public user data. Invalid
input returns `400 VALIDATION_ERROR`; a duplicate normalized email returns
`409 EMAIL_ALREADY_REGISTERED`.

The endpoint deliberately rejects unknown fields such as a client-selected
`role`. Roles will belong to workspace memberships when authorization is
designed.

Validation errors now preserve both kinds of Zod errors: field errors that a
client can attach to a specific input, and form errors that apply to the
request as a whole. For example:

```json
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": {
    "formErrors": [],
    "fieldErrors": {
      "email": ["Enter a valid email address"]
    }
  }
}
```

The stable `code` is for program behavior; the human-readable `message` and
field messages are for people and UI. This lets a future client map
`details.fieldErrors.email` to its email field without parsing the message.
Zod 4 provides this flat field/form representation through
`z.flattenError()`.

## Build: request flow

```text
HTTP request
  -> Zod validation and normalization
  -> registration service
  -> Argon2 password hash
  -> user repository
  -> PostgreSQL users table
  -> public user response
```

The service and repository are injected at the application boundary so HTTP
behavior can be tested without making every route test depend on PostgreSQL.
The repository still has database integration tests for persistence and the
unique email constraint.

## Build: file responsibilities

| File                   | Responsibility                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `auth.routes.ts`       | Maps `POST /api/auth/register` to the registration controller.                       |
| `auth.controller.ts`   | Reads the HTTP body, validates it, chooses the HTTP status, and shapes the response. |
| `auth.schemas.ts`      | Defines accepted input, normalization, limits, and strict unknown-field rejection.   |
| `auth.service.ts`      | Coordinates the registration use case and password hashing.                          |
| `auth.repository.ts`   | Persists the user with Prisma and translates the unique constraint failure.          |
| `prisma/schema.prisma` | Defines the database model and column mappings.                                      |
| `app.ts`               | Mounts the auth router and serializes application errors.                            |

This is practical MVC rather than textbook MVC: JSON is the view, the
controller is the HTTP adapter, and the service/repository layers keep product
rules and database details from being mixed into route definitions.

## What we learned in this slice

### 1. The request boundary is untrusted

The controller cannot assume that the request came from our frontend. A caller
can send missing fields, the wrong types, extra fields, or a selected role.
Zod is therefore used at the HTTP boundary before the service is called. The
schema also normalizes the values once, so downstream code receives one
consistent representation of the email and name.

### 2. The controller is not the business layer

The controller translates HTTP into application input and application output:

```text
HTTP status/body -> validated input -> service call -> HTTP response
```

It does not hash passwords or write Prisma queries. That separation means the
same registration service can later be called by another transport, and route
tests can focus on HTTP behavior.

### 3. The service owns the registration use case

The service coordinates the work that makes “register a user” meaningful:

1. Validate the normalized input again at the use-case boundary.
2. Hash the raw password with Argon2.
3. Send only the safe user fields and hash to the repository.
4. Convert the stored record into a public user object.

The second schema check is intentional. It protects the service if it is called
without the current controller in the future. The service is also the right
place to add business rules such as account status or invitation requirements.

### 4. The repository owns persistence details

The repository knows that persistence uses Prisma and that the model is named
`User`. The service does not need to know whether the next implementation uses
Prisma, SQL, or a test double. This is a practical boundary, not an attempt to
hide every database operation behind unnecessary abstractions.

### 5. The database is the final authority for uniqueness

The application checks and normalizes the email, but it does not rely on a
“check first, then insert” sequence. Two requests can arrive at the same time
and both pass a prior lookup. The `UNIQUE` constraint on `users.email` makes
the insert race-safe; the repository maps Prisma's constraint error into the
domain-level `UserEmailAlreadyExistsError`, and the controller returns `409`.

This is the first concurrency lesson in the project: validation improves the
request, while database constraints protect the invariant.

### 6. Why each User column exists

| Column          | Problem it solves                                                                        |
| --------------- | ---------------------------------------------------------------------------------------- |
| `id`            | Gives every account a stable internal identity that does not depend on an email address. |
| `full_name`     | Stores the display identity used by the product.                                         |
| `email`         | Provides the login identifier and a unique lookup key.                                   |
| `password_hash` | Stores a one-way password verifier instead of a reusable secret.                         |
| `created_at`    | Records when the account was created for auditing and product behavior.                  |
| `updated_at`    | Records changes to the account and supports later synchronization or cache invalidation. |

There is no `role` column because a role belongs to a user's membership in a
workspace, not to the global identity. There is no session column because
authentication state is a separate concern that we will design next.

## How to study this code

Trace one valid request in this order:

```text
auth.routes.ts
  -> auth.controller.ts
  -> auth.schemas.ts
  -> auth.service.ts
  -> auth.repository.ts
  -> prisma/schema.prisma
  -> PostgreSQL users table
```

Then trace an invalid request and a duplicate-email request. Ask yourself at
which boundary each decision belongs and what would break if that boundary
were removed. The tests in `tests/phase-two` are executable examples of those
answers.

## Migration

The first domain migration is `20260903043552_add_user`. It creates the
`users` table and the unique email index. Schema changes are managed through
Prisma Migrate rather than `prisma db push`.

## Verify: evidence

Verified on 2026-09-03:

- `npm test` - 7 test files passed, 20 tests passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run format:check` passed after formatting the new tests.
- The migration was applied successfully to the local `pro_active` database.

## Reflect: explain it back

Read each question first, try to answer it yourself, then compare your answer
with the explanation.

### 1. Why must the controller treat every request as untrusted?

**Answer:** The request may come from a modified frontend, a script, Postman,
or an attacker directly calling the API. Frontend validation improves user
experience, but it is not a security boundary because the caller can bypass
it. The controller is the first application boundary we own, so it validates
types, required fields, limits, and unknown fields before passing data deeper
into the system.

### 2. Why normalize the email and also enforce a unique constraint?

**Answer:** Normalization makes equivalent inputs represent the same account.
For example, `PERSON@Example.COM` becomes `person@example.com`. The unique
constraint solves a different problem: it protects the database invariant even
when two requests arrive at nearly the same time. Application code can check
first and still lose a race; PostgreSQL is the final authority.

### 3. Why does the service hash the password instead of the controller or repository?

**Answer:** Hashing is part of the “register user” use case, so it belongs in
the service that coordinates that use case. The controller should understand
HTTP, and the repository should understand persistence. Keeping hashing in the
service also prevents the repository from receiving a raw password and gives
us one place to change password-hashing policy later.

### 4. What happens if two signup requests use the same email at the same time?

**Answer:** Both requests may pass schema validation and both may start
hashing. When they try to insert, PostgreSQL's unique index allows only one
row. The losing insert raises Prisma's unique-constraint error (`P2002`). The
repository translates that infrastructure error into
`UserEmailAlreadyExistsError`, and the controller returns `409 Conflict`.
This is safer than relying on an application-level “does this email exist?”
check.

### 5. Why return `409` for a duplicate email but `400` for invalid input?

**Answer:** `400 Bad Request` means the submitted request is invalid—for
example, the email is malformed or the password is too short. `409 Conflict`
means the request is valid in shape but conflicts with the current state of the
system: an account with that unique email already exists. The distinction lets
clients react differently and communicates the failure more precisely.

### 6. Why is `role` absent from `User`, and where will it belong later?

**Answer:** A `User` represents global identity. A role represents what that
identity can do within a particular workspace. The same person may be an
`OWNER` in one workspace and a `MEMBER` in another, so the role belongs on a
future `WorkspaceMember` relationship. Signup must never accept a client-chosen
role because authorization decisions must come from trusted server-side rules.

### 7. What information must never appear in a response or log?

**Answer:** Both the raw password and the password hash are sensitive. The raw
password must never be stored, returned, or logged. The hash is not reversible,
but it is still a credential verifier that an attacker could use for offline
guessing if exposed. The API returns only the public user projection, and
request logging must not include request bodies containing passwords.

### 8. Why do we return structured field errors?

**Answer:** A single message such as “Request validation failed” tells a person
that something is wrong but not which input needs attention. `fieldErrors`
lets a client attach the email error to the email field, while `formErrors`
handles problems that do not belong to one field. The stable error `code` is
for program logic; the messages are for people.

## Next experiment

The next authentication slice can add sessions or login after this user-only
registration behavior has been reviewed. No workspace or role behavior is
part of this slice.
