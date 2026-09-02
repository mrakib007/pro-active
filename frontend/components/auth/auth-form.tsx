"use client";

import { useState, type FormEvent } from "react";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthMode;
};

const inputClassName =
  "h-12 w-full rounded-2xl border border-[var(--line)] bg-white/75 px-4 text-[15px] text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] hover:border-[var(--line-strong)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]";

export function AuthForm({ mode }: AuthFormProps) {
  const isSignup = mode === "signup";
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    if (isSignup) {
      const name = String(formData.get("name") ?? "").trim();
      const confirmation = String(formData.get("passwordConfirmation") ?? "");

      if (!name) {
        setError("Enter your full name to create your workspace.");
        return;
      }

      if (password !== confirmation) {
        setError("Passwords do not match.");
        return;
      }

      if (!formData.get("terms")) {
        setError("Accept the terms to create your workspace.");
        return;
      }
    }

    setNotice("Backend authentication is not connected yet.");
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      {isSignup ? (
        <div className="space-y-2">
          <label
            className="block text-sm font-semibold text-[var(--ink)]"
            htmlFor="name"
          >
            Full name
          </label>
          <input
            autoComplete="name"
            className={inputClassName}
            id="name"
            name="name"
            placeholder="e.g. Rakib Hasan"
            type="text"
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <label
          className="block text-sm font-semibold text-[var(--ink)]"
          htmlFor="email"
        >
          {isSignup ? "Work email" : "Email address"}
        </label>
        <input
          autoComplete="email"
          className={inputClassName}
          id="email"
          name="email"
          placeholder="you@company.com"
          type="email"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <label
            className="block text-sm font-semibold text-[var(--ink)]"
            htmlFor="password"
          >
            Password
          </label>
          {!isSignup ? (
            <button
              className="text-xs font-semibold text-[var(--accent)] underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-soft)]"
              onClick={() => setNotice("Password recovery will arrive with authentication.")}
              type="button"
            >
              Forgot password?
            </button>
          ) : null}
        </div>
        <div className="relative">
          <input
            autoComplete={isSignup ? "new-password" : "current-password"}
            className={`${inputClassName} pr-20`}
            id="password"
            name="password"
            placeholder="At least 8 characters"
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-1 right-1 rounded-xl px-3 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-soft)]"
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {isSignup ? (
        <div className="space-y-2">
          <label
            className="block text-sm font-semibold text-[var(--ink)]"
            htmlFor="passwordConfirmation"
          >
            Confirm password
          </label>
          <input
            autoComplete="new-password"
            className={inputClassName}
            id="passwordConfirmation"
            name="passwordConfirmation"
            placeholder="Repeat your password"
            type={showPassword ? "text" : "password"}
          />
        </div>
      ) : null}

      {!isSignup ? (
        <label className="flex items-center gap-3 text-sm text-[var(--muted)]">
          <input
            className="size-4 rounded border-[var(--line-strong)] accent-[var(--accent)] focus:ring-[var(--accent)]"
            name="remember"
            type="checkbox"
          />
          Keep me signed in on this device
        </label>
      ) : (
        <label className="flex items-start gap-3 text-sm leading-6 text-[var(--muted)]">
          <input
            className="mt-1 size-4 shrink-0 rounded border-[var(--line-strong)] accent-[var(--accent)] focus:ring-[var(--accent)]"
            name="terms"
            type="checkbox"
          />
          <span>
            I agree to the workspace terms and understand this is a local UI
            preview.
          </span>
        </label>
      )}

      {error ? (
        <p
          aria-live="polite"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {notice ? (
        <p
          aria-live="polite"
          className="rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-soft)] px-4 py-3 text-sm font-medium text-[var(--accent-strong)]"
          role="status"
        >
          {notice}
        </p>
      ) : null}

      <button
        className="group flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-[var(--ink)] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_-16px_rgba(24,33,27,0.85)] transition hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-soft)] active:translate-y-0"
        type="submit"
      >
        {isSignup ? "Create workspace" : "Continue"}
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </button>
    </form>
  );
}
