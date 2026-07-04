import base from "../../eslint.base.mjs";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: ["build/**", "node_modules/**", "src/gql/**"],
  },
  ...base,
  prettier,
];
