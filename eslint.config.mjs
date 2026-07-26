import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import importX from "eslint-plugin-import-x";
import ts from "typescript-eslint";

export default ts.config(
	{
		ignores: ["dist/**", "coverage/**", "node_modules/**", "site/**", "assets/**", ".codebase-notes/**"],
	},
	js.configs.recommended,
	ts.configs.recommendedTypeChecked,
	ts.configs.stylisticTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: { allowDefaultProject: ["eslint.config.mjs"] },
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: { "import-x": importX },
		settings: {
			"import-x/resolver": { typescript: true, node: true },
		},
		rules: {
			eqeqeq: ["error", "always"],
			"no-var": "error",
			"prefer-const": "error",
			"no-console": "error",
			"no-empty": ["error", { allowEmptyCatch: false }],
			"no-case-declarations": "error",
			"no-unreachable": "error",
			"object-shorthand": ["error", "always"],

			"import-x/no-extraneous-dependencies": "error",
			"import-x/no-cycle": ["error", { maxDepth: 6 }],
			"import-x/no-duplicates": "error",

			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": "error",
			"@typescript-eslint/require-await": "error",
			"@typescript-eslint/no-unnecessary-condition": "error",
			"@typescript-eslint/switch-exhaustiveness-check": "error",
			"@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
			// discord.js entities define their own `toString()`, so interpolating a
			// User or Role is intentional. `no-base-to-string` still catches the real
			// bug this guards against: interpolating a plain object as "[object Object]".
			"@typescript-eslint/restrict-template-expressions": "off",
			"@typescript-eslint/no-base-to-string": "error",
			"@typescript-eslint/no-require-imports": "error",

			// `ephemeral` itself is fine — `CommandContext.reply` owns it and the
			// adapters translate it per surface. What must not come back is feature
			// code hand-building embeds outside the factory.
			"no-restricted-syntax": [
				"error",
				{
					selector: "NewExpression[callee.name='EmbedBuilder']",
					message: "Use the embed() factory in src/ui/embeds.ts rather than building embeds inline.",
				},
			],
		},
	},
	{
		files: ["src/core/loader.ts"],
		rules: { "@typescript-eslint/no-require-imports": "off" },
	},
	{
		// The embed factory and the error boundary are where embeds are built.
		files: ["src/ui/embeds.ts", "src/core/execute.ts", "src/features/*/components/errorTriage.ts"],
		rules: { "no-restricted-syntax": "off" },
	},
	{
		files: ["scripts/**/*.ts"],
		rules: { "@typescript-eslint/no-unsafe-assignment": "off" },
	},
	{
		files: ["scripts/**/*.ts", "*.config.ts"],
		rules: {
			"no-console": "off",
			"import-x/no-extraneous-dependencies": ["error", { devDependencies: true }],
		},
	},
	{
		files: ["tests/**/*.ts"],
		rules: {
			"no-console": "off",
			"@typescript-eslint/require-await": "off",
			"@typescript-eslint/no-unsafe-enum-comparison": "off",
			"import-x/no-extraneous-dependencies": ["error", { devDependencies: true }],
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unnecessary-condition": "off",
			"@typescript-eslint/unbound-method": "off",
		},
	},
	prettier,
);
