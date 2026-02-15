import { defineConfig, globalIgnores } from "eslint/config";
import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import reactHooks from "eslint-plugin-react-hooks";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    globalIgnores(["dist/*", "coverage/*", "**/*.d.ts", "src/public/", "src/types/"]),
    {
        extends: fixupConfigRules(compat.extends(
            "plugin:@typescript-eslint/recommended",
            "plugin:react/recommended",
            "plugin:react-hooks/recommended",
            "plugin:@next/next/recommended",
        )),

        plugins: {
            "react-hooks": fixupPluginRules(reactHooks),
        },

        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2018,
            sourceType: "module",
        },

        settings: {
            react: {
                version: "detect",
            },
        },

        rules: {
            semi: ["error", "always"],

            quotes: ["error", "double", {
                avoidEscape: true,
            }],

            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-explicit-any": 1,
            "@next/next/no-img-element": "off",

            "@typescript-eslint/no-inferrable-types": ["warn", {
                ignoreParameters: true,
            }],

            "@typescript-eslint/no-unused-vars": "warn",
            "react/display-name": "warn",
            "@typescript-eslint/explicit-module-boundary-types": "off",
        },
    },
]);