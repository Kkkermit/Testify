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
	moduleNameMapper: aliasesFromTsconfig(),
	transform: {
		"^.+\\.tsx?$": [
			"@swc/jest",
			{
				jsc: { parser: { syntax: "typescript" }, target: "es2022" },
				module: { type: "commonjs" },
			},
		],
	},
	collectCoverageFrom: ["src/**/*.ts", "!src/index.ts"],
	coverageThreshold: { global: { lines: 40, functions: 40, branches: 30 } },
	clearMocks: true,
	restoreMocks: true,
};

export default config;
