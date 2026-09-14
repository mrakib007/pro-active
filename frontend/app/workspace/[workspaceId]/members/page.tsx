"use client";

import { useParams } from "next/navigation";
import { WorkspaceMembers } from "../../../../components/workspace/workspace-members";

export default function WorkspaceMembersPage() {
  const params = useParams<{ workspaceId: string }>();

  return <WorkspaceMembers workspaceId={params.workspaceId} />;
}
