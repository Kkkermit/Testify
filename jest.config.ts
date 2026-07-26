import type { Config } from "jest";

const config: Config = {
	testEnvironment: "node",
	roots: ["<rootDir>/tests"],
	testMatch: ["**/tests/**/*.test.ts"],
	setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
	transform: {
		"^.+\\.tsx?$": [
			"@swc/jest",
			{
				jsc: { parser: { syntax: "typescript" }, target: "es2022" },
				module: { type: "commonjs" },
			},
		],
	},
	collectCoverageFrom: ["src/**/*.ts", "!src/types/**", "!src/index.ts"],
	coverageThreshold: { global: { lines: 40, functions: 40, branches: 30 } },
	clearMocks: true,
	restoreMocks: true,
};

export default config;
