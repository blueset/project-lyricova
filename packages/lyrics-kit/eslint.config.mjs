import base from "../../eslint.base.mjs";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: ["build/**", "coverage/**", "node_modules/**"],
  },
  ...base,
  prettier,
];
