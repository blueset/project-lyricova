import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import next from "@next/eslint-plugin-next";
import base from "../../eslint.base.mjs";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: [
      "dist/**",
      ".next/**",
      "coverage/**",
      "**/*.d.ts",
      "src/public/**",
      "src/types/**",
      "node_modules/**",
    ],
  },
  ...base,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs["recommended-latest"],
  next.configs.recommended,
  next.configs["core-web-vitals"],
  {
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@next/next/no-img-element": "off",
      "react/display-name": "warn",
    },
  },
  prettier,
];
