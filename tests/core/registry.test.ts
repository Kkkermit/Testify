import { validateCommand, validateComponent, validateEvent, validateMessageProcessor } from "../../src/core/registry";

describe("validateCommand", () => {
	const valid = {
		name: "ping",
		description: "Checks latency.",
		category: "info",
		surfaces: ["slash"],
		execute: () => Promise.resolve(),
	};

	it("accepts a well-formed command", () => {
		expect(validateCommand(valid, "ping.js")).toBe(valid);
	});

	// A command file missing `.data` used to crash boot with an opaque error and
	// no filename.
	it("names the file when a required field is missing", () => {
		expect(() => validateCommand({ ...valid, name: undefined }, "broken.js")).toThrow(/broken\.js.*name/);
		expect(() => validateCommand({ ...valid, execute: undefined }, "broken.js")).toThrow(/broken\.js.*execute/);
	});

	it("rejects a category that is not in the enum", () => {
		expect(() => validateCommand({ ...valid, category: "Server Utils" }, "x.js")).toThrow(/invalid category/);
	});

	it("rejects an unknown surface", () => {
		expect(() => validateCommand({ ...valid, surfaces: ["voice"] }, "x.js")).toThrow(/unknown surface/);
	});

	it("rejects a non-object export", () => {
		expect(() => validateCommand(null, "x.js")).toThrow(/must export an object/);
	});
});

describe("validateEvent", () => {
	// `handleLogsEvent.js` exported `{ handleLogs }` and the loader happily
	// registered `client.on(undefined, …)`.
	it("rejects a module with no event name", () => {
		expect(() => validateEvent({ execute: () => undefined }, "handleLogs.js")).toThrow(/handleLogs\.js.*name/);
	});

	it("accepts a well-formed event", () => {
		const handler = { name: "messageCreate", execute: () => undefined };
		expect(validateEvent(handler, "x.js")).toBe(handler);
	});
});

describe("validateComponent", () => {
	it("rejects a namespace that is not registered in the codec", () => {
		expect(() => validateComponent({ namespace: "back-", handle: () => undefined }, "x.js")).toThrow(
			/must be registered/,
		);
	});

	it("accepts a registered namespace", () => {
		const handler = { namespace: "shop", handle: () => undefined };
		expect(validateComponent(handler, "x.js")).toBe(handler);
	});
});

describe("validateMessageProcessor", () => {
	it("requires a name and a run function", () => {
		expect(() => validateMessageProcessor({ name: "x" }, "x.js")).toThrow(/run/);
		expect(() => validateMessageProcessor({ run: () => undefined }, "x.js")).toThrow(/name/);
	});
});
