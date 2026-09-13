import { waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { afterEach, describe, expect, test, vi } from "vitest";
import { authApi } from "../lib/api/auth-api";
import { baseApi } from "../lib/api/base-api";
import {
  crudApi,
  itemTags,
  listTag,
} from "../lib/api/crud-api";

function createTestStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "pro_active_csrf=; Max-Age=0; path=/";
});

describe("frontend API layer", () => {
  test("registers a user through the backend contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          status: "ok",
          data: {
            user: {
              id: "user-1",
              fullName: "Rakib Hasan",
              email: "rakib@example.com",
              createdAt: "2026-09-03T00:00:00.000Z",
            },
          },
        },
        201,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const store = createTestStore();
    const result = await store.dispatch(
      authApi.endpoints.register.initiate({
        fullName: "Rakib Hasan",
        email: "rakib@example.com",
        password: "A secure password",
      }),
    ).unwrap();

    expect(result.data.user.email).toBe("rakib@example.com");

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(new URL(request.url).pathname).toBe(
      "/api/backend/auth/register",
    );
    expect(request.method).toBe("POST");
    expect(await request.clone().json()).toEqual({
      fullName: "Rakib Hasan",
      email: "rakib@example.com",
      password: "A secure password",
    });
  });

  test("logs in, reads the current user, and logs out through the backend contract", async () => {
    document.cookie = "pro_active_csrf=csrf-token; path=/";
    const user = {
      id: "user-1",
      fullName: "Rakib Hasan",
      email: "rakib@example.com",
      createdAt: "2026-09-03T00:00:00.000Z",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ status: "ok", data: { user } }))
      .mockResolvedValueOnce(jsonResponse({ status: "ok", data: { user } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const store = createTestStore();
    const loginResult = await store.dispatch(
      authApi.endpoints.login.initiate({
        email: "rakib@example.com",
        password: "A secure password",
      }),
    ).unwrap();
    const currentUserSubscription = store.dispatch(
      authApi.endpoints.getCurrentUser.initiate(),
    );
    const currentUserResult = await currentUserSubscription.unwrap();
    await store.dispatch(authApi.endpoints.logout.initiate()).unwrap();
    currentUserSubscription.unsubscribe();

    expect(loginResult.data.user.email).toBe("rakib@example.com");
    expect(currentUserResult.data.user.id).toBe("user-1");

    const requests = fetchMock.mock.calls.map(([input]) => input as Request);
    expect(new URL(requests[0].url).pathname).toBe(
      "/api/backend/auth/login",
    );
    expect(requests[0].method).toBe("POST");
    expect(requests[0].credentials).toBe("include");
    expect(await requests[0].clone().json()).toEqual({
      email: "rakib@example.com",
      password: "A secure password",
    });
    expect(new URL(requests[1].url).pathname).toBe(
      "/api/backend/auth/me",
    );
    expect(requests[1].method).toBe("GET");
    expect(new URL(requests[2].url).pathname).toBe(
      "/api/backend/auth/logout",
    );
    expect(requests[2].method).toBe("POST");
    expect(requests[2].headers.get("X-CSRF-Token")).toBe("csrf-token");
  });

  test("adds the CSRF token from the readable cookie to mutation requests", async () => {
    document.cookie = "pro_active_csrf=csrf-token; path=/";
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const store = createTestStore();
    await store.dispatch(authApi.endpoints.logout.initiate()).unwrap();

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.headers.get("X-CSRF-Token")).toBe("csrf-token");
  });

  test("builds generic CRUD requests from resource arguments", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => jsonResponse({ status: "ok" }));
    vi.stubGlobal("fetch", fetchMock);

    const store = createTestStore();

    const listSubscription = store.dispatch(
      crudApi.endpoints.getList.initiate({
        resource: "projects",
        tagType: "Project",
        params: { page: 2, archived: false },
      }),
    );
    await listSubscription.unwrap();
    listSubscription.unsubscribe();

    const itemSubscription = store.dispatch(
      crudApi.endpoints.getById.initiate({
        resource: "/projects/",
        tagType: "Project",
        id: "project-1",
      }),
    );
    await itemSubscription.unwrap();
    itemSubscription.unsubscribe();

    await store.dispatch(
      crudApi.endpoints.create.initiate({
        resource: "projects",
        tagType: "Project",
        body: { name: "Launch" },
        invalidatesTags: [listTag("Project")],
      }),
    ).unwrap();
    await store.dispatch(
      crudApi.endpoints.update.initiate({
        resource: "projects",
        tagType: "Project",
        id: "project-1",
        body: { name: "Launch v2" },
      }),
    ).unwrap();
    await store.dispatch(
      crudApi.endpoints.delete.initiate({
        resource: "projects",
        tagType: "Project",
        id: "project-1",
      }),
    ).unwrap();

    const requests = fetchMock.mock.calls.map(([input]) => input as Request);
    expect(new URL(requests[0].url).pathname).toBe("/api/backend/projects");
    expect(new URL(requests[0].url).search).toBe("?page=2&archived=false");
    expect(requests[0].method).toBe("GET");
    expect(new URL(requests[1].url).pathname).toBe(
      "/api/backend/projects/project-1",
    );
    expect(requests[1].method).toBe("GET");
    expect(requests[2].method).toBe("POST");
    expect(await requests[2].clone().json()).toEqual({ name: "Launch" });
    expect(requests[3].method).toBe("PATCH");
    expect(requests[4].method).toBe("DELETE");
  });

  test("supports list and item cache tags for invalidation", () => {
    expect(listTag("Project")).toEqual({ type: "Project", id: "LIST" });
    expect(itemTags("Project", "project-1")).toEqual([
      { type: "Project", id: "project-1" },
      { type: "Project", id: "LIST" },
    ]);
  });

  test("refetches an active list after a mutation invalidates its tag", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: [{ id: "project-1" }] }))
      .mockResolvedValueOnce(jsonResponse({ data: { id: "project-2" } }))
      .mockResolvedValueOnce(jsonResponse({ data: [{ id: "project-1" }, { id: "project-2" }] }));
    vi.stubGlobal("fetch", fetchMock);

    const store = createTestStore();
    const listSubscription = store.dispatch(
      crudApi.endpoints.getList.initiate({
        resource: "projects",
        tagType: "Project",
      }),
    );
    await listSubscription.unwrap();

    await store.dispatch(
      crudApi.endpoints.create.initiate({
        resource: "projects",
        tagType: "Project",
        body: { name: "Launch" },
        invalidatesTags: [listTag("Project")],
      }),
    ).unwrap();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    listSubscription.unsubscribe();
  });
});
