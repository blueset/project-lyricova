// Shared ESLint flat-config base for all workspace packages.
// Uses the unified `typescript-eslint` package (replaces the legacy
// `@typescript-eslint/*` + `FlatCompat` shim setup). Package configs extend
// this and layer on framework-specific plugins (React, Next) as needed.
//
// NOTE: `js.configs.recommended` (eslint:recommended) is intentionally NOT
// enabled here to preserve the prior effective rule set. It can be layered on
// later together with an `eslint --fix` pass (surfaces no-useless-escape etc.).
// Formatting rules (semi/quotes/etc.) are intentionally NOT enforced here —
// Prettier owns formatting; each package appends `eslint-config-prettier`.
//
// Unused imports/vars are handled by `eslint-plugin-unused-imports`:
// `no-unused-imports` is an auto-fixable error (dead imports are stripped by
// `--fix`), while `no-unused-vars` stays a warning with `^_` ignore patterns.
import tseslint from "typescript-eslint";
import unusedImports from "eslint-plugin-unused-imports";

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-inferrable-types": [
        "warn",
        { ignoreParameters: true },
      ],
      // Delegate unused-import/var handling to eslint-plugin-unused-imports so
      // dead imports can be auto-removed with `--fix`.
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-unused-expressions": [
        "error",
        { allowShortCircuit: true, allowTernary: true },
      ],
      "@typescript-eslint/no-empty-object-type": [
        "error",
        { allowInterfaces: "with-single-extends" },
      ],
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
  {
    // Ambient declaration files (`*.d.ts`) legitimately declare types/members
    // that are never referenced from within the file itself; don't flag them.
    files: ["**/*.d.ts"],
    rules: {
      "unused-imports/no-unused-vars": "off",
    },
  },
);
