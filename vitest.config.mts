import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const serverOnlyStub = fileURLToPath(new URL("./tests/support/server-only.ts", import.meta.url));

export default defineConfig({
  resolve: { tsconfigPaths: true, alias: { "server-only": serverOnlyStub } },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/integration/setup.ts"],
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
