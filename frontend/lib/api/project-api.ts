import { baseApi } from "./base-api";

export type WorkspaceProject = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectInput = {
  name: string;
  description?: string;
};

export type ListProjectsResponse = {
  status: "ok";
  data: {
    projects: WorkspaceProject[];
  };
};

export type ProjectResponse = {
  status: "ok";
  data: {
    project: WorkspaceProject;
  };
};

export const projectApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProjects: build.query<ListProjectsResponse, string>({
      providesTags: (_result, _error, workspaceId) => [
        { type: "Project", id: workspaceId },
      ],
      query: (workspaceId) =>
        "workspaces/" + encodeURIComponent(workspaceId) + "/projects",
    }),
    createProject: build.mutation<
      ProjectResponse,
      { workspaceId: string; body: ProjectInput }
    >({
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: "Project", id: workspaceId },
      ],
      query: ({ workspaceId, body }) => ({
        body,
        method: "POST",
        url:
          "workspaces/" +
          encodeURIComponent(workspaceId) +
          "/projects",
      }),
    }),
    updateProject: build.mutation<
      ProjectResponse,
      {
        workspaceId: string;
        projectId: string;
        body: ProjectInput;
      }
    >({
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: "Project", id: workspaceId },
      ],
      query: ({ workspaceId, projectId, body }) => ({
        body,
        method: "PATCH",
        url:
          "workspaces/" +
          encodeURIComponent(workspaceId) +
          "/projects/" +
          encodeURIComponent(projectId),
      }),
    }),
    deleteProject: build.mutation<
      void,
      { workspaceId: string; projectId: string }
    >({
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: "Project", id: workspaceId },
      ],
      query: ({ workspaceId, projectId }) => ({
        method: "DELETE",
        url:
          "workspaces/" +
          encodeURIComponent(workspaceId) +
          "/projects/" +
          encodeURIComponent(projectId),
      }),
    }),
  }),
});

export const {
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useGetProjectsQuery,
  useUpdateProjectMutation,
} = projectApi;
