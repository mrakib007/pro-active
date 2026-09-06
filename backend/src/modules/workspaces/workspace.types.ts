import type { MembershipRole } from "@prisma/client";
import type { CreateWorkspaceInput } from "./workspace.schemas.js";

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

export interface CreatedWorkspace {
  workspace: StoredWorkspace;
  membership: StoredMembership;
}

export interface CreateWorkspaceWithOwnerRecord {
  name: string;
  userId: string;
}

export interface WorkspaceRepository {
  createWorkspaceWithOwner(
    input: CreateWorkspaceWithOwnerRecord,
  ): Promise<CreatedWorkspace>;
}

export interface WorkspaceService {
  createWorkspace(
    userId: string,
    input: CreateWorkspaceInput,
  ): Promise<CreatedWorkspace>;
}
