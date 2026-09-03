import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { Provider } from "react-redux";
import { afterEach, describe, expect, test, vi } from "vitest";
import { StoreProvider } from "../components/providers/store-provider";
import { authApi } from "../lib/api/auth-api";
import { makeStore } from "../lib/store";

const router = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

async function loadWorkspacePage() {
  const workspacePagePath = "../app/workspace/page";

  try {
    const loadedModule = await import(/* @vite-ignore */ workspacePagePath);
    return { error: null, module: loadedModule };
  } catch (error: unknown) {
    return { error, module: null };
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  router.replace.mockReset();
});

describe("WorkspacePage", () => {
  test("renders the calm workspace shell with navigation and overview sections", async () => {
    const workspace = await loadWorkspacePage();
    expect(workspace.error).toBeNull();

    if (!workspace.module) return;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
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
      ),
    );

    const WorkspacePage = workspace.module.default as ComponentType;
    render(
      <StoreProvider>
        <WorkspacePage />
      </StoreProvider>,
    );

    expect(await screen.findByRole("heading", { name: /good morning, rakib/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /inbox/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^projects$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new page/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /my day/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /recent pages/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /project pulse/i })).toBeInTheDocument();
  });

  test("loads and displays the authenticated user from the session endpoint", async () => {
    const workspace = await loadWorkspacePage();
    expect(workspace.error).toBeNull();

    if (!workspace.module) return;

    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
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
    );
    vi.stubGlobal("fetch", fetchMock);

    const WorkspacePage = workspace.module.default as ComponentType;
    render(
      <StoreProvider>
        <WorkspacePage />
      </StoreProvider>,
    );

    expect(await screen.findByRole("heading", { name: /rakib hasan/i })).toBeInTheDocument();
    expect(screen.getAllByText("rakib@example.com")).toHaveLength(2);
    expect(screen.getByText(/session verified/i)).toBeInTheDocument();

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(new URL(request.url).pathname).toBe("/api/backend/auth/me");
    expect(request.method).toBe("GET");
  });

  test("does not show cached identity while the session is revalidated", async () => {
    const workspace = await loadWorkspacePage();
    expect(workspace.error).toBeNull();

    if (!workspace.module) return;

    let resolveRefresh!: (response: Response) => void;
    const refreshResponse = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
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
      )
      .mockImplementationOnce(() => refreshResponse);
    vi.stubGlobal("fetch", fetchMock);

    const store = makeStore();
    const WorkspacePage = workspace.module.default as ComponentType;
    const { unmount } = render(
      <Provider store={store}>
        <WorkspacePage />
      </Provider>,
    );

    await screen.findByRole("heading", { name: /rakib hasan/i });
    const refresh = store.dispatch(
      authApi.endpoints.getCurrentUser.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(
      screen.queryByRole("heading", { name: /rakib hasan/i }),
    ).not.toBeInTheDocument();

    resolveRefresh(
      jsonResponse({
        status: "ok",
        data: {
          user: {
            id: "user-1",
            fullName: "Amina Rahman",
            email: "amina@example.com",
            createdAt: "2026-09-03T00:00:00.000Z",
          },
        },
      }),
    );

    expect(await screen.findByRole("heading", { name: /amina rahman/i })).toBeInTheDocument();
    refresh.unsubscribe();
    unmount();
  });

  test("logs out by revoking the session before returning to login", async () => {
    const workspace = await loadWorkspacePage();
    expect(workspace.error).toBeNull();

    if (!workspace.module) return;

    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
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
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const WorkspacePage = workspace.module.default as ComponentType;
    render(
      <StoreProvider>
        <WorkspacePage />
      </StoreProvider>,
    );

    await screen.findByRole("heading", { name: /rakib hasan/i });
    await user.click(screen.getByRole("button", { name: /sign out/i }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const logoutRequest = fetchMock.mock.calls[1]?.[0] as Request;
    expect(new URL(logoutRequest.url).pathname).toBe(
      "/api/backend/auth/logout",
    );
    expect(logoutRequest.method).toBe("POST");
  });

  test("redirects to login when the session endpoint returns unauthorized", async () => {
    const workspace = await loadWorkspacePage();
    expect(workspace.error).toBeNull();

    if (!workspace.module) return;

    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          status: "error",
          code: "AUTHENTICATION_REQUIRED",
          message: "Authentication required",
        },
        401,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const WorkspacePage = workspace.module.default as ComponentType;
    render(
      <StoreProvider>
        <WorkspacePage />
      </StoreProvider>,
    );

    expect(await screen.findByText(/returning you to sign in/i)).toBeInTheDocument();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
  });
});
