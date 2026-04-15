import { defineConfig } from "orval";

export default defineConfig({
  summarify: {
    input: {
      target: "../../packages/contracts/openapi.yaml",
    },
    output: {
      mode: "tags-split",
      target: "src/shared/api",
      client: "react-query",
      override: {
        mutator: {
          path: "src/shared/lib/axios-instance.ts",
          name: "customInstance",
        },
      },
    },
  },
});
