import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import importX from "eslint-plugin-import-x";
import ts from "typescript-eslint";

export default ts.config(
	// Globbed at any depth, because the workspaces build into their own dist/ and coverage/.
	// `.claude/skills` is vendored third-party content — linting somebody else's scripts fails on their style, not ours.
	{
		ignores: [
			"**/dist/**",
			"**/coverage/**",
			"**/node_modules/**",
			"assets/**",
			"site/**",
			".codebase-notes/**",
			".claude/skills/**",
		],
	},
	js.configs.recommended,
	ts.configs.recommendedTypeChecked,
	ts.configs.stylisticTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: { allowDefaultProject: ["eslint.config.mjs", "commitlint.config.mjs"] },
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: { "import-x": importX },
		settings: { "import-x/resolver": { typescript: { project: "./tsconfig.json" }, node: true } },
		rules: {
			eqeqeq: ["error", "always"],
			"no-var": "error",
			"prefer-const": "error",
			"no-console": "error",
			"object-shorthand": ["error", "always"],

			"import-x/no-extraneous-dependencies": "error",
			"import-x/no-cycle": ["error", { maxDepth: 6 }],
			"import-x/no-duplicates": "error",
			"import-x/order": [
				"error",
				{
					groups: ["builtin", "external", "parent", "sibling", "index"],
					alphabetize: { order: "asc", caseInsensitive: true },
					"newlines-between": "never",
				},
			],

			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": "error",
			"@typescript-eslint/no-unnecessary-condition": "error",
			"@typescript-eslint/switch-exhaustiveness-check": "error",
			"@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],

			// discord.js entities define their own `toString()`, so interpolating a
			// User or Role is intentional. `no-base-to-string` still catches the real
			// bug this guards against: interpolating a plain object as "[object Object]".
			"@typescript-eslint/restrict-template-expressions": "off",
			"@typescript-eslint/no-base-to-string": "error",

			// Build embeds with `embed()` from src/lib/embeds.ts so they all look the same.
			"no-restricted-syntax": [
				"error",
				{
					selector: "NewExpression[callee.name='EmbedBuilder']",
					message: "Use embed() from src/lib/embeds.util.ts instead of building an embed by hand.",
				},
				// The dashboard renders text a guild manager typed. React escapes it; these four undo that,
				// and the CSP is the last line of defence rather than the only one.
				{
					selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
					message: "React escapes text for a reason. Render it as a child instead.",
				},
				{
					selector: "MemberExpression[property.name=/^(innerHTML|outerHTML)$/]",
					message: "Assigning HTML is an XSS vector. Set textContent, or render it through React.",
				},
				{
					selector: "CallExpression[callee.name='eval']",
					message: "eval() executes whatever reaches it, and the CSP blocks it in the browser anyway.",
				},
				{
					selector: "NewExpression[callee.name='Function']",
					message: "new Function() is eval() with a longer name.",
				},
			],
		},
	},
	{
		// The loader has to require files by path; that is how commands are found.
		files: ["src/core/loader.ts"],
		rules: { "@typescript-eslint/no-require-imports": "off" },
	},
	{
		// Where embeds are actually built.
		files: ["src/lib/embeds.util.ts", "src/core/errors.ts", "src/buttons/errorTriage.ts"],
		rules: { "no-restricted-syntax": "off" },
	},
	{
		files: ["scripts/**/*.ts", "**/*.config.ts"],
		rules: {
			"no-console": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"import-x/no-extraneous-dependencies": ["error", { devDependencies: true }],
		},
	},
	{
		files: ["tests/**/*.ts"],
		rules: {
			"no-console": "off",
			"@typescript-eslint/dot-notation": "off",
			"@typescript-eslint/no-unnecessary-condition": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/unbound-method": "off",
			"import-x/no-extraneous-dependencies": ["error", { devDependencies: true }],
		},
	},
	prettier,
);
