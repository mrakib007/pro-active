import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { StoreProvider } from "../components/providers/store-provider";
import WorkspaceProjectsPage from "../app/workspace/[workspaceId]/projects/page";

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

const project = {
  id: "project-1",
  workspaceId: "workspace-1",
  name: "Editorial launch",
  description: "Prepare the next release.",
  createdAt: "2026-09-14T00:00:00.000Z",
  updatedAt: "2026-09-14T00:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "pro_active_csrf=; Max-Age=0; path=/";
  router.replace.mockReset();
});

function renderPage() {
  return render(
    <StoreProvider>
      <WorkspaceProjectsPage />
    </StoreProvider>,
  );
}

function makeFetchMock(
  workspaceRole: "OWNER" | "ADMIN" | "MEMBER" = "OWNER",
  projects = [project],
) {
  const currentWorkspace = { ...workspace, role: workspaceRole };
  return vi.fn().mockImplementation((input: RequestInfo) => {
    const request = input as Request;
    const path = new URL(request.url).pathname;

    if (path.endsWith("/workspaces") && request.method === "GET") {
      return Promise.resolve(
        jsonResponse({
          status: "ok",
          data: { workspaces: [currentWorkspace] },
        }),
      );
    }

    return Promise.resolve(
      jsonResponse({
        status: "ok",
        data: { projects },
      }),
    );
  });
}

describe("WorkspaceProjectsPage", () => {
  test("lists persisted projects and shows owner controls", async () => {
    vi.stubGlobal("fetch", makeFetchMock());

    renderPage();

    expect(
      await screen.findByRole("heading", { name: /workspace projects/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Editorial launch")).toBeInTheDocument();
    expect(screen.getByText("Prepare the next release.")).toBeInTheDocument();
    expect(screen.getByLabelText("Project name")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create project/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /edit editorial launch/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /delete editorial launch/i }),
    ).toBeInTheDocument();
  });

  test("creates a project with the CSRF header and refreshes the list", async () => {
    const createdProject = {
      ...project,
      id: "project-2",
      name: "Research sprint",
      description: "Turn customer signals into decisions.",
    };
    let projects = [project];
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo) => {
      const request = input as Request;
      const path = new URL(request.url).pathname;

      if (request.method === "POST") {
        return Promise.resolve(
          jsonResponse(
            { status: "ok", data: { project: createdProject } },
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

      projects = projects.includes(createdProject)
        ? projects
        : [...projects, createdProject];
      return Promise.resolve(
        jsonResponse({
          status: "ok",
          data: { projects },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "pro_active_csrf=csrf-token; path=/";

    const user = userEvent.setup();
    renderPage();

    await user.type(
      await screen.findByLabelText("Project name"),
      "Research sprint",
    );
    await user.type(
      screen.getByLabelText("Project description"),
      "Turn customer signals into decisions.",
    );
    await user.click(screen.getByRole("button", { name: /create project/i }));

    expect(await screen.findByText("Research sprint")).toBeInTheDocument();
    const requests = fetchMock.mock.calls.map(([input]) => input as Request);
    const createRequest = requests.find(
      (request) =>
        request.method === "POST" &&
        new URL(request.url)
          .pathname.endsWith("/workspaces/workspace-1/projects"),
    );

    expect(createRequest).toBeDefined();
    expect(createRequest?.headers.get("X-CSRF-Token")).toBe("csrf-token");
    expect(await createRequest?.clone().json()).toEqual({
      name: "Research sprint",
      description: "Turn customer signals into decisions.",
    });
  });

  test("updates a project through the workspace-scoped endpoint", async () => {
    const updatedProject = { ...project, name: "Editorial launch v2" };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo) => {
      const request = input as Request;
      const path = new URL(request.url).pathname;

      if (request.method === "PATCH") {
        return Promise.resolve(
          jsonResponse({ status: "ok", data: { project: updatedProject } }),
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

      return Promise.resolve(
        jsonResponse({
          status: "ok",
          data: { projects: [updatedProject] },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "pro_active_csrf=csrf-token; path=/";

    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", {
        name: /edit editorial launch/i,
      }),
    );
    const nameInput = screen.getByLabelText("Edit project name");
    await user.clear(nameInput);
    await user.type(nameInput, "Editorial launch v2");
    await user.click(screen.getByRole("button", { name: /save project/i }));

    expect(await screen.findByText("Editorial launch v2")).toBeInTheDocument();
    const updateRequest = fetchMock.mock.calls
      .map(([input]) => input as Request)
      .find((request) => request.method === "PATCH");
    expect(new URL(updateRequest!.url).pathname).toBe(
      "/api/backend/workspaces/workspace-1/projects/project-1",
    );
    expect(await updateRequest!.clone().json()).toEqual({
      name: "Editorial launch v2",
      description: "Prepare the next release.",
    });
  });

  test("deletes a project through the workspace-scoped endpoint", async () => {
    let projects = [project];
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo) => {
      const request = input as Request;
      const path = new URL(request.url).pathname;

      if (request.method === "DELETE") {
        projects = [];
        return Promise.resolve(new Response(null, { status: 204 }));
      }

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
          data: { projects },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "pro_active_csrf=csrf-token; path=/";

    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", {
        name: /delete editorial launch/i,
      }),
    );

    await waitFor(() =>
      expect(
        screen.queryByText("Editorial launch"),
      ).not.toBeInTheDocument(),
    );
    const deleteRequest = fetchMock.mock.calls
      .map(([input]) => input as Request)
      .find((request) => request.method === "DELETE");
    expect(new URL(deleteRequest!.url).pathname).toBe(
      "/api/backend/workspaces/workspace-1/projects/project-1",
    );
    expect(deleteRequest!.headers.get("X-CSRF-Token")).toBe("csrf-token");
  });

  test("shows projects but hides mutation controls from a regular member", async () => {
    vi.stubGlobal("fetch", makeFetchMock("MEMBER"));

    renderPage();

    await screen.findByText("Editorial launch");
    expect(screen.queryByLabelText("Project name")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create project/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit editorial launch/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /delete editorial launch/i }),
    ).not.toBeInTheDocument();
  });
});
