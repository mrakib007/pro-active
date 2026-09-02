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
