module.exports = {
	testEnvironment: "node",
	roots: ["<rootDir>/src"],
	testMatch: ["**/src/__tests__/**/*.test.js", "**/src/__tests__/**/**/*.test.js"],
	setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.js"],
	verbose: true,
	collectCoverageFrom: ["src/commands/**/*.js"],
	coveragePathIgnorePatterns: [
		"/node_modules/",
		"/scripts/",
		"/schemas/",
		"/events/",
		"/functions/",
		"/config.js",
		"/index.js",
	],
	transformIgnorePatterns: ["/node_modules/", "\\.pnp\\.[^\\/]+$"],
	transform: {
		"^.+\\.jsx?$": "babel-jest",
	},
	globals: {
		"babel-jest": {
			presets: ["@babel/preset-env"],
		},
	},
};
