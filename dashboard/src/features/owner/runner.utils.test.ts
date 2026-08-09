import { type CommandOptionSummary, type CommandSummary } from "@testify/shared";
import {
	buildArgs,
	canRun,
	controlFor,
	hexColour,
	missingRequired,
	needsSubcommand,
	optionsShown,
} from "./runner.utils";

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
	it("gives a select to anything with choices, whatever its type", () => {
		expect(controlFor(option({ type: "integer", choices: [{ name: "One", value: 1 }] }))).toBe("choice");
	});

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

describe("which options a form shows", () => {
	const parent = command({
		subcommands: [{ name: "info", description: "Info.", aliases: [], options: [option({ name: "deep" })] }],
	});

	it("shows a subcommand's own options", () => {
		expect(optionsShown(parent, "info").map((each) => each.name)).toEqual(["deep"]);
	});

	it("shows nothing for a subcommand that does not exist", () => {
		expect(optionsShown(parent, "nope")).toEqual([]);
	});

	it("shows the top-level options when none is picked", () => {
		expect(optionsShown(command({ options: [option()] }), null)).toHaveLength(1);
	});

	it("shows nothing before a command is picked", () => {
		expect(optionsShown(undefined, null)).toEqual([]);
	});

	it("knows which commands have parts to choose between", () => {
		expect(needsSubcommand(parent)).toBe(true);
		expect(needsSubcommand(command())).toBe(false);
		expect(needsSubcommand(undefined)).toBe(false);
	});
});

describe("building the request", () => {
	/**
	 * An untouched optional field must be absent rather than an empty string — a command reading
	 * `getString(name)` would treat `""` as an answer it was given.
	 */
	it("leaves an empty field out entirely", () => {
		expect(buildArgs([option()], { text: "" })).toEqual({});
	});

	it("sends a number as a number", () => {
		expect(buildArgs([option({ name: "count", type: "integer" })], { count: "7" })).toEqual({ count: 7 });
	});

	it("sends a boolean as a boolean", () => {
		expect(buildArgs([option({ name: "yes", type: "boolean" })], { yes: "true" })).toEqual({ yes: true });
	});

	/** Left as typed, so the server's refusal names the option rather than reporting a NaN nobody sent. */
	it("passes a number that is not one through as it was typed", () => {
		expect(buildArgs([option({ name: "count", type: "integer" })], { count: "abc" })).toEqual({ count: "abc" });
	});

	it("ignores a value for an option the command does not declare", () => {
		expect(buildArgs([option()], { text: "fine", sneaky: "no" })).toEqual({ text: "fine" });
	});
});

describe("whether it can be run yet", () => {
	it("names the required options still empty", () => {
		expect(missingRequired([option({ required: true }), option({ name: "other" })], {})).toEqual(["text"]);
	});

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

	it("allows a command with nothing to fill in", () => {
		expect(canRun(command(), null, {})).toBe(true);
	});
});

describe("hexColour", () => {
	it("pads a short colour to six digits", () => {
		expect(hexColour(0x7c3aed)).toBe("#7c3aed");
		expect(hexColour(0x0000ff)).toBe("#0000ff");
	});

	it("answers null when the embed had no colour", () => {
		expect(hexColour(null)).toBeNull();
	});
});
