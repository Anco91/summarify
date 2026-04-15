import { defineConfig } from "orval";

export default defineConfig({
  // Output 1: React Query hooks
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
  // Output 2: Zod schemas (DTOs for client-side validation)
  summarifyZod: {
    input: {
      target: "../../packages/contracts/openapi.yaml",
    },
    output: {
      mode: "single",
      target: "src/shared/api/schemas.ts",
      client: "zod",
    },
  },
});
