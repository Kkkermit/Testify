import { readFileSync } from "node:fs";
import type { Config } from "jest";

/** The alias map is read from tsconfig.json, so Jest resolves exactly what TypeScript does. */
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
	// One database for the run, started before any suite is built so a missing one skips rather than passes.
	globalSetup: "<rootDir>/tests/helpers/mongoGlobal.ts",
	globalTeardown: "<rootDir>/tests/helpers/mongoTeardown.ts",
	moduleNameMapper: {
		...aliasesFromTsconfig(),
		// Tests read the shared workspace's source, so editing it needs no build.
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
	/** Only code unit tests reach; commands, events and buttons are covered by the loader and dispatcher tests. */
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
	// The agreed floor, which the pre-push hook enforces through `npm run test:coverage`.
	coverageThreshold: { global: { statements: 80, lines: 80, functions: 80, branches: 80 } },
	clearMocks: true,
	restoreMocks: true,
};

export default config;
