import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { AuthForm } from "../components/auth/auth-form";
import { StoreProvider } from "../components/providers/store-provider";

const router = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

function renderAuthForm(mode: "login" | "signup") {
  return render(
    <StoreProvider>
      <AuthForm mode={mode} />
    </StoreProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  router.replace.mockReset();
});

describe("AuthForm", () => {
  test("shows field-level validation after submitting an empty login", async () => {
    const user = userEvent.setup();
    renderAuthForm("login");

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

  test("logs in through the backend and navigates to the workspace", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "ok",
          data: {
            user: {
              id: "user-1",
              fullName: "Rakib Hasan",
              email: "person@example.com",
              createdAt: "2026-09-03T00:00:00.000Z",
            },
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderAuthForm("login");

    await user.type(screen.getByLabelText(/email/i), "person@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "A secure password");
    expect(
      screen.getByText(/keep me signed in for 7 days/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/workspace"),
    );

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.method).toBe("POST");
    expect(await request.clone().json()).toEqual({
      email: "person@example.com",
      password: "A secure password",
    });
  });

  test("rejects mismatched signup passwords without submitting", async () => {
    const user = userEvent.setup();
    renderAuthForm("signup");

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
    renderAuthForm("login");
    const password = screen.getByLabelText(/^password$/i);

    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(password).toHaveAttribute("type", "text");
  });

  test("submits signup data to the backend and shows success", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "ok",
          data: {
            user: {
              id: "user-1",
              fullName: "Rakib Hasan",
              email: "rakib@example.com",
              createdAt: "2026-09-03T00:00:00.000Z",
            },
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 201,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderAuthForm("signup");

    await user.type(screen.getByLabelText(/full name/i), "Rakib Hasan");
    await user.type(screen.getByLabelText(/work email/i), "rakib@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "A secure password");
    await user.type(
      screen.getByLabelText(/confirm password/i),
      "A secure password",
    );
    await user.click(screen.getByLabelText(/workspace terms/i));
    await user.click(
      screen.getByRole("button", { name: /create workspace/i }),
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/account created/i),
    );

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.method).toBe("POST");
    expect(await request.clone().json()).toEqual({
      fullName: "Rakib Hasan",
      email: "rakib@example.com",
      password: "A secure password",
    });
  });
});
