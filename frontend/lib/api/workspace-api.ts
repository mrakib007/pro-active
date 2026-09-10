import { baseApi } from "./base-api";

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";

export type Workspace = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceSummary = Workspace & {
  role: WorkspaceRole;
};

export type WorkspaceMembership = {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
};

export type CreateWorkspaceRequest = {
  name: string;
};

export type CreateWorkspaceResponse = {
  status: "ok";
  data: {
    workspace: Workspace;
    membership: WorkspaceMembership;
  };
};

export type ListWorkspacesResponse = {
  status: "ok";
  data: {
    workspaces: WorkspaceSummary[];
  };
};

export const workspaceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWorkspaces: build.query<ListWorkspacesResponse, void>({
      providesTags: ["Workspace"],
      query: () => "workspaces",
    }),
    createWorkspace: build.mutation<
      CreateWorkspaceResponse,
      CreateWorkspaceRequest
    >({
      invalidatesTags: ["Workspace"],
      query: (body) => ({
        body,
        method: "POST",
        url: "workspaces",
      }),
    }),
  }),
});

export const {
  useCreateWorkspaceMutation,
  useGetWorkspacesQuery,
} = workspaceApi;
