import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { AuthForm } from "../components/auth/auth-form";

describe("AuthForm", () => {
  test("shows field-level validation after submitting an empty login", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);

    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByText("Enter your email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("shows an honest local-only status after a valid login submission", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);

    await user.type(screen.getByLabelText(/email/i), "person@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "A secure password");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByRole("status")).toHaveTextContent(
      /backend.*not connected/i,
    );
  });

  test("rejects mismatched signup passwords without submitting", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="signup" />);

    await user.type(screen.getByLabelText(/full name/i), "Rakib Hasan");
    await user.type(screen.getByLabelText(/work email/i), "person@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "A secure password");
    await user.type(
      screen.getByLabelText(/confirm password/i),
      "A different password",
    );
    await user.click(screen.getByLabelText(/workspace terms/i));
    await user.click(
      screen.getByRole("button", { name: /create workspace/i }),
    );

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
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
