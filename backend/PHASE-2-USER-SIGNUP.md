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

## Transition to Phase 2B

The signup slice intentionally stopped before sessions and login so those
concepts could be designed separately. Phase 2B begins below. No workspace or
role behavior is part of the signup slice.

## Phase 2B: Login and database-backed sessions

This section extends the same authentication note. Signup creates a durable
identity; login proves control of that identity and creates authenticated state
for later requests. Authentication answers “who is this?” Authorization will
later answer “what may this user do in this workspace?” They are separate
concepts.

### Learning loop

```text
Concept -> Design -> Test first -> Build -> Verify -> Document -> Reflect
```

The implementation is split into three vertical slices:

1. credential verification;
2. session creation and persistence; and
3. authenticated requests and logout.

### Design decision: database-backed opaque sessions first

The project will learn JWT access and refresh tokens later as a comparison.
The first usable login uses a random opaque session token in an `HttpOnly`
cookie, while PostgreSQL stores only a SHA-256 hash of that token.

This choice makes revocation, expiry, multiple devices, indexed lookups, and
database consistency visible. A stateless JWT can be useful at scale, but
revocation and refresh-token policy would hide important fundamentals if it
were the first implementation.

### Login contract

`POST /api/auth/login` accepts only:

```json
{
  "email": "person@example.com",
  "password": "A secure password"
}
```

The request is strict and normalizes the email in the same way as signup. A
successful request returns `200` with the public user projection and sets a
seven-day session cookie. The session token is never returned in JSON.

```json
{
  "status": "ok",
  "data": {
    "user": {
      "id": "...",
      "fullName": "Rakib Hasan",
      "email": "person@example.com",
      "createdAt": "..."
    }
  }
}
```

Malformed input returns `400 VALIDATION_ERROR`. Both an unknown email and an
incorrect password return the same `401 INVALID_CREDENTIALS` response:

```json
{
  "status": "error",
  "code": "INVALID_CREDENTIALS",
  "message": "Invalid email or password"
}
```

This avoids revealing whether an email is registered. Login does not accept a
role, workspace, or client-selected authorization value.

### Login request flow

```text
HTTP request
  -> strict schema validation and email normalization
  -> users.email unique-index lookup
  -> Argon2 verification in application code
  -> random session token generation
  -> SHA-256 token hash persisted in sessions
  -> HttpOnly cookie returned to the client
  -> public user response
```

The password is not searched in PostgreSQL. `users.email` is a unique lookup
key, but an Argon2 password hash must be verified with the password library.
There is intentionally no password index.

### Session model

The `sessions` table contains:

| Column       | Problem it solves                                                   |
| ------------ | ------------------------------------------------------------------- |
| `id`         | Gives the session a stable internal identity.                       |
| `user_id`    | Relates the session to the account and supports session management. |
| `token_hash` | Looks up a session without storing the raw browser token.           |
| `expires_at` | Makes an old session invalid even if logout is never requested.     |
| `revoked_at` | Records explicit logout or forced revocation.                       |
| `created_at` | Supports auditing and future active-session screens.                |

The database has a unique index on `token_hash`, an index on `user_id`, and an
index on `expires_at`. The session repository only returns a session when its
token hash matches, `revoked_at` is null, and `expires_at` is in the future.
Expired rows remain invalid until a later cleanup job removes them.

### Cookie design

The cookie is named `pro_active_session` and is configured as:

- `HttpOnly`, so browser JavaScript cannot read the session token;
- `SameSite=Lax`, which reduces cross-site request risk for this local flow;
- `Path=/`, so it applies to the application;
- `Secure=false` in local HTTP development and `Secure=true` in production; and
- a seven-day maximum age.

The default Pino logger redacts cookie and authorization headers. The raw
session token must not appear in response JSON, database rows, logs, or error
messages.

### Authenticated request flow

```text
request cookie
  -> cookie-parser
  -> hash the opaque token
  -> indexed sessions.token_hash lookup
  -> reject missing, revoked, or expired session
  -> attach public user to request context
  -> protected controller
```

`GET /api/auth/me` demonstrates the protected-request boundary. `POST
/api/auth/logout` revokes the current session and clears the cookie. Logout is
idempotent when no cookie is present.

### File responsibilities

| File                    | Responsibility                                                         |
| ----------------------- | ---------------------------------------------------------------------- |
| `auth.schemas.ts`       | Defines strict login input and email normalization.                    |
| `auth.service.ts`       | Looks up the user, verifies Argon2, and requests session creation.     |
| `auth.repository.ts`    | Finds users by the unique email index and persists signup records.     |
| `session.repository.ts` | Reads, creates, and revokes session rows through Prisma.               |
| `session.service.ts`    | Generates tokens, hashes them, calculates expiry, and maps safe users. |
| `auth.controller.ts`    | Maps login, current-user, and logout behavior to HTTP and cookies.     |
| `auth.middleware.ts`    | Converts a valid session cookie into authenticated request context.    |
| `auth.routes.ts`        | Maps `/login`, `/me`, and `/logout` to the correct boundary.           |
| `app.ts`                | Installs cookie parsing and injects auth dependencies into the router. |
| `logger.ts`             | Redacts cookie and authorization headers from request logs.            |
| `prisma/schema.prisma`  | Defines the `Session` relation, constraints, and indexes.              |

### Tasks completed

- [x] Add strict login validation and normalized email input.
- [x] Add a user lookup by email without adding a password query or index.
- [x] Add an injectable password-verifier capability using `argon2.verify`.
- [x] Return one generic invalid-credentials error for missing and wrong users.
- [x] Add the `sessions` table and apply the Prisma migration.
- [x] Generate random opaque tokens and persist only SHA-256 hashes.
- [x] Set and clear the protected session cookie.
- [x] Add session expiry and revocation checks.
- [x] Add authentication middleware and `GET /api/auth/me`.
- [x] Add idempotent `POST /api/auth/logout`.
- [x] Redact cookies and authorization headers from default request logs.
- [x] Add service, route, session-service, and PostgreSQL integration tests.

### What we learned

#### 1. Login is not the same as returning a user

Returning a user from a password check would not make the next HTTP request
authenticated. The client needs a credential that the server can validate
again. The session cookie is that credential, and the session table is the
server-side source of truth for whether it remains valid.

#### 2. The email index and password verifier solve different problems

The unique `users.email` index makes account lookup fast and enforces one
account per normalized email. Argon2 verification proves knowledge of the
password. Querying by password would be both conceptually wrong and unsafe.

#### 3. A session token is not a password

The session token is a high-entropy, random capability that is short-lived and
revocable. The password is a human-chosen secret requiring a slow password
hash. A SHA-256 lookup hash is appropriate for the random session token because
the server needs fast indexed lookup and the token has enough randomness; the
password remains protected by Argon2.

#### 4. Database sessions make revocation explicit

Logout updates `revoked_at`. A later request with the same cookie fails the
session predicate. A user can have multiple rows for multiple devices; logging
in on one device does not overwrite another device's session.

#### 5. The first login write does not require a transaction

Credential verification is a read followed by one session insert. There is no
second write that must commit atomically yet. If a future login also records an
audit event or updates `last_login_at`, we will revisit the transaction
boundary and test partial-failure behavior.

#### 6. Redis is not used for session validity

PostgreSQL is the source of truth for account and session validity in this
phase. Redis now has one deliberately narrow responsibility: the login rate
limiter. It is not used to cache session validity, because caching that state
before understanding revocation would create stale authentication behavior.
Short-lived cache experiments and worker coordination remain future concepts.

### Reflect: explain it back

#### 1. Why do we find the user by email instead of password?

**Answer:** The normalized email has a unique database index, so PostgreSQL can
find one account efficiently. The password is not stored as searchable text;
the Argon2 library verifies the submitted password against the stored hash.

#### 2. Why does login need a `sessions` table?

**Answer:** The table gives the server a durable source of truth for expiry and
revocation. It also allows one user to have separate sessions on several
devices. A response containing only a user object would not authenticate a
future request.

#### 3. Why store a token hash instead of the raw cookie token?

**Answer:** If the database is exposed, a raw token could immediately be used
as the user. A hash lets the server validate the presented token while keeping
the database value from being directly reusable. The raw token exists only in
the cookie and short-lived application memory during login.

#### 4. Why do unknown email and wrong password return the same error?

**Answer:** Different messages or status codes could let an attacker discover
which emails have accounts. One generic `401 INVALID_CREDENTIALS` response
reveals less information while still telling a legitimate user that login
failed.

#### 5. Why does `GET /me` use middleware?

**Answer:** Session validation is a cross-cutting boundary needed by many
future protected routes. Middleware performs it once and attaches trusted
identity context, so each controller can focus on its own business behavior.

#### 6. Why is logout implemented by revocation rather than only deleting a row?

**Answer:** Revocation preserves a record that the session existed and makes
the state transition explicit. It supports auditing and forced logout later.
An expired or revoked row can be cleaned up separately by a scheduled job.

#### 7. Why is `role` still absent from login?

**Answer:** Login authenticates global identity. A role describes permissions in
a particular workspace and belongs to a future membership relationship. The
server will derive authorization from trusted membership data after login.

#### 8. What remains before this is production-grade authentication?

**Answer:** Login rate limiting is now covered by Phase 2C. We still need CSRF
protection for cookie-based state changes, password reset and email
verification, session management, expired-session cleanup, security monitoring,
and a comparison with JWT access/refresh tokens. Each will be a separate
learning slice.

### Phase 2B verification evidence

The implementation has 33 passing backend tests across 9 test files, including
PostgreSQL session persistence and revocation tests. TypeScript, ESLint, and
Prettier checks pass. A live request sequence against the local database also
passed: register `201`, login `200`, `/me` `200`, logout `204`, and `/me` after
logout `401`. The database read confirmed one 64-character token hash and a
revoked session row; the temporary verification user was then removed.

## Phase 2C: Login rate limiting

### What problem does this solve?

Password verification is intentionally expensive because Argon2 slows down
guessing. That protects stored passwords, but it does not stop a client from
sending many guesses to the login endpoint. Login rate limiting adds a shared
server-side budget so multiple backend processes can enforce the same policy.

### Design decisions

- Use Redis as the shared counter store; process-local memory would reset on
  restart and would not coordinate across backend instances.
- Count attempts by the normalized email and client IP. The email prevents a
  single client from using one IP budget to attack every account, while the IP
  prevents a single account key from being globally locked by one attacker.
- Allow five login attempts per key during a sixty-second window.
- Return `429 AUTH_RATE_LIMITED` with a `Retry-After` header when the budget is
  exhausted.
- Fail closed when Redis cannot be reached by returning a `503` response with
  code `RATE_LIMITER_UNAVAILABLE`; silently allowing unprotected login attempts
  would hide a security dependency failure.
- Inject the limiter at the application boundary so route tests can prove the
  HTTP contract without requiring Redis.

### Login request flow

```text
HTTP request
  -> strict schema validation and email normalization
  -> Redis-backed login budget consumption
  -> Argon2 verification and session creation
  -> public user response and session cookie
```

Invalid request shapes are rejected before the limiter because they are not
login attempts with a meaningful normalized identity. Valid attempts consume a
point before password verification, so both successful and unsuccessful
credential guesses are bounded.

### File responsibilities

| File                                         | Responsibility                                                                            |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/config.ts`                              | Validates the `REDIS_URL` runtime setting.                                                |
| `src/infrastructure/cache/redis.ts`          | Owns the lazy Redis client, error logging, health probe, and shutdown.                    |
| `src/modules/auth/login-rate-limiter.ts`     | Adapts `rate-limiter-flexible` to the auth domain and maps store failures to safe errors. |
| `src/modules/auth/auth.controller.ts`        | Consumes the budget and maps rate-limit outcomes to `429` or `503` responses.             |
| `src/app.ts`                                 | Injects the limiter into the auth router.                                                 |
| `src/server.ts`                              | Disconnects Redis during graceful shutdown.                                               |
| `tests/phase-two/login-rate-limiter.test.ts` | Proves key construction, allowed attempts, exhaustion, and store failure behavior.        |
| `tests/phase-two/auth-routes.test.ts`        | Proves the public HTTP error and `Retry-After` contracts.                                 |

### Tasks completed

- [x] Validate `REDIS_URL` with the existing startup configuration parser.
- [x] Add a reusable lazy Redis client with bounded retry behavior.
- [x] Add an injectable login limiter backed by `RateLimiterRedis`.
- [x] Use a normalized-email and IP key for valid login attempts.
- [x] Return a stable `429` response and retry delay when the budget is exhausted.
- [x] Return a stable `503` response when Redis is unavailable.
- [x] Disconnect Redis during direct-run server shutdown.
- [x] Add unit and route tests without making the test suite depend on Redis.

### Verification evidence

The backend now has 40 passing tests across 10 test files. TypeScript,
ESLint, Prettier, the production build, and the PostgreSQL connection check all
pass. A direct probe of the production limiter confirmed that the local machine
does not currently have a Redis service listening on `localhost:6379`; the
limiter logged the connection failure and returned
`LoginRateLimiterUnavailableError`, which maps to the intended `503` response.

### Next experiment

The next authentication slice will design CSRF protection for cookie-based
state changes. After that, the project can compare password reset, email
verification, session management, and JWT access/refresh tokens as separate
concepts.
