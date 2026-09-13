import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const csrfCookieName = "pro_active_csrf";

function readCsrfToken(): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }

  const cookiePrefix = `${csrfCookieName}=`;
  const cookie = document.cookie
    .split("; ")
    .find((value) => value.startsWith(cookiePrefix));

  if (!cookie) {
    return undefined;
  }

  return decodeURIComponent(cookie.slice(cookiePrefix.length));
}

export const apiTagTypes = [
  "User",
  "Workspace",
  "Project",
  "Task",
  "Comment",
] as const;

export type ApiTagType = (typeof apiTagTypes)[number];

export const baseApi = createApi({
  reducerPath: "proActiveApi",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "/api/backend",
    credentials: "include",
    prepareHeaders: (headers) => {
      const csrfToken = readCsrfToken();

      if (csrfToken) {
        headers.set("X-CSRF-Token", csrfToken);
      }

      return headers;
    },
  }),
  tagTypes: [...apiTagTypes],
  endpoints: () => ({}),
});
