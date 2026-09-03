"use client";

import { Form, Formik, type FormikErrors } from "formik";
import { useState } from "react";
import {
  useRegisterMutation,
  type ApiErrorResponse,
} from "../../lib/api/auth-api";
import {
  CheckboxField,
  PasswordField,
  TextField,
} from "../forms/form-fields";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthMode;
};

type AuthValues = {
  fullName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  remember: boolean;
  terms: boolean;
};

const initialValues: AuthValues = {
  email: "",
  fullName: "",
  password: "",
  passwordConfirmation: "",
  remember: false,
  terms: false,
};

function validateAuthValues(
  values: AuthValues,
  isSignup: boolean,
): FormikErrors<AuthValues> {
  const errors: FormikErrors<AuthValues> = {};

  if (isSignup && !values.fullName.trim()) {
    errors.fullName = "Enter your full name to create your workspace.";
  }

  if (!values.email.trim()) {
    errors.email = "Enter your email address.";
  }

  if (!values.password) {
    errors.password = "Enter your password.";
  }

  if (isSignup) {
    if (!values.passwordConfirmation) {
      errors.passwordConfirmation = "Confirm your password.";
    } else if (values.password !== values.passwordConfirmation) {
      errors.passwordConfirmation = "Passwords do not match.";
    }

    if (!values.terms) {
      errors.terms = "Accept the terms to create your workspace.";
    }
  }

  return errors;
}

function isAuthFormField(field: string): field is keyof AuthValues {
  return [
    "fullName",
    "email",
    "password",
    "passwordConfirmation",
    "remember",
    "terms",
  ].includes(field);
}

function readApiError(error: unknown): ApiErrorResponse | null {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return null;
  }

  const data = error.data;

  if (
    typeof data !== "object" ||
    data === null ||
    !("code" in data) ||
    !("message" in data) ||
    typeof data.code !== "string" ||
    typeof data.message !== "string"
  ) {
    return null;
  }

  return data as ApiErrorResponse;
}

export function AuthForm({ mode }: AuthFormProps) {
  const isSignup = mode === "signup";
  const [notice, setNotice] = useState<string | null>(null);
  const [registerUser, { isLoading: isRegistering }] = useRegisterMutation();

  return (
    <Formik<AuthValues>
      initialValues={initialValues}
      onSubmit={async (values, { setErrors, setSubmitting }) => {
        setNotice(null);

        if (!isSignup) {
          setNotice("Backend authentication is not connected yet.");
          setSubmitting(false);
          return;
        }

        try {
          const response = await registerUser({
            email: values.email,
            fullName: values.fullName,
            password: values.password,
          }).unwrap();

          setNotice(
            `Account created for ${response.data.user.email}. You can sign in once sessions are connected.`,
          );
        } catch (error: unknown) {
          const apiError = readApiError(error);
          const fieldErrors = apiError?.details?.fieldErrors;

          if (fieldErrors) {
            const formErrors: FormikErrors<AuthValues> = {};

            for (const [field, messages] of Object.entries(fieldErrors)) {
              const message = messages[0];

              if (message && isAuthFormField(field)) {
                formErrors[field] = message;
              }
            }

            setErrors(formErrors);
          }

          setNotice(apiError?.message ?? "Unable to create your account right now.");
        } finally {
          setSubmitting(false);
        }
      }}
      validate={(values) => validateAuthValues(values, isSignup)}
      validateOnChange={false}
    >
      {({ isSubmitting }) => (
        <Form
          className="space-y-5"
          noValidate
          onChange={() => setNotice(null)}
        >
          {isSignup ? (
            <TextField
              autoComplete="name"
              label="Full name"
              name="fullName"
              placeholder="e.g. Rakib Hasan"
            />
          ) : null}

          <TextField
            autoComplete="email"
            label={isSignup ? "Work email" : "Email address"}
            name="email"
            placeholder="you@company.com"
            type="email"
          />

          <PasswordField
            autoComplete={isSignup ? "new-password" : "current-password"}
            label="Password"
            labelAccessory={
              !isSignup ? (
                <button
                  className="text-xs font-semibold text-[var(--accent)] underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-soft)]"
                  onClick={() =>
                    setNotice("Password recovery will arrive with authentication.")
                  }
                  type="button"
                >
                  Forgot password?
                </button>
              ) : undefined
            }
            name="password"
            placeholder="At least 8 characters"
          />

          {isSignup ? (
            <PasswordField
              autoComplete="new-password"
              label="Confirm password"
              name="passwordConfirmation"
              placeholder="Repeat your password"
            />
          ) : null}

          {!isSignup ? (
            <CheckboxField
              label="Keep me signed in on this device"
              name="remember"
            />
          ) : (
            <CheckboxField
              align="start"
              label={
                <>
                  I agree to the workspace terms and understand this is a local
                  UI preview.
                </>
              }
              name="terms"
            />
          )}

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
            className="group flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-[var(--ink)] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_-16px_rgba(24,33,27,0.85)] transition hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-soft)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting || isRegistering}
            type="submit"
          >
            {isSignup ? "Create workspace" : "Continue"}
            <span
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-1"
            >
              →
            </span>
          </button>
        </Form>
      )}
    </Formik>
  );
}
