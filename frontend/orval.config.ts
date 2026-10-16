import { defineConfig } from "orval"

export default defineConfig({
  api: {
    input: "../contract/openapi.yaml",
    output: {
      client: "fetch",
      mode: "tags-split",
      target: "src/api/generated",
      schemas: "src/api/generated/model",
      clean: true,
    },
  },
})
