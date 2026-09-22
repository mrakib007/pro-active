export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

const allowedTransitions: Record<TaskStatus, readonly TaskStatus[]> = {
  TODO: ["IN_PROGRESS"],
  IN_PROGRESS: ["TODO", "DONE"],
  DONE: ["TODO"],
};

export function transitionTaskStatus(
  currentStatus: TaskStatus,
  nextStatus: TaskStatus,
): TaskStatus {
  if (
    currentStatus === nextStatus ||
    allowedTransitions[currentStatus].includes(nextStatus)
  ) {
    return nextStatus;
  }

  throw new Error(
    `Invalid task status transition: ${currentStatus} -> ${nextStatus}`,
  );
}
