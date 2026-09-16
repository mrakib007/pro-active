"use client";

import { useParams } from "next/navigation";
import { WorkspaceProjects } from "../../../../components/workspace/workspace-projects";

export default function WorkspaceProjectsPage() {
  const params = useParams<{ workspaceId: string }>();

  return <WorkspaceProjects workspaceId={params.workspaceId} />;
}
