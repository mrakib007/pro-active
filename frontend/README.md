# Pro-Active frontend

The frontend for ProjectHub is a Next.js App Router application created directly in this directory. There is no nested frontend project.

## Run it locally

~~~bash
npm run dev
~~~

Open http://localhost:3000/login or http://localhost:3000/signup.

## Useful checks

~~~bash
npm test
npm run typecheck
npm run lint
npm run build
~~~

## Current scope

The login and signup screens are a polished UI slice only. They provide local field validation, password visibility toggling, and an explicit “backend authentication is not connected yet” state. They do not send requests, create accounts, store credentials, or pretend that authentication succeeded.

Backend authentication comes later as a separate learning phase. We will first design the API contract, password hashing, sessions/cookies, database tables, error cases, and security tests before connecting these forms.

The visual shell uses Tailwind CSS, a small shared AuthShell, and a shared AuthForm. The app uses the existing PostgreSQL database pro_active indirectly through the backend; this frontend phase does not modify the database or Prisma setup.
