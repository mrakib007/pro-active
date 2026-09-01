import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

const runtimeGlobals = {
  Buffer: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  process: "readonly",
  setTimeout: "readonly",
};

const testGlobals = {
  ...runtimeGlobals,
  afterAll: "readonly",
  afterEach: "readonly",
  beforeAll: "readonly",
  beforeEach: "readonly",
  describe: "readonly",
  expect: "readonly",
  test: "readonly",
};

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      globals: runtimeGlobals,
    },
  },
  {
    files: ["tests/**/*.ts"],
    languageOptions: {
      globals: testGlobals,
    },
  },
);
