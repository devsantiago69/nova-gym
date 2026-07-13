import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
export default tseslint.config(
  { ignores:["**/node_modules/**","**/.next/**","**/dist/**","apps/web/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { files:["**/*.ts"], rules:{"@typescript-eslint/no-explicit-any":"error"} }
);
