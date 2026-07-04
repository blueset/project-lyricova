import base from "../../eslint.base.mjs";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  ...base,
  prettier,
];
