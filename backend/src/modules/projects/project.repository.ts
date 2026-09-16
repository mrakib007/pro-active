import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import type {
  CreateProjectRecord,
  DeleteProjectRecord,
  ProjectRepository,
  StoredProject,
  UpdateProjectRecord,
} from "./project.types.js";

export class ProjectNotFoundError extends Error {
  constructor() {
    super("Project not found");
    this.name = "ProjectNotFoundError";
  }
}

const projectSelect = {
  id: true,
  workspaceId: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProjectSelect;

type ProjectRecord = Prisma.ProjectGetPayload<{
  select: typeof projectSelect;
}>;

function toStoredProject(project: ProjectRecord): StoredProject {
  return project;
}

export function createProjectRepository(
  database: PrismaClient = prisma,
): ProjectRepository {
  return {
    async getWorkspaceAccess(userId, workspaceId) {
      const membership = await database.membership.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
        select: { role: true },
      });

      return membership ? { workspaceId, role: membership.role } : null;
    },

    async listProjects(workspaceId) {
      const projects = await database.project.findMany({
        where: { workspaceId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: projectSelect,
      });

      return projects.map(toStoredProject);
    },

    async createProject({
      workspaceId,
      name,
      description,
    }: CreateProjectRecord) {
      const project = await database.project.create({
        data: { workspaceId, name, description },
        select: projectSelect,
      });

      return toStoredProject(project);
    },

    async getProject(workspaceId, projectId) {
      const project = await database.project.findFirst({
        where: { id: projectId, workspaceId },
        select: projectSelect,
      });

      return project ? toStoredProject(project) : null;
    },

    async updateProject({
      workspaceId,
      projectId,
      name,
      description,
    }: UpdateProjectRecord) {
      const project = await database.$transaction(async (transaction) => {
        const updateResult = await transaction.project.updateMany({
          where: { id: projectId, workspaceId },
          data: { name, description },
        });

        if (updateResult.count === 0) {
          throw new ProjectNotFoundError();
        }

        return transaction.project.findFirstOrThrow({
          where: { id: projectId, workspaceId },
          select: projectSelect,
        });
      });

      return toStoredProject(project);
    },

    async deleteProject({ workspaceId, projectId }: DeleteProjectRecord) {
      const deleteResult = await database.project.deleteMany({
        where: { id: projectId, workspaceId },
      });

      if (deleteResult.count === 0) {
        throw new ProjectNotFoundError();
      }
    },
  };
}
