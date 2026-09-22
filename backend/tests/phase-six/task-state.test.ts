import { describe, expect, test } from "vitest";
import { transitionTaskStatus } from "../../src/modules/tasks/task-state.js";

describe("task state transitions", () => {
  test("moves a TODO task to IN_PROGRESS", () => {
    expect(transitionTaskStatus("TODO", "IN_PROGRESS")).toBe("IN_PROGRESS");
  });
});
