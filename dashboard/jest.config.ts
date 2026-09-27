import { type Config } from "jest";

const config: Config = {
	displayName: "dashboard",
	rootDir: ".",
	// `jest-fixed-jsdom` keeps the fetch and stream globals MSW needs, which plain jsdom deletes.
	testEnvironment: "jest-fixed-jsdom",
	setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
	transform: {
		// "automatic" or every test file would have to import React itself.
		"^.+\\.[mc]?[tj]sx?$": ["@swc/jest", { jsc: { transform: { react: { runtime: "automatic" } } } }],
	},
	// These ship ESM only, so they are transformed rather than skipped with the rest of node_modules.
	transformIgnorePatterns: [
		`/node_modules/(?!(${[
			"react-router",
			"rettime",
			"until-async",
			"tagged-tag",
			"headers-polyfill",
			"set-cookie-parser",
			"@open-draft/deferred-promise",
			"@epic-web/invariant",
		].join("|")})/)`,
	],
	moduleNameMapper: {
		// discord-html-transcripts hoists React 18 to the root, so both are pinned to the workspace's React 19.
		"^react$": "<rootDir>/node_modules/react",
		"^react/(.*)$": "<rootDir>/node_modules/react/$1",
		"^react-dom$": "<rootDir>/node_modules/react-dom",
		"^react-dom/(.*)$": "<rootDir>/node_modules/react-dom/$1",
		"^@/(.*)$": "<rootDir>/src/$1",
		"^@testify/shared$": "<rootDir>/../shared/src/index.ts",
		"^@testify/shared/(.*)$": "<rootDir>/../shared/src/$1",
		"\\.css$": "<rootDir>/src/test/styleMock.ts",
	},
	// Vendored shadcn is not ours to test, and starfield.ts needs a WebGL context jsdom does not have.
	collectCoverageFrom: [
		"src/**/*.{ts,tsx}",
		"!src/components/ui/**",
		"!src/lib/three/starfield.ts",
		"!src/main.tsx",
		"!src/**/*.d.ts",
	],
	coverageThreshold: { global: { statements: 80, branches: 80, functions: 80, lines: 80 } },
};

export default config;
