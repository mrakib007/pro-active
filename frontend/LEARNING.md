# Pro-Active frontend learning notes

This directory is part of the ProjectHub learning build. The goal is to understand why each frontend and backend boundary exists, not to memorize framework syntax.

## Current slice

- Next.js App Router and Tailwind are scaffolded directly in this directory.
- /login and /signup share the same visual shell and form boundary.
- Form interactions are intentionally local-only. No authentication request is sent yet.
- The PostgreSQL database remains pro_active; this frontend work does not change Prisma or backend code.
- The story panel follows an old-money editorial direction: ivory surfaces, forest ink, antique brass, serif display type, and hairline rules.

## Learning checkpoint

Before the authentication integration phase, we will explain the request flow, API contract, password hashing, sessions/cookies, validation, error handling, database tables, and security tests. The UI will only be connected after that design is understood and reviewed.

## Layout lesson: constrained viewports

The desktop story panel uses a vertical flex layout. Flexible spacing alone is not enough when the viewport becomes shorter than the content: negative margins and shrinkable flex items can pull the header and intro copy into the same space. The shell now gives the column a minimum gap, keeps the header/content/footer from shrinking, and avoids negative top margins. A component regression test protects that spacing contract.

The outer auth canvas is intentionally different: min-height: 100vh means “at least the viewport height,” so larger children can still create a page scrollbar. The desktop shell uses height: 100vh, max-height: 100vh, and min-height: 0 on the grid columns so the canvas stays exactly one viewport tall. Mobile remains content-sized because a signup form may legitimately need more vertical room.

## Formik checkpoint: form state and reusable fields

Formik is now the form-state boundary for the sign-in and sign-up forms. It tracks each field's value, whether the user has touched it, validation errors, and submission state. This replaces manually reading `FormData` on submit, which matters because the UI can now show the error next to the exact field that needs attention.

The reusable fields live in `components/forms/form-fields.tsx`:

- `TextField` binds text and email inputs to Formik.
- `PasswordField` binds a password input and owns its show/hide interaction.
- `CheckboxField` binds boolean values such as “remember me” and terms acceptance.

Each field owns presentation and accessibility details—its label, input id, `aria-invalid`, error association, and error message. `AuthForm` owns the auth-specific rules and decides which fields appear for sign-in versus sign-up. This separation lets us change the visual field implementation without changing the authentication rules.

Validation is intentionally a typed form-level function for now rather than another schema dependency. That keeps the learning path visible: Formik collects the values, the auth boundary evaluates the business rules, and the field components render the result. We can introduce a schema library later when the API contract requires shared validation between frontend and backend.
