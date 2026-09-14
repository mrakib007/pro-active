import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { StoreProvider } from "../components/providers/store-provider";
import WorkspaceMembersPage from "../app/workspace/[workspaceId]/members/page";

const router = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ workspaceId: "workspace-1" }),
  useRouter: () => router,
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

const workspace = {
  id: "workspace-1",
  name: "Product Team",
  createdAt: "2026-09-06T00:00:00.000Z",
  updatedAt: "2026-09-06T00:00:00.000Z",
  role: "OWNER" as const,
};

const owner = {
  id: "membership-1",
  workspaceId: "workspace-1",
  userId: "user-1",
  fullName: "Rakib Hasan",
  email: "rakib@example.com",
  role: "OWNER" as const,
  createdAt: "2026-09-06T00:00:00.000Z",
};

const member = {
  id: "membership-2",
  workspaceId: "workspace-1",
  userId: "user-2",
  fullName: "Nadia Ahmed",
  email: "nadia@example.com",
  role: "MEMBER" as const,
  createdAt: "2026-09-07T00:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "pro_active_csrf=; Max-Age=0; path=/";
  router.replace.mockReset();
});

function renderPage() {
  return render(
    <StoreProvider>
      <WorkspaceMembersPage />
    </StoreProvider>,
  );
}

describe("WorkspaceMembersPage", () => {
  test("lists workspace members and shows management controls to an owner", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo) => {
      const request = input as Request;
      const path = new URL(request.url).pathname;

      if (path.endsWith("/workspaces") && request.method === "GET") {
        return Promise.resolve(
          jsonResponse({
            status: "ok",
            data: { workspaces: [workspace] },
          }),
        );
      }

      return Promise.resolve(
        jsonResponse({
          status: "ok",
          data: { members: [owner, member] },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    expect(
      await screen.findByRole("heading", { name: /workspace members/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Product Team")).toBeInTheDocument();
    expect(screen.getByText("Nadia Ahmed")).toBeInTheDocument();
    expect(screen.getByLabelText("Member email")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add member/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /remove nadia ahmed/i }),
    ).toBeInTheDocument();
  });

  test("adds a member and refreshes the list", async () => {
    const addedMember = {
      ...member,
      id: "membership-3",
      userId: "user-3",
      fullName: "Fahim Rahman",
      email: "fahim@example.com",
    };
    let members = [owner, member];
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo) => {
      const request = input as Request;
      const path = new URL(request.url).pathname;

      if (request.method === "POST") {
        return Promise.resolve(
          jsonResponse(
            {
              status: "ok",
              data: { membership: addedMember },
            },
            201,
          ),
        );
      }

      if (path.endsWith("/workspaces") && request.method === "GET") {
        return Promise.resolve(
          jsonResponse({
            status: "ok",
            data: { workspaces: [workspace] },
          }),
        );
      }

      members = members.includes(addedMember) ? members : [...members, addedMember];
      return Promise.resolve(
        jsonResponse({
          status: "ok",
          data: { members },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "pro_active_csrf=csrf-token; path=/";

    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText("Member email"), "fahim@example.com");
    await user.click(screen.getByRole("button", { name: /add member/i }));

    expect(await screen.findByText("Fahim Rahman")).toBeInTheDocument();
    const requests = fetchMock.mock.calls.map(([input]) => input as Request);
    const addRequest = requests.find(
      (request) =>
        request.method === "POST" &&
        new URL(request.url).pathname.endsWith("/workspaces/workspace-1/members"),
    );

    expect(addRequest).toBeDefined();
    expect(addRequest?.headers.get("X-CSRF-Token")).toBe("csrf-token");
    expect(await addRequest?.clone().json()).toEqual({
      email: "fahim@example.com",
      role: "MEMBER",
    });
  });

  test("hides management controls from a regular member", async () => {
    const memberWorkspace = { ...workspace, role: "MEMBER" as const };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo) => {
      const request = input as Request;
      const path = new URL(request.url).pathname;

      if (path.endsWith("/workspaces") && request.method === "GET") {
        return Promise.resolve(
          jsonResponse({
            status: "ok",
            data: { workspaces: [memberWorkspace] },
          }),
        );
      }

      return Promise.resolve(
        jsonResponse({
          status: "ok",
          data: { members: [owner, member] },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    await screen.findByText("Nadia Ahmed");
    expect(screen.queryByLabelText("Member email")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /add member/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /remove nadia ahmed/i }),
    ).not.toBeInTheDocument();
  });
});
