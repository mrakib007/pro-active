# Frontend Auth Shell Design

## Goal

Keep the existing local PostgreSQL database named `pro_active` and create a polished Next.js/Tailwind authentication UI directly inside `C:\Projects\pro-active\frontend`, without starting backend authentication or creating product tables.

## Database boundary

The existing empty database `pro_active` remains unchanged. This frontend slice does not modify the database, its connection URL, Prisma schema, or backend source.

The backend currently uses Prisma `6.12.0` with its standard PostgreSQL connector. We will not add `@prisma/adapter-pg` in this phase. Prisma's built-in connector is the smallest and clearest choice for a normal Node.js process connecting to local PostgreSQL. A driver adapter can be evaluated later if we need custom `pg` driver behavior, edge/serverless deployment, or specialized pooling.

## Frontend decision

Create a Next.js application directly in the existing `frontend` directory using:

- TypeScript
- App Router
- Tailwind CSS
- ESLint
- The default Next.js project conventions, with no additional wrapper directory

The application will use `/login` and `/signup` routes with shared authentication UI components. The form controls will be interactive for local UI behavior—password visibility, basic required-field feedback, and an honest “backend not connected” status—but they will not call an API or claim that a user was authenticated.

## Visual direction

Use a refined productivity-product aesthetic rather than a generic template:

- Warm paper-toned page background with deep ink typography.
- A restrained indigo/teal accent system for actions and focus states.
- A two-panel desktop composition: a quiet brand/product story area and a focused form area.
- A compact workspace preview card with layered surfaces to communicate the ProjectHub product context.
- Subtle borders, soft shadows, consistent radii, and restrained decorative geometry.
- A single-column mobile layout that keeps the form primary and removes nonessential decoration.
- Visible keyboard focus, semantic labels, adequate contrast, and touch-friendly controls.

The design should feel calm, precise, and durable—closer to a carefully crafted productivity tool than a marketing landing page.

## Component boundary

The first frontend slice will use a small shared boundary:

- `frontend/app/layout.tsx` — document metadata and global shell.
- `frontend/app/globals.css` — Tailwind import and small global design tokens/base rules.
- `frontend/app/page.tsx` — redirects to `/login` so the root route has a predictable entry point.
- `frontend/app/login/page.tsx` — login page composition.
- `frontend/app/signup/page.tsx` — signup page composition.
- `frontend/components/auth/auth-shell.tsx` — shared two-panel auth layout and brand/product panel.
- `frontend/components/auth/auth-form.tsx` — shared form primitives and local-only form behavior.

The exact component split may stay smaller if the generated Next.js structure makes a simpler boundary clearer; no component abstraction will be introduced without reuse.

## Data and behavior flow

```text
user opens /login or /signup
        ↓
Next.js renders shared auth shell
        ↓
user edits fields and submits
        ↓
client validates required UI fields
        ↓
show honest local-only status; no network request yet
```

Backend authentication will be connected in the later authentication phase, where password hashing, sessions, cookies, error contracts, and security tests are designed deliberately.

## Out of scope

- No backend auth endpoints or auth database tables.
- No Prisma adapter installation.
- No database rename or connection changes.
- No OAuth buttons that imply implemented providers.
- No fake successful login/signup flow.
- No state-management library, component library, or design-system package yet.
- No nested `frontend` project directory.

## Verification contract

The change is successful when:

- The existing `pro_active` database and backend connection remain untouched.
- The frontend package files live directly under `frontend`.
- `/login` and `/signup` render responsively with the shared visual system.
- The frontend builds and lints successfully.
- The UI is keyboard-usable and does not claim backend authentication exists.
- Existing backend tests and checks remain green.

The next frontend change will be API integration only after the backend authentication design has been reviewed. The next database change will be domain schema design, documented separately before models or migrations are added.
