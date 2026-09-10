import type { MembershipRole } from "@prisma/client";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from "./workspace.schemas.js";

export interface StoredWorkspace {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: MembershipRole;
  createdAt: Date;
}

export interface ListedWorkspace extends StoredWorkspace {
  role: MembershipRole;
}

export interface CreatedWorkspace {
  workspace: StoredWorkspace;
  membership: StoredMembership;
}

export interface CreateWorkspaceWithOwnerRecord {
  name: string;
  userId: string;
}

export interface WorkspaceAccess {
  workspaceId: string;
  role: MembershipRole;
}

export interface UpdateWorkspaceRecord {
  workspaceId: string;
  name: string;
}

export interface WorkspaceRepository {
  listWorkspacesForUser(userId: string): Promise<ListedWorkspace[]>;
  createWorkspaceWithOwner(
    input: CreateWorkspaceWithOwnerRecord,
  ): Promise<CreatedWorkspace>;
  getWorkspaceAccess(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceAccess | null>;
  updateWorkspace(input: UpdateWorkspaceRecord): Promise<StoredWorkspace>;
  deleteWorkspace(workspaceId: string): Promise<void>;
}

export interface WorkspaceService {
  listWorkspaces(userId: string): Promise<ListedWorkspace[]>;
  createWorkspace(
    userId: string,
    input: CreateWorkspaceInput,
  ): Promise<CreatedWorkspace>;
  updateWorkspace(
    userId: string,
    workspaceId: string,
    input: UpdateWorkspaceInput,
  ): Promise<StoredWorkspace>;
  deleteWorkspace(userId: string, workspaceId: string): Promise<void>;
}
