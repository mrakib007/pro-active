"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useGetProjectsQuery,
  useUpdateProjectMutation,
  type WorkspaceProject,
} from "../../lib/api/project-api";
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

function canManageProjects(role: WorkspaceRole) {
  return role === "OWNER" || role === "ADMIN";
}

function ProjectCard({
  canManage,
  isDeleting,
  isEditing,
  isUpdating,
  project,
  onCancelEdit,
  onDelete,
  onEdit,
  onSave,
}: {
  canManage: boolean;
  isDeleting: boolean;
  isEditing: boolean;
  isUpdating: boolean;
  project: WorkspaceProject;
  onCancelEdit: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");

  if (isEditing) {
    return (
      <li className="rounded-xl border border-[#d7d8d1] bg-[#fbfbf9] p-5">
        <form className="grid gap-4" onSubmit={onSave}>
          <div>
            <label
              className="text-sm font-semibold text-[#4c4e48]"
              htmlFor={"edit-project-name-" + project.id}
            >
              Edit project name
            </label>
            <input
              className="mt-1 w-full rounded-md border border-[#d7d8d1] px-3 py-2 text-[#272a26]"
              id={"edit-project-name-" + project.id}
              name="name"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </div>
          <div>
            <label
              className="text-sm font-semibold text-[#4c4e48]"
              htmlFor={"edit-project-description-" + project.id}
            >
              Edit project description
            </label>
            <textarea
              className="mt-1 min-h-20 w-full rounded-md border border-[#d7d8d1] px-3 py-2 text-[#272a26]"
              id={"edit-project-description-" + project.id}
              name="description"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-md bg-[#6f5f3f] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={isUpdating}
              type="submit"
            >
              {isUpdating ? "Saving…" : "Save project"}
            </button>
            <button
              className="rounded-md border border-[#d7d8d1] px-3 py-2 text-sm font-semibold text-[#4c4e48]"
              onClick={onCancelEdit}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-[#e8e7e0] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-[#272a26]">{project.name}</h3>
          <p className="mt-2 text-sm leading-6 text-[#777872]">
            {project.description ?? "No description yet."}
          </p>
        </div>
        <span className="rounded-full bg-[#e9e4d8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5f6059]">
          Project
        </span>
      </div>
      {canManage ? (
        <div className="mt-5 flex gap-2">
          <button
            aria-label={"Edit " + project.name}
            className="rounded-md border border-[#d7d8d1] px-3 py-1.5 text-sm font-semibold text-[#4c4e48] hover:bg-[#f4f4f0]"
            onClick={onEdit}
            type="button"
          >
            Edit
          </button>
          <button
            aria-label={"Delete " + project.name}
            className="rounded-md border border-[#e2b8ae] px-3 py-1.5 text-sm font-semibold text-[#9a4435] hover:bg-[#fff4f1] disabled:opacity-50"
            disabled={isDeleting}
            onClick={onDelete}
            type="button"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      ) : null}
    </li>
  );
}

export function WorkspaceProjects({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    data: workspacesResponse,
    error: workspacesError,
    isLoading: isLoadingWorkspaces,
  } = useGetWorkspacesQuery();
  const {
    data: projectsResponse,
    error: projectsError,
    isLoading: isLoadingProjects,
  } = useGetProjectsQuery(workspaceId, { skip: !workspaceId });
  const [createProject, { isLoading: isCreating }] =
    useCreateProjectMutation();
  const [updateProject, { isLoading: isUpdating }] =
    useUpdateProjectMutation();
  const [deleteProject, { isLoading: isDeleting }] =
    useDeleteProjectMutation();

  useEffect(() => {
    if (isUnauthorized(workspacesError) || isUnauthorized(projectsError)) {
      router.replace("/login");
    }
  }, [projectsError, router, workspacesError]);

  const workspace = workspacesResponse?.data.workspaces.find(
    (item) => item.id === workspaceId,
  );
  const projects = projectsResponse?.data.projects ?? [];

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setActionError(null);

    if (!name.trim()) {
      setActionError("Project name is required.");
      return;
    }

    try {
      await createProject({
        workspaceId,
        body: {
          name: name.trim(),
          ...(description.trim() ? { description: description.trim() } : {}),
        },
      }).unwrap();
      setName("");
      setDescription("");
      setNotice("Project created.");
    } catch (error: unknown) {
      setActionError(readApiErrorMessage(error));
    }
  }

  async function handleSave(
    project: WorkspaceProject,
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextName = String(formData.get("name") ?? "").trim();
    const nextDescription = String(formData.get("description") ?? "").trim();
    setNotice(null);
    setActionError(null);

    if (!nextName) {
      setActionError("Project name is required.");
      return;
    }

    try {
      await updateProject({
        workspaceId,
        projectId: project.id,
        body: {
          name: nextName,
          ...(nextDescription ? { description: nextDescription } : {}),
        },
      }).unwrap();
      setEditingProjectId(null);
      setNotice("Project updated.");
    } catch (error: unknown) {
      setActionError(readApiErrorMessage(error));
    }
  }

  async function handleDelete(project: WorkspaceProject) {
    setNotice(null);
    setActionError(null);

    try {
      await deleteProject({ workspaceId, projectId: project.id }).unwrap();
      setNotice("Project deleted.");
    } catch (error: unknown) {
      setActionError(readApiErrorMessage(error));
    }
  }

  if (isLoadingWorkspaces || isLoadingProjects) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="rounded-xl border border-[#e8e7e0] bg-white p-6 text-[#777872]">
          Loading projects…
        </p>
      </main>
    );
  }

  if (isUnauthorized(workspacesError) || isUnauthorized(projectsError)) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="rounded-xl border border-[#e8e7e0] bg-white p-6 text-[#777872]">
          Returning you to sign in…
        </p>
      </main>
    );
  }

  if (!workspace || workspacesError || projectsError) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <Link className="font-semibold text-[#6f5f3f]" href="/workspace">
          Back to workspaces
        </Link>
        <p className="mt-6 rounded-xl border border-[#e2b8ae] bg-[#fff8f6] p-6 text-[#9a4435]">
          We could not load this workspace&apos;s projects.
        </p>
      </main>
    );
  }

  const canManage = canManageProjects(workspace.role);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex flex-wrap gap-4 text-sm font-semibold text-[#6f5f3f]">
        <Link href="/workspace">← Back to workspaces</Link>
        <Link href={"/workspace/" + workspaceId + "/members"}>Members</Link>
      </div>
      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9a8c6d]">
          {workspace.name}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#272a26]">
          Workspace projects
        </h1>
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
          onSubmit={handleCreate}
        >
          <h2 className="text-lg font-bold text-[#272a26]">Create a project</h2>
          <div className="mt-4 grid gap-4">
            <div>
              <label className="text-sm font-semibold text-[#4c4e48]" htmlFor="project-name">
                Project name
              </label>
              <input
                className="mt-1 w-full rounded-md border border-[#d7d8d1] px-3 py-2 text-[#272a26]"
                id="project-name"
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[#4c4e48]" htmlFor="project-description">
                Project description
              </label>
              <textarea
                className="mt-1 min-h-20 w-full rounded-md border border-[#d7d8d1] px-3 py-2 text-[#272a26]"
                id="project-description"
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />
            </div>
            <button
              className="w-fit rounded-md bg-[#6f5f3f] px-4 py-2 font-semibold text-white disabled:opacity-50"
              disabled={isCreating}
              type="submit"
            >
              {isCreating ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      ) : null}

      <section className="mt-8" aria-labelledby="projects-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#272a26]" id="projects-heading">
            Projects
          </h2>
          <span className="text-sm text-[#777872]">{projects.length} total</span>
        </div>
        {projects.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-[#d7d8d1] p-6 text-sm text-[#777872]">
            No projects yet.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard
                canManage={canManage}
                isDeleting={isDeleting}
                isEditing={editingProjectId === project.id}
                isUpdating={isUpdating}
                key={
                  project.id +
                  (editingProjectId === project.id ? "-editing" : "")
                }
                onCancelEdit={() => setEditingProjectId(null)}
                onDelete={() => void handleDelete(project)}
                onEdit={() => setEditingProjectId(project.id)}
                onSave={(event) => void handleSave(project, event)}
                project={project}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
