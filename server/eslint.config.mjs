import pluginJs from "@eslint/js";
import prettier from "eslint-plugin-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  { ignores: ["**/node_modules", "**/dist", "**/build", "*.js", "eslint.config.mjs"] },

  { files: ["**/*.{js,mjs,cjs,ts}"] },

  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,

  {
    plugins: { prettier },

    languageOptions: {
      globals: { ...globals.node },

      parser: tseslint.parser,
      ecmaVersion: 2020,
      sourceType: "module",

      parserOptions: { project: "tsconfig.json" },
    },

    rules: {
      "prettier/prettier": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],

      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-misused-promises": "off",
    },
  },
];
