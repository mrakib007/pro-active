import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { WorkspaceCreator } from "../components/workspace/workspace-creator";
import { StoreProvider } from "../components/providers/store-provider";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

const persistedWorkspace = {
  id: "workspace-1",
  name: "Product Team",
  createdAt: "2026-09-06T00:00:00.000Z",
  updatedAt: "2026-09-06T00:00:00.000Z",
  role: "OWNER",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("WorkspaceCreator", () => {
  test("loads persisted workspaces from the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "ok",
        data: { workspaces: [persistedWorkspace] },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <StoreProvider>
        <WorkspaceCreator />
      </StoreProvider>,
    );

    expect(await screen.findByText("Product Team")).toBeInTheDocument();
    expect(screen.getByText("OWNER")).toBeInTheDocument();

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(new URL(request.url).pathname).toBe("/api/backend/workspaces");
    expect(request.method).toBe("GET");
  });

  test("refreshes the persisted list after creating a workspace", async () => {
    const newWorkspace = {
      ...persistedWorkspace,
      id: "workspace-2",
      name: "Design Team",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          status: "ok",
          data: { workspaces: [] },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            status: "ok",
            data: {
              workspace: {
                id: newWorkspace.id,
                name: newWorkspace.name,
                createdAt: newWorkspace.createdAt,
                updatedAt: newWorkspace.updatedAt,
              },
              membership: {
                id: "membership-2",
                workspaceId: newWorkspace.id,
                userId: "user-1",
                role: newWorkspace.role,
                createdAt: newWorkspace.createdAt,
              },
            },
          },
          201,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: "ok",
          data: { workspaces: [newWorkspace] },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(
      <StoreProvider>
        <WorkspaceCreator />
      </StoreProvider>,
    );

    await user.type(screen.getByLabelText("Workspace name"), "Design Team");
    await user.click(screen.getByRole("button", { name: /create workspace/i }));

    await waitFor(() =>
      expect(screen.getByText("Design Team")).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const requests = fetchMock.mock.calls.map(([input]) => input as Request);
    expect(requests[0].method).toBe("GET");
    expect(requests[1].method).toBe("POST");
    expect(new URL(requests[1].url).pathname).toBe(
      "/api/backend/workspaces",
    );
    expect(requests[2].method).toBe("GET");
  });
});
