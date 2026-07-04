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
import tseslint from "typescript-eslint";

export default tseslint.config(...tseslint.configs.recommended, {
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
    "@typescript-eslint/no-unused-vars": "warn",
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
});
