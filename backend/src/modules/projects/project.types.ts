import type { MembershipRole } from "@prisma/client";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "./project.schemas.js";

export interface StoredProject {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectAccess {
  workspaceId: string;
  role: MembershipRole;
}

export interface CreateProjectRecord {
  workspaceId: string;
  name: string;
  description: string | null;
}

export interface UpdateProjectRecord {
  workspaceId: string;
  projectId: string;
  name: string;
  description: string | null;
}

export interface DeleteProjectRecord {
  workspaceId: string;
  projectId: string;
}

export interface ProjectRepository {
  getWorkspaceAccess(
    userId: string,
    workspaceId: string,
  ): Promise<ProjectAccess | null>;
  listProjects(workspaceId: string): Promise<StoredProject[]>;
  createProject(input: CreateProjectRecord): Promise<StoredProject>;
  getProject(
    workspaceId: string,
    projectId: string,
  ): Promise<StoredProject | null>;
  updateProject(input: UpdateProjectRecord): Promise<StoredProject>;
  deleteProject(input: DeleteProjectRecord): Promise<void>;
}

export interface ProjectService {
  listProjects(
    actorUserId: string,
    workspaceId: string,
  ): Promise<StoredProject[]>;
  createProject(
    actorUserId: string,
    workspaceId: string,
    input: CreateProjectInput,
  ): Promise<StoredProject>;
  updateProject(
    actorUserId: string,
    workspaceId: string,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<StoredProject>;
  deleteProject(
    actorUserId: string,
    workspaceId: string,
    projectId: string,
  ): Promise<void>;
}
