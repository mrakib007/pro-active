"use client";

import { useState, type FormEvent } from "react";
import {
  useCreateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  useGetWorkspacesQuery,
  useUpdateWorkspaceMutation,
  type WorkspaceSummary,
} from "../../lib/api/workspace-api";

const MAX_WORKSPACE_NAME_LENGTH = 100;

function readApiErrorMessage(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return null;
  }

  const data = error.data;

  if (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof data.message === "string"
  ) {
    return data.message;
  }

  return null;
}

export function WorkspaceCreator() {
  const [workspaceName, setWorkspaceName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const {
    data: workspacesResponse,
    isError: isWorkspacesError,
    isLoading: isLoadingWorkspaces,
  } = useGetWorkspacesQuery();
  const [createWorkspace, { isLoading }] = useCreateWorkspaceMutation();
  const [updateWorkspace, { isLoading: isUpdating }] =
    useUpdateWorkspaceMutation();
  const [deleteWorkspace, { isLoading: isDeleting }] =
    useDeleteWorkspaceMutation();
  const workspaces = workspacesResponse?.data.workspaces ?? [];
  const [viewedWorkspace, setViewedWorkspace] =
    useState<WorkspaceSummary | null>(null);
  const [editingWorkspace, setEditingWorkspace] =
    useState<WorkspaceSummary | null>(null);
  const [workspaceNameDraft, setWorkspaceNameDraft] = useState("");
  const [workspaceToDelete, setWorkspaceToDelete] =
    useState<WorkspaceSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function handleViewWorkspace(workspace: WorkspaceSummary) {
    setViewedWorkspace(workspace);
    setActionError(null);
  }

  function handleStartEditing(workspace: WorkspaceSummary) {
    setEditingWorkspace(workspace);
    setWorkspaceNameDraft(workspace.name);
    setActionError(null);
    setNotice(null);
  }

  function handleCancelEditing() {
    setEditingWorkspace(null);
    setWorkspaceNameDraft("");
    setActionError(null);
  }

  async function handleUpdateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingWorkspace) {
      return;
    }

    setActionError(null);
    setNotice(null);

    const name = workspaceNameDraft.trim();

    if (!name) {
      setActionError("Workspace name is required.");
      return;
    }

    if (name.length > MAX_WORKSPACE_NAME_LENGTH) {
      setActionError("Workspace name is too long.");
      return;
    }

    try {
      await updateWorkspace({
        workspaceId: editingWorkspace.id,
        body: { name },
      }).unwrap();
      setEditingWorkspace(null);
      setWorkspaceNameDraft("");
      setNotice("Workspace “" + name + "” updated.");
    } catch (error: unknown) {
      setActionError(
        readApiErrorMessage(error) ??
          "We could not update the workspace. Please try again.",
      );
    }
  }

  function handleRequestDelete(workspace: WorkspaceSummary) {
    setWorkspaceToDelete(workspace);
    setActionError(null);
    setNotice(null);
  }

  function handleCancelDelete() {
    setWorkspaceToDelete(null);
    setActionError(null);
  }

  async function handleConfirmDelete() {
    if (!workspaceToDelete) {
      return;
    }

    const workspace = workspaceToDelete;
    setActionError(null);
    setNotice(null);

    try {
      await deleteWorkspace(workspace.id).unwrap();
      setWorkspaceToDelete(null);
      setViewedWorkspace((current) =>
        current?.id === workspace.id ? null : current,
      );
      setNotice("Workspace “" + workspace.name + "” deleted.");
    } catch (error: unknown) {
      setActionError(
        readApiErrorMessage(error) ??
          "We could not delete the workspace. Please try again.",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    setNotice(null);

    const name = workspaceName.trim();

    if (!name) {
      setValidationError("Workspace name is required.");
      return;
    }

    if (name.length > MAX_WORKSPACE_NAME_LENGTH) {
      setValidationError("Workspace name is too long.");
      return;
    }

    try {
      const response = await createWorkspace({ name }).unwrap();

      setWorkspaceName("");
      setNotice(`Workspace “${response.data.workspace.name}” created.`);
    } catch (error: unknown) {
      setNotice(
        readApiErrorMessage(error) ??
          "We could not create the workspace. Please try again.",
      );
    }
  }

  return (
    <section
      aria-labelledby="create-workspace-heading"
      className="mt-10 rounded-lg border border-[#e1e2dc] bg-[#fbfbf9] p-5 sm:p-6"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#a0a19a]">
        Backend exercise
      </p>
      <h2
        className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-[#262823]"
        id="create-workspace-heading"
      >
        Create a workspace
      </h2>
      <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#777970]">
        This creates a workspace and makes your account its owner through a
        membership record.
      </p>

      <form
        className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
        noValidate
        onSubmit={handleSubmit}
      >
        <div className="min-w-0 flex-1">
          <label
            className="block text-[12px] font-semibold text-[#4c4e48]"
            htmlFor="workspace-name"
          >
            Workspace name
          </label>
          <input
            className="mt-2 h-11 w-full rounded-md border border-[#d7d8d1] bg-white px-3 text-sm text-[#262823] outline-none transition placeholder:text-[#a0a19a] focus:border-[#8d998e] focus:ring-4 focus:ring-[#dfe6df]"
            id="workspace-name"
            maxLength={MAX_WORKSPACE_NAME_LENGTH}
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="e.g. Product Team"
            value={workspaceName}
          />
        </div>
        <button
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md bg-[#262823] px-5 text-[13px] font-semibold text-white transition hover:bg-[#3c403a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d9d4c6] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? "Creating…" : "Create workspace"}
        </button>
      </form>

      {validationError ? (
        <p
          aria-live="polite"
          className="mt-3 text-sm font-medium text-[#a4493d]"
          role="alert"
        >
          {validationError}
        </p>
      ) : null}

      {notice ? (
        <p
          aria-live="polite"
          className="mt-3 text-sm font-medium text-[#47705d]"
          role="status"
        >
          {notice}
        </p>
      ) : null}

      {actionError ? (
        <p
          aria-live="polite"
          className="mt-3 text-sm font-medium text-[#a4493d]"
          role="alert"
        >
          {actionError}
        </p>
      ) : null}

      {workspaceToDelete ? (
        <div
          aria-labelledby="delete-workspace-heading"
          className="mt-5 rounded-md border border-[#e2c99f] bg-[#f8f0e2] px-4 py-4 text-sm text-[#795d32]"
          role="alertdialog"
        >
          <p className="font-semibold" id="delete-workspace-heading">
            Delete “{workspaceToDelete.name}”?
          </p>
          <p className="mt-2 text-xs leading-5">
            This will permanently delete this workspace and its memberships.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="inline-flex h-9 items-center justify-center rounded-md bg-[#a4493d] px-3 text-xs font-semibold text-white transition hover:bg-[#8e3d34] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e2c99f] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isDeleting}
              onClick={() => void handleConfirmDelete()}
              type="button"
            >
              {isDeleting ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              className="inline-flex h-9 items-center justify-center rounded-md border border-[#d5bd91] bg-transparent px-3 text-xs font-semibold text-[#795d32] transition hover:bg-[#f3e7d1] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e2c99f] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isDeleting}
              onClick={handleCancelDelete}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {viewedWorkspace ? (
        <div
          aria-labelledby="view-workspace-heading"
          aria-modal="true"
          className="mt-5 rounded-md border border-[#dfe6df] bg-[#f1f5f1] px-4 py-4 text-sm text-[#4c4e48]"
          role="dialog"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6e786f]">
                Workspace details
              </p>
              <h3
                className="mt-1 text-base font-semibold text-[#262823]"
                id="view-workspace-heading"
              >
                {viewedWorkspace.name}
              </h3>
            </div>
            <button
              aria-label="Close workspace details"
              className="rounded-md px-2 py-1 text-xs font-semibold text-[#6e786f] transition hover:bg-[#dfe6df] hover:text-[#262823] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d9d4c6]"
              onClick={() => setViewedWorkspace(null)}
              type="button"
            >
              Close
            </button>
          </div>
          <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-[#6e786f]">Workspace ID</dt>
              <dd className="mt-1 break-all text-[#4c4e48]">
                {viewedWorkspace.id}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[#6e786f]">Your role</dt>
              <dd className="mt-1 text-[#4c4e48]">{viewedWorkspace.role}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      <div className="mt-5 rounded-md border border-[#dfe6df] bg-[#f1f5f1] px-4 py-3 text-sm text-[#4c4e48]">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold">Your workspaces</p>
          {isLoadingWorkspaces ? (
            <span className="text-xs text-[#6e786f]">Loading…</span>
          ) : null}
        </div>

        {isWorkspacesError ? (
          <p
            aria-live="polite"
            className="mt-3 text-xs font-medium text-[#a4493d]"
            role="status"
          >
            We could not load your workspaces. Please refresh and try again.
          </p>
        ) : null}

        {!isLoadingWorkspaces && !isWorkspacesError && workspaces.length === 0 ? (
          <p className="mt-3 text-xs text-[#6e786f]">
            No workspaces yet. Create one to get started.
          </p>
        ) : null}

        {workspaces.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {workspaces.map((workspace) => (
              <li
                className="rounded-md border border-[#dfe6df] bg-white px-3 py-2.5"
                key={workspace.id}
              >
                {editingWorkspace?.id === workspace.id ? (
                  <form
                    className="w-full"
                    noValidate
                    onSubmit={handleUpdateSubmit}
                  >
                    <label
                      className="block text-xs font-semibold text-[#4c4e48]"
                      htmlFor="edit-workspace-name"
                    >
                      Edit workspace name
                    </label>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input
                        className="h-9 min-w-0 flex-1 rounded-md border border-[#d7d8d1] bg-white px-3 text-sm text-[#262823] outline-none focus:border-[#8d998e] focus:ring-4 focus:ring-[#dfe6df]"
                        id="edit-workspace-name"
                        maxLength={MAX_WORKSPACE_NAME_LENGTH}
                        onChange={(event) =>
                          setWorkspaceNameDraft(event.target.value)
                        }
                        value={workspaceNameDraft}
                      />
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-md bg-[#262823] px-3 text-xs font-semibold text-white transition hover:bg-[#3c403a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d9d4c6] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isUpdating}
                        type="submit"
                      >
                        {isUpdating ? "Saving…" : "Save changes"}
                      </button>
                      <button
                        className="inline-flex h-9 items-center justify-center rounded-md border border-[#d7d8d1] bg-white px-3 text-xs font-semibold text-[#4c4e48] transition hover:bg-[#f4f4f0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d9d4c6] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isUpdating}
                        onClick={handleCancelEditing}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">
                          {workspace.name}
                        </p>
                        <span className="w-fit shrink-0 rounded-full bg-[#dfe6df] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#47705d]">
                          {workspace.role}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-[#6e786f]">
                        Workspace ID: {workspace.id}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        aria-label={"View " + workspace.name}
                        className="inline-flex h-8 items-center justify-center rounded-md border border-[#d7d8d1] bg-white px-2.5 text-xs font-semibold text-[#4c4e48] transition hover:bg-[#f4f4f0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d9d4c6]"
                        onClick={() => handleViewWorkspace(workspace)}
                        type="button"
                      >
                        View
                      </button>
                      {workspace.role !== "MEMBER" ? (
                        <button
                          aria-label={"Edit " + workspace.name}
                          className="inline-flex h-8 items-center justify-center rounded-md border border-[#d7d8d1] bg-white px-2.5 text-xs font-semibold text-[#4c4e48] transition hover:bg-[#f4f4f0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#d9d4c6]"
                          onClick={() => handleStartEditing(workspace)}
                          type="button"
                        >
                          Edit
                        </button>
                      ) : null}
                      {workspace.role === "OWNER" ? (
                        <button
                          aria-label={"Delete " + workspace.name}
                          className="inline-flex h-8 items-center justify-center rounded-md border border-[#e2c2bd] bg-white px-2.5 text-xs font-semibold text-[#a4493d] transition hover:bg-[#fbefed] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e2c99f]"
                          onClick={() => handleRequestDelete(workspace)}
                          type="button"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
