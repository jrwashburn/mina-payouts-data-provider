import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import globals from "globals";

export default [
	js.configs.recommended,
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				project: "./tsconfig.eslint.json",
			},
			globals: {
				...globals.node,
			},
		},
		plugins: {
			"@typescript-eslint": tsPlugin,
		},
		rules: {
			...tsPlugin.configs.recommended.rules,
		},
	},
	{
		files: ["tests/**/*.ts"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				project: "./tsconfig.eslint.json",
			},
			globals: {
				...globals.node,
				...globals.vitest,
			},
		},
		plugins: {
			"@typescript-eslint": tsPlugin,
		},
		rules: {
			...tsPlugin.configs.recommended.rules,
			"no-undef": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/ban-ts-comment": "off",
		},
	},
	{
		ignores: ["dist/*", "node_modules/*"],
	},
];
