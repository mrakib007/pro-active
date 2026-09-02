# Frontend Auth Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a polished, responsive Next.js/Tailwind authentication UI directly inside `frontend`, with `/login` and `/signup` routes and no backend authentication behavior yet.

**Architecture:** Use the Next.js App Router with a shared `AuthShell` layout and a shared client-side `AuthForm`. Pages compose the shared pieces and contain only route-specific copy/configuration. Local form state is limited to visibility, basic validation, and an explicit not-connected status; no API client or fake authentication state is introduced.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, ESLint, Vitest, Testing Library, and jsdom.

**Spec:** `C:\Projects\pro-active\docs\superpowers\specs\2026-09-02-frontend-auth-shell-and-database-rename-design.md`

## Global Constraints

- Create the Next.js application directly in `C:\Projects\pro-active\frontend`; do not create another wrapper directory.
- Use TypeScript, App Router, Tailwind CSS, and ESLint.
- Keep the existing PostgreSQL database named `pro_active` and do not modify backend source or Prisma configuration.
- Do not install `@prisma/adapter-pg`, add auth API calls, add OAuth providers, or create fake successful authentication.
- Use an old-money editorial aesthetic with ivory surfaces, deep forest ink, muted stone text, antique-brass accents, serif display type, responsive layout, and visible focus states.
- Write tests before custom component behavior and observe the failing RED state before implementing it.
- Add only the shared components needed by both authentication routes; avoid a premature design-system package.

---

### Task 1: Scaffold Next.js in the existing frontend directory

**Files:**

- Create/generated directly under: `frontend/`
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.mts`
- Create: `frontend/vitest.setup.ts`

**Interfaces:**

- `frontend/package.json` provides `dev`, `build`, `start`, `lint`, `test`, and `test:watch` scripts.
- The Next.js app uses root-level `app/` and does not use a second nested project directory.
- Vitest runs React component tests in jsdom.

- [x] **Step 1: Confirm the frontend directory contains no existing application files**

Run from the repository root:

```powershell
Get-ChildItem -LiteralPath 'frontend' -Force | Select-Object Name,Mode
```

Expected: only the existing learning README is present; preserve it unless the generated project replaces its content with an equivalent project README.

- [x] **Step 2: Scaffold Next.js directly in `frontend`**

Run from `frontend`:

```powershell
npx create-next-app@latest . --typescript --eslint --tailwind --app --use-npm --import-alias "@/*" --no-src-dir --yes
```

Expected: `frontend/package.json`, `frontend/app/`, Tailwind/PostCSS configuration, and Next.js TypeScript configuration are created directly in `frontend`.

- [x] **Step 3: Add component-test dependencies**

Run from `frontend`:

```powershell
npm install --save-dev vitest jsdom @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

- [x] **Step 4: Add the Vitest configuration**

Create `frontend/vitest.config.mts`:

```typescript
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.tsx"],
  },
});
```

Create `frontend/vitest.setup.ts`:

```typescript
import "@testing-library/jest-dom/vitest";
```

- [x] **Step 5: Add the test scripts**

Add these scripts to `frontend/package.json` without removing the generated Next.js scripts:

```json
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [x] **Step 6: Run the scaffold checks**

Run:

```powershell
npm run lint
npm run build
```

Expected: the generated application lints and builds before custom UI changes.

### Task 2: Define the auth form behavior with failing tests

**Files:**

- Test: `frontend/tests/auth-form.test.tsx`
- Create later: `frontend/components/auth/auth-form.tsx`

**Interfaces:**

- `AuthForm` accepts `{ mode: "login" | "signup" }`.
- Login exposes email, password, remember-me, and a submit button.
- Signup exposes name, email, password, password confirmation, terms, and a submit button.
- Submitting valid local fields displays an explicit UI-only status.
- Signup rejects mismatched passwords and password visibility can be toggled.

- [x] **Step 1: Write the failing component tests**

Create `frontend/tests/auth-form.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { AuthForm } from "../components/auth/auth-form";

describe("AuthForm", () => {
  test("shows an honest local-only status after a valid login submission", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);

    await user.type(screen.getByLabelText(/email/i), "person@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "A secure password");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/backend.*not connected/i);
  });

  test("rejects mismatched signup passwords without submitting", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="signup" />);

    await user.type(screen.getByLabelText(/full name/i), "Rakib Hasan");
    await user.type(screen.getByLabelText(/work email/i), "person@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "A secure password");
    await user.type(screen.getByLabelText(/confirm password/i), "A different password");
    await user.click(screen.getByRole("button", { name: /create workspace/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/passwords do not match/i);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("toggles password visibility", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);
    const password = screen.getByLabelText(/^password$/i);

    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(password).toHaveAttribute("type", "text");
  });
});
```

- [x] **Step 2: Run the focused tests and verify RED**

Run from `frontend`:

```powershell
npm test -- tests/auth-form.test.tsx
```

Expected: the suite fails because `components/auth/auth-form.tsx` does not exist yet.

### Task 3: Implement the shared auth shell and pages

**Files:**

- Create: `frontend/components/auth/auth-shell.tsx`
- Create: `frontend/components/auth/auth-form.tsx`
- Create/modify: `frontend/app/login/page.tsx`
- Create: `frontend/app/signup/page.tsx`
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/globals.css`

**Interfaces:**

- `AuthShell` accepts page eyebrow, heading, description, children, and footer content.
- `AuthForm` accepts `mode: "login" | "signup"` and owns only local form state.
- Login and signup pages reuse the same shell and form boundary while changing copy and fields through `mode`.

- [x] **Step 1: Implement the minimal behavior required by the failing tests**

Create `AuthForm` as a client component. Use semantic labels and inputs, prevent the default submission, reject mismatched signup passwords, toggle password input type, and render the text `Backend authentication is not connected yet.` in a `role="status"` element after valid local submission. Render validation errors in a `role="alert"` element.

- [x] **Step 2: Run the focused tests and verify GREEN**

Run:

```powershell
npm test -- tests/auth-form.test.tsx
```

Expected: all three tests pass.

- [x] **Step 3: Implement the visual shell**

Create `AuthShell` with a responsive two-panel layout: a product story/preview panel on large screens and the form panel. Use Tailwind classes for spacing, surfaces, borders, type scale, focus rings, and responsive breakpoints. Use CSS-only hairline rules and restrained color tokens so the page has no external image dependency.

- [x] **Step 4: Compose login and signup routes**

Use `/login` and `/signup` pages with shared `AuthShell` and `AuthForm`. Add links between the routes with `next/link`. Make `/` redirect to `/login` using `redirect` from `next/navigation`.

- [x] **Step 5: Add global visual tokens and metadata**

Update `app/globals.css` with the Tailwind import and minimal global tokens/base rules for the paper background, ink, muted text, accents, selection, and editorial story-panel colors. Update `app/layout.tsx` metadata to identify Pro-Active/ProjectHub and keep the document language accessible.

### Task 4: Verify the UI and document the frontend slice

**Files:**

- Modify: `frontend/README.md`
- Modify: `docs/superpowers/plans/2026-09-02-frontend-auth-shell.md`

**Interfaces:**

- The frontend README explains how to run the app and clearly states that authentication is UI-only.
- The implementation plan records the test, build, lint, and visual verification evidence.

- [x] **Step 1: Run the complete automated checks**

Run from `frontend`:

```powershell
npm test
npm run lint
npm run build
```

Expected: all component tests pass, ESLint reports no errors, and Next.js produces a production build.

- [x] **Step 2: Run the development server for visual verification**

Run:

```powershell
npm run dev
```

Inspect `/login`, `/signup`, and a narrow mobile viewport. Confirm the form remains primary on mobile, labels and focus states are visible, and the submitted state is clearly UI-only.

- [x] **Step 3: Update the frontend README**

Document `npm run dev`, `npm test`, `npm run lint`, `npm run build`, the `/login` and `/signup` routes, and the fact that backend authentication is intentionally not connected yet.

- [x] **Step 4: Review the final scope**

Confirm the project files are directly under `frontend`, no nested Next.js directory exists, no backend file changed, no Prisma adapter was installed, and no authentication request is made by the forms.

- [x] **Step 5: Mark the frontend plan complete**

## Verification evidence

- Automated checks passed on 2026-09-02: npm test (3 tests), npm run typecheck, npm run lint, and npm run build.
- The production build generated the root, /login, and /signup routes.
- Browser review covered the desktop login layout, the 390x844 mobile login layout, and the 390x844 mobile signup layout.
- A short desktop viewport regression was reproduced and fixed; the measured header-to-intro gap is now positive.
- The desktop auth canvas is locked to the viewport height; at 1280x720 the document scrollHeight and clientHeight both measure 720.
- Browser behavior checks confirmed the UI-only login status, mismatched-password validation, and password visibility toggle.
- The existing pro_active database name and backend authentication boundary remain unchanged by this frontend slice.

Update this plan only after automated and visual verification pass. Keep the backend authentication phase pending.
