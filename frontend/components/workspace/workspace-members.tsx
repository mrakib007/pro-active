"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  useAddMemberMutation,
  useGetMembersQuery,
  useRemoveMemberMutation,
  useUpdateMemberRoleMutation,
  type EditableMembershipRole,
  type MembershipRole,
  type WorkspaceMember,
} from "../../lib/api/membership-api";
import {
  useGetWorkspacesQuery,
  type WorkspaceRole,
} from "../../lib/api/workspace-api";

function isUnauthorized(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 401
  );
}

function readApiErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = error.data;

    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }
  }

  return "The request could not be completed.";
}

function canManageTarget(
  actorRole: WorkspaceRole,
  targetRole: MembershipRole,
) {
  return (
    (actorRole === "OWNER" && targetRole !== "OWNER") ||
    (actorRole === "ADMIN" && targetRole === "MEMBER")
  );
}

function MemberInitials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e9e4d8] text-sm font-bold text-[#55544e]"
    >
      {initials}
    </span>
  );
}

function MemberRow({
  actorRole,
  member,
  isRemoving,
  isUpdating,
  onRemove,
  onRoleChange,
}: {
  actorRole: WorkspaceRole;
  member: WorkspaceMember;
  isRemoving: boolean;
  isUpdating: boolean;
  onRemove: (member: WorkspaceMember) => void;
  onRoleChange: (
    member: WorkspaceMember,
    role: EditableMembershipRole,
  ) => void;
}) {
  const canManage = canManageTarget(actorRole, member.role);

  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-[#e8e7e0] py-4 last:border-b-0">
      <MemberInitials name={member.fullName} />
      <div className="min-w-48 flex-1">
        <p className="font-semibold text-[#272a26]">{member.fullName}</p>
        <p className="text-sm text-[#777872]">{member.email}</p>
      </div>
      <span className="rounded-full bg-[#f0efe9] px-3 py-1 text-xs font-bold text-[#5f6059]">
        {member.role}
      </span>
      {canManage ? (
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={"role-" + member.id}>
            Role for {member.fullName}
          </label>
          <select
            aria-label={"Role for " + member.fullName}
            className="rounded-md border border-[#d7d8d1] bg-white px-2 py-1.5 text-sm text-[#4c4e48]"
            disabled={isUpdating || isRemoving}
            id={"role-" + member.id}
            onChange={(event) =>
              onRoleChange(
                member,
                event.target.value as EditableMembershipRole,
              )
            }
            value={member.role}
          >
            <option value="MEMBER">MEMBER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <button
            aria-label={"Remove " + member.fullName}
            className="rounded-md border border-[#e2b8ae] px-2.5 py-1.5 text-sm font-semibold text-[#9a4435] hover:bg-[#fff4f1] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isRemoving || isUpdating}
            onClick={() => onRemove(member)}
            type="button"
          >
            Remove
          </button>
        </div>
      ) : null}
    </li>
  );
}

export function WorkspaceMembers({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<EditableMembershipRole>("MEMBER");
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    data: workspacesResponse,
    error: workspacesError,
    isLoading: isLoadingWorkspaces,
  } = useGetWorkspacesQuery();
  const {
    data: membersResponse,
    error: membersError,
    isLoading: isLoadingMembers,
  } = useGetMembersQuery(workspaceId, { skip: !workspaceId });
  const [addMember, { isLoading: isAdding }] = useAddMemberMutation();
  const [updateMemberRole, { isLoading: isUpdating }] =
    useUpdateMemberRoleMutation();
  const [removeMember, { isLoading: isRemoving }] =
    useRemoveMemberMutation();

  useEffect(() => {
    if (isUnauthorized(workspacesError) || isUnauthorized(membersError)) {
      router.replace("/login");
    }
  }, [membersError, router, workspacesError]);

  const workspace = workspacesResponse?.data.workspaces.find(
    (item) => item.id === workspaceId,
  );
  const members = membersResponse?.data.members ?? [];
  const canManage = workspace?.role === "OWNER" || workspace?.role === "ADMIN";

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setActionError(null);

    if (!email.trim()) {
      setActionError("Enter a member email address.");
      return;
    }

    try {
      await addMember({
        body: { email: email.trim(), role },
        workspaceId,
      }).unwrap();
      setEmail("");
      setNotice("Member added successfully.");
    } catch (error: unknown) {
      setActionError(readApiErrorMessage(error));
    }
  }

  async function handleRoleChange(
    member: WorkspaceMember,
    nextRole: EditableMembershipRole,
  ) {
    setNotice(null);
    setActionError(null);

    try {
      await updateMemberRole({
        membershipId: member.id,
        role: nextRole,
        workspaceId,
      }).unwrap();
      setNotice("Member role updated.");
    } catch (error: unknown) {
      setActionError(readApiErrorMessage(error));
    }
  }

  async function handleRemoveMember(member: WorkspaceMember) {
    setNotice(null);
    setActionError(null);

    try {
      await removeMember({
        membershipId: member.id,
        workspaceId,
      }).unwrap();
      setNotice("Member removed.");
    } catch (error: unknown) {
      setActionError(readApiErrorMessage(error));
    }
  }

  if (isLoadingWorkspaces || isLoadingMembers) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="rounded-xl border border-[#e8e7e0] bg-white p-6 text-[#777872]">
          Loading the team…
        </p>
      </main>
    );
  }

  if (isUnauthorized(workspacesError) || isUnauthorized(membersError)) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="rounded-xl border border-[#e8e7e0] bg-white p-6 text-[#777872]">
          Returning you to sign in…
        </p>
      </main>
    );
  }

  if (!workspace || workspacesError || membersError) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <Link className="text-sm font-semibold text-[#6f5f3f]" href="/workspace">
          Back to workspaces
        </Link>
        <p className="mt-6 rounded-xl border border-[#e2b8ae] bg-[#fff8f6] p-6 text-[#9a4435]">
          We could not load this workspace.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link className="text-sm font-semibold text-[#6f5f3f]" href="/workspace">
        ← Back to workspaces
      </Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9a8c6d]">
            {workspace.name}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#272a26]">
            Workspace members
          </h1>
        </div>
        <span className="rounded-full bg-[#e9e4d8] px-3 py-1 text-xs font-bold text-[#5f6059]">
          Your role: {workspace.role}
        </span>
      </div>

      {notice ? (
        <p className="mt-5 rounded-lg bg-[#edf7ee] px-4 py-3 text-sm font-semibold text-[#367044]">
          {notice}
        </p>
      ) : null}
      {actionError ? (
        <p className="mt-5 rounded-lg bg-[#fff4f1] px-4 py-3 text-sm font-semibold text-[#9a4435]" role="alert">
          {actionError}
        </p>
      ) : null}

      {canManage ? (
        <form
          className="mt-8 rounded-xl border border-[#e8e7e0] bg-white p-5 shadow-sm"
          onSubmit={handleAddMember}
        >
          <h2 className="text-lg font-bold text-[#272a26]">Add a member</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div>
              <label
                className="text-sm font-semibold text-[#4c4e48]"
                htmlFor="member-email"
              >
                Member email
              </label>
              <input
                className="mt-1 w-full rounded-md border border-[#d7d8d1] px-3 py-2 text-[#272a26] outline-none focus:border-[#9a8c6d] focus:ring-2 focus:ring-[#e9e4d8]"
                id="member-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teammate@example.com"
                type="email"
                value={email}
              />
            </div>
            <div>
              <label
                className="text-sm font-semibold text-[#4c4e48]"
                htmlFor="member-role"
              >
                Role
              </label>
              <select
                className="mt-1 rounded-md border border-[#d7d8d1] bg-white px-3 py-2 text-[#272a26]"
                disabled={workspace.role === "ADMIN"}
                id="member-role"
                onChange={(event) =>
                  setRole(event.target.value as EditableMembershipRole)
                }
                value={role}
              >
                <option value="MEMBER">MEMBER</option>
                <option disabled={workspace.role !== "OWNER"} value="ADMIN">
                  ADMIN
                </option>
              </select>
            </div>
            <button
              className="rounded-md bg-[#6f5f3f] px-4 py-2 font-semibold text-white hover:bg-[#5d4f35] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isAdding}
              type="submit"
            >
              {isAdding ? "Adding…" : "Add member"}
            </button>
          </div>
        </form>
      ) : null}

      <section className="mt-8 rounded-xl border border-[#e8e7e0] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#272a26]">Members</h2>
          <span className="text-sm text-[#777872]">{members.length} total</span>
        </div>
        <ul className="mt-2">
          {members.map((member) => (
            <MemberRow
              actorRole={workspace.role}
              isRemoving={isRemoving}
              isUpdating={isUpdating}
              key={member.id}
              member={member}
              onRemove={handleRemoveMember}
              onRoleChange={handleRoleChange}
            />
          ))}
        </ul>
      </section>
    </main>
  );
}
