import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

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
  }),
  tagTypes: [...apiTagTypes],
  endpoints: () => ({}),
});
