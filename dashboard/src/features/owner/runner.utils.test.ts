import { type CommandOptionSummary, type CommandSummary } from "@testify/shared";
import { buildArgs, canRun, controlFor } from "./runner.utils";

function option(overrides: Partial<CommandOptionSummary> = {}): CommandOptionSummary {
	return {
		name: "text",
		description: "Some text.",
		type: "string",
		required: false,
		choices: [],
		min: null,
		max: null,
		...overrides,
	};
}

function command(overrides: Partial<CommandSummary> = {}): CommandSummary {
	return {
		name: "demo",
		description: "A demo.",
		category: "info",
		aliases: [],
		subcommands: [],
		options: [],
		permissions: [],
		botPermissions: [],
		cooldownMs: null,
		guildOnly: false,
		ownerOnly: false,
		nsfw: false,
		...overrides,
	};
}

describe("choosing a control for an option", () => {
	it.each([
		["integer", "number"],
		["number", "number"],
		["boolean", "boolean"],
		["string", "text"],
	] as const)("gives %s a %s control", (type, expected) => {
		expect(controlFor(option({ type }))).toBe(expected);
	});

	/** There is no member picker here: the bot may not be in the server, and there is nothing to pick from. */
	it.each(["user", "channel", "role"] as const)("asks for %s as an ID", (type) => {
		expect(controlFor(option({ type }))).toBe("id");
	});
});

describe("building the request", () => {
	/** An untouched optional field is left out, because a command would read `""` as an answer. */
	it("leaves an empty field out entirely", () => {
		expect(buildArgs([option()], { text: "" })).toEqual({});
	});

	/** Left as typed, so the server's refusal names the option rather than reporting a NaN nobody sent. */
	it("passes a number that is not one through as it was typed", () => {
		expect(buildArgs([option({ name: "count", type: "integer" })], { count: "abc" })).toEqual({ count: "abc" });
	});
});

describe("whether it can be run yet", () => {
	it("refuses before a command is picked", () => {
		expect(canRun(undefined, null, {})).toBe(false);
	});

	/** A command that is nothing but subcommands has no body to run. */
	it("refuses a command with subcommands until one is picked", () => {
		const parent = command({ subcommands: [{ name: "info", description: "Info.", aliases: [], options: [] }] });

		expect(canRun(parent, null, {})).toBe(false);
		expect(canRun(parent, "info", {})).toBe(true);
	});

	it("refuses while a required option is empty", () => {
		const withRequired = command({ options: [option({ required: true })] });

		expect(canRun(withRequired, null, {})).toBe(false);
		expect(canRun(withRequired, null, { text: "given" })).toBe(true);
	});
});
