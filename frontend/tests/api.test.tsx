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
