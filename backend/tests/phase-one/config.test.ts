import { describe, expect, test } from "vitest";
import { loadConfig } from "../../src/config.js";

describe("loadConfig", () => {
  test("uses safe development defaults when runtime values are absent", () => {
    expect(loadConfig({})).toMatchObject({
      NODE_ENV: "development",
      HOST: "127.0.0.1",
      PORT: 3000,
      LOG_LEVEL: "info",
    });
  });

  test("rejects a port outside the TCP port range", () => {
    expect(() => loadConfig({ PORT: "70000" })).toThrow();
  });
});
