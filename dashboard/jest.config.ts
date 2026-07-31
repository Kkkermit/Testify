import { type Config } from "jest";

const config: Config = {
	displayName: "dashboard",
	rootDir: ".",
	// jsdom deletes Node's fetch, Request, Response and streams, which MSW needs. This is plain
	// jest-environment-jsdom with those globals put back — MSW's own recommendation.
	testEnvironment: "jest-fixed-jsdom",
	setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
	transform: {
		// "automatic" or every test file would have to import React itself.
		"^.+\\.[mc]?[tj]sx?$": ["@swc/jest", { jsc: { transform: { react: { runtime: "automatic" } } } }],
	},
	// MSW's CommonJS build requires these, and each of them ships ESM only, so Jest has to transform
	// them rather than skip node_modules wholesale.
	transformIgnorePatterns: [
		`/node_modules/(?!(${[
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
		// discord-html-transcripts drags React 18 into the root node_modules, and the hoisted
		// @testing-library/react resolves to it from there — so elements built by 19 get rendered by 18,
		// which fails with "Objects are not valid as a React child". Pin both to the workspace's copy.
		"^react$": "<rootDir>/node_modules/react",
		"^react/(.*)$": "<rootDir>/node_modules/react/$1",
		"^react-dom$": "<rootDir>/node_modules/react-dom",
		"^react-dom/(.*)$": "<rootDir>/node_modules/react-dom/$1",
		"^@/(.*)$": "<rootDir>/src/$1",
		"^@testify/shared$": "<rootDir>/../shared/src/index.ts",
		"^@testify/shared/(.*)$": "<rootDir>/../shared/src/$1",
		"\\.css$": "<rootDir>/src/test/styleMock.ts",
	},
	// Vendored shadcn source is someone else's library; testing it would pad the number, not the confidence.
	collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/components/ui/**", "!src/main.tsx", "!src/**/*.d.ts"],
	coverageThreshold: { global: { statements: 80, branches: 80, functions: 80, lines: 80 } },
};

export default config;
