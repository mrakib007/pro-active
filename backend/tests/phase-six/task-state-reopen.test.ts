import { describe, expect, test } from "vitest";
import { transitionTaskStatus } from "../../src/modules/tasks/task-state.js";

describe("task reopen transition", () => {
  test("moves a DONE task back to TODO", () => {
    expect(transitionTaskStatus("DONE", "TODO")).toBe("TODO");
  });
});
