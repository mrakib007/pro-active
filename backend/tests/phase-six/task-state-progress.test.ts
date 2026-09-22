import { describe, expect, test } from "vitest";
import { transitionTaskStatus } from "../../src/modules/tasks/task-state.js";

describe("task progress transition", () => {
  test("moves an IN_PROGRESS task to DONE", () => {
    expect(transitionTaskStatus("IN_PROGRESS", "DONE")).toBe("DONE");
  });
});
