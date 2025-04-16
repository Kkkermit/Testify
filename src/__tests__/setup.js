/**
 * Jest setup file
 * This file runs before all tests to set up the test environment
 */

process.env.NODE_ENV = "test";

global.mockModuleReturn = function () {
	return null;
};

process.env.clientId = "mock-client-id";
process.env.guildid = "mock-guild-id";
process.env.token = "mock-token";
process.env.webhookSuggestionLogging = "https://discord.com/api/webhooks/mock/url";
process.env.webhookBugLogging = "https://discord.com/api/webhooks/mock/url";
process.env.rapidapikey = "mock-api-key";

jest.spyOn(global.Date, "now").mockImplementation(() => 1600000000000);

global.console = {
	...console,
	// Comment out the line below to see console.log output during tests
	log: jest.fn(),
	// Keep errors and warnings visible
	error: console.error,
	warn: console.warn,
	info: jest.fn(),
	debug: jest.fn(),
};

jest.setTimeout(10000);

process.on("unhandledRejection", (error) => {
	console.error("UNHANDLED REJECTION IN TEST:", error);
});
