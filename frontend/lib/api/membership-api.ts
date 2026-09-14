import { baseApi } from "./base-api";

export type MembershipRole = "OWNER" | "ADMIN" | "MEMBER";
export type EditableMembershipRole = "ADMIN" | "MEMBER";

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string;
  fullName: string;
  email: string;
  role: MembershipRole;
  createdAt: string;
};

export type ListMembersResponse = {
  status: "ok";
  data: {
    members: WorkspaceMember[];
  };
};

export type CreateMemberRequest = {
  email: string;
  role: EditableMembershipRole;
};

export type CreateMemberResponse = {
  status: "ok";
  data: {
    membership: WorkspaceMember;
  };
};

export type UpdateMemberRoleResponse = CreateMemberResponse;

export const membershipApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMembers: build.query<ListMembersResponse, string>({
      providesTags: (_result, _error, workspaceId) => [
        { type: "Membership", id: workspaceId },
      ],
      query: (workspaceId) =>
        "workspaces/" + encodeURIComponent(workspaceId) + "/members",
    }),
    addMember: build.mutation<
      CreateMemberResponse,
      { workspaceId: string; body: CreateMemberRequest }
    >({
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: "Membership", id: workspaceId },
      ],
      query: ({ workspaceId, body }) => ({
        body,
        method: "POST",
        url:
          "workspaces/" +
          encodeURIComponent(workspaceId) +
          "/members",
      }),
    }),
    updateMemberRole: build.mutation<
      UpdateMemberRoleResponse,
      {
        workspaceId: string;
        membershipId: string;
        role: EditableMembershipRole;
      }
    >({
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: "Membership", id: workspaceId },
      ],
      query: ({ workspaceId, membershipId, role }) => ({
        body: { role },
        method: "PATCH",
        url:
          "workspaces/" +
          encodeURIComponent(workspaceId) +
          "/members/" +
          encodeURIComponent(membershipId),
      }),
    }),
    removeMember: build.mutation<
      void,
      { workspaceId: string; membershipId: string }
    >({
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: "Membership", id: workspaceId },
      ],
      query: ({ workspaceId, membershipId }) => ({
        method: "DELETE",
        url:
          "workspaces/" +
          encodeURIComponent(workspaceId) +
          "/members/" +
          encodeURIComponent(membershipId),
      }),
    }),
  }),
});

export const {
  useAddMemberMutation,
  useGetMembersQuery,
  useRemoveMemberMutation,
  useUpdateMemberRoleMutation,
} = membershipApi;
