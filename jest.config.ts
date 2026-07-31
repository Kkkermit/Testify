import { readFileSync } from "node:fs";
import type { Config } from "jest";

/**
 * The alias map lives in tsconfig.json and is read from there, so Jest cannot
 * drift from what TypeScript and the build resolve.
 */
function aliasesFromTsconfig(): Record<string, string> {
	const raw = readFileSync("tsconfig.json", "utf8").replace(/^\s*\/\/.*$/gm, "");
	const paths = (JSON.parse(raw) as { compilerOptions: { paths: Record<string, string[]> } }).compilerOptions.paths;

	return Object.fromEntries(
		Object.entries(paths).map(([alias, [target = ""]]) =>
			alias.endsWith("/*")
				? [`^${alias.replace("/*", "/(.*)$")}`, `<rootDir>/${target.replace("/*", "/$1")}`]
				: [`^${alias}$`, `<rootDir>/${target}`],
		),
	);
}

const config: Config = {
	testEnvironment: "node",
	roots: ["<rootDir>/tests"],
	testMatch: ["**/tests/**/*.test.ts"],
	setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
	moduleNameMapper: {
		...aliasesFromTsconfig(),
		// The workspace's own `main` is its build output. Tests read the source instead, so editing
		// `shared/` does not need a build before the suite reflects it.
		"^@testify/shared$": "<rootDir>/shared/src/index.ts",
		"^@testify/shared/(.*)$": "<rootDir>/shared/src/$1",
	},
	transform: {
		"^.+\\.tsx?$": [
			"@swc/jest",
			{
				jsc: { parser: { syntax: "typescript" }, target: "es2022" },
				module: { type: "commonjs" },
			},
		],
	},
	/**
	 * Scoped to the code unit tests are meant to reach. Commands, events and
	 * buttons are almost entirely calls into discord.js — they are covered
	 * structurally by tests/core/loader and behaviourally through the dispatcher,
	 * and counting their untested API calls would only dilute the threshold into
	 * something nobody trusts.
	 */
	collectCoverageFrom: [
		"src/core/**/*.ts",
		"src/lib/**/*.ts",
		"src/config/**/*.ts",
		"src/api/**/*.ts",
		"shared/src/**/*.ts",
		"!src/**/index.ts",
		"!shared/src/index.ts",
		"!src/lib/canvas.util.ts",
	],
	// The agreed floor. The suite currently sits comfortably above every one of
	// these, so the gap absorbs ordinary changes while a real drop still fails
	// `npm run test:coverage` — which is what the pre-push hook runs.
	coverageThreshold: { global: { statements: 80, lines: 80, functions: 80, branches: 80 } },
	clearMocks: true,
	restoreMocks: true,
};

export default config;
