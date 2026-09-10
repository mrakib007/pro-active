"use client";

import { useState, type FormEvent } from "react";
import {
  useCreateWorkspaceMutation,
  useGetWorkspacesQuery,
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
  const workspaces = workspacesResponse?.data.workspaces ?? [];

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
                className="flex items-center justify-between gap-3 rounded-md border border-[#dfe6df] bg-white px-3 py-2.5"
                key={workspace.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{workspace.name}</p>
                  <p className="mt-1 truncate text-xs text-[#6e786f]">
                    Workspace ID: {workspace.id}
                  </p>
                </div>
                <span className="w-fit shrink-0 rounded-full bg-[#dfe6df] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#47705d]">
                  {workspace.role}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
