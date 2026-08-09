import { MessageFlags } from "discord.js";
import { type Command } from "@core/command";
import { UserFacingError } from "@core/errors";
import {
	ALLOWED_IN_DASHBOARD,
	DashboardInteraction,
	DashboardOptions,
	NEVER_IN_DASHBOARD,
	optionsFor,
	runnableInDashboard,
	serialiseReply,
} from "@lib/commandRunner.util";
import { embed } from "@lib/embeds.util";
import { createMockClient } from "@tests/helpers/mocks";

const OWNER = { id: "100000000000000001", username: "owner" };

function commandWith(overrides: Partial<Command> = {}): Command {
	return {
		name: "demo",
		description: "A demo command.",
		category: "info",
		options: [
			{ name: "text", description: "Some text.", type: "string" },
			{ name: "count", description: "A number.", type: "integer" },
			{ name: "yes", description: "A flag.", type: "boolean" },
			{ name: "who", description: "A user.", type: "user" },
		],
		run: () => Promise.resolve(),
		...overrides,
	};
}

function optionsFrom(args: Record<string, string | number | boolean>, guild: unknown = null): DashboardOptions {
	return new DashboardOptions(createMockClient(), guild as never, commandWith().options ?? [], null, args);
}

describe("the allowlist", () => {
	/** Opting in beats opting out: a command added later must not become web-reachable by accident. */
	it("refuses a command that is not on it", () => {
		expect(runnableInDashboard("ban")).toBe(false);
		expect(runnableInDashboard("levelling")).toBe(false);
	});

	it("allows the ones that are", () => {
		for (const name of ALLOWED_IN_DASHBOARD) expect(runnableInDashboard(name)).toBe(true);
	});

	/**
	 * `/eval` over HTTP turns a stolen session cookie into a shell on the host. The second list exists so that
	 * adding a name to the first one by mistake still cannot reach it.
	 */
	it("refuses the never-list even if something puts it on the allowlist", () => {
		for (const name of NEVER_IN_DASHBOARD) expect(runnableInDashboard(name)).toBe(false);
	});

	it("keeps the two lists disjoint", () => {
		expect(ALLOWED_IN_DASHBOARD.filter((name) => NEVER_IN_DASHBOARD.includes(name))).toEqual([]);
	});
});

describe("reading arguments", () => {
	it("reads a string", () => {
		expect(optionsFrom({ text: "hello" }).getString("text")).toBe("hello");
	});

	it("reads an integer", () => {
		expect(optionsFrom({ count: 7 }).getInteger("count")).toBe(7);
	});

	it("reads a boolean sent either as JSON or as a string", () => {
		expect(optionsFrom({ yes: true }).getBoolean("yes")).toBe(true);
		expect(optionsFrom({ yes: "true" }).getBoolean("yes")).toBe(true);
		expect(optionsFrom({ yes: "no" }).getBoolean("yes")).toBe(false);
	});

	it("answers null for something that was not given", () => {
		expect(optionsFrom({}).getString("text")).toBeNull();
	});

	it("refuses a missing required option with a sentence", () => {
		expect(() => optionsFrom({}).getString("text", true)).toThrow(UserFacingError);
	});

	/**
	 * The declared list is the filter. A hand-written request naming an option the command never declared must
	 * not reach a getter — the form would never have shown it, and neither would Discord.
	 */
	it("drops an argument the command never declared", () => {
		const options = optionsFrom({ text: "fine", sneaky: "not declared" });

		expect(options.getString("sneaky")).toBeNull();
		expect(options.declaredNames).not.toContain("sneaky");
	});

	it("refuses a number that is not one", () => {
		expect(() => optionsFrom({ count: "abc" }).getInteger("count")).toThrow(UserFacingError);
	});

	it("refuses an integer given as a decimal", () => {
		expect(() => optionsFrom({ count: 1.5 }).getInteger("count")).toThrow(UserFacingError);
	});

	/** An id straight off a form reaches a cache lookup, so its shape is checked first. */
	it("refuses an id that is not a snowflake", () => {
		expect(() => optionsFrom({ who: "nonsense" }).getUser("who")).toThrow(UserFacingError);
	});

	it("resolves a user from the cache", () => {
		const client = createMockClient();
		client.users.cache.set(OWNER.id, OWNER as never);
		const options = new DashboardOptions(client, null, commandWith().options ?? [], null, { who: OWNER.id });

		expect(options.getUser("who")).toBe(OWNER);
	});

	it("resolves a channel and a role out of the guild it was given", () => {
		const channel = { id: "400000000000000001", name: "general" };
		const role = { id: "300000000000000001", name: "Member" };
		const guild = {
			channels: { cache: new Map([[channel.id, channel]]) },
			roles: { cache: new Map([[role.id, role]]) },
		};
		const declared = [
			{ name: "where", description: "A channel.", type: "channel" as const },
			{ name: "which", description: "A role.", type: "role" as const },
		];
		const options = new DashboardOptions(createMockClient(), guild as never, declared, null, {
			where: channel.id,
			which: role.id,
		});

		expect(options.getChannel("where")).toBe(channel);
		expect(options.getRole("which")).toBe(role);
	});

	/** Running without a server is legal for most of the allowlist, so a lookup then has nothing to find. */
	it("answers null for a channel when there is no server", () => {
		const declared = [{ name: "where", description: "A channel.", type: "channel" as const }];
		const options = new DashboardOptions(createMockClient(), null, declared, null, {
			where: "400000000000000001",
		});

		expect(options.getChannel("where")).toBeNull();
		expect(() => options.getChannel("where", true)).toThrow(UserFacingError);
	});

	it("answers null for a user Discord has not cached", () => {
		expect(optionsFrom({ who: "100000000000000099" }).getUser("who")).toBeNull();
	});

	/** There is no upload over this endpoint, and a command needing one should say so rather than get nothing. */
	it("refuses a required attachment plainly", () => {
		expect(() => optionsFrom({}).getAttachment("file", true)).toThrow(/cannot be sent from here/);
	});

	it("answers null for an optional attachment", () => {
		expect(optionsFrom({}).getAttachment("file")).toBeNull();
	});
});

describe("optionsFor", () => {
	const parent = commandWith({
		options: undefined,
		subcommands: [
			{
				name: "info",
				description: "Info.",
				options: [{ name: "deep", description: "x", type: "string" }],
				run: jest.fn(),
			},
		],
	} as never);

	it("reads a subcommand's own options", () => {
		expect(optionsFor(parent, "info").map((option) => option.name)).toEqual(["deep"]);
	});

	it("refuses a subcommand the command does not have", () => {
		expect(() => optionsFor(parent, "nope")).toThrow(UserFacingError);
	});

	it("reads the top-level options when no subcommand is named", () => {
		expect(optionsFor(commandWith(), null).map((option) => option.name)).toContain("text");
	});
});

describe("the interaction adapter", () => {
	function interactionFor(request = { args: {} }): DashboardInteraction {
		return new DashboardInteraction(createMockClient(), commandWith(), OWNER as never, null, request);
	}

	it("captures a reply instead of sending it", async () => {
		const interaction = interactionFor();
		await interaction.reply({ content: "done" });

		expect(interaction.captured).toEqual([{ content: "done" }]);
		expect(interaction.replied).toBe(true);
	});

	it("captures an edit after a defer, so a two-step command still answers", async () => {
		const interaction = interactionFor();
		await interaction.deferReply();
		await interaction.editReply({ content: "eventually" });

		expect(interaction.deferred).toBe(true);
		expect(interaction.captured).toEqual([{ content: "eventually" }]);
	});

	it("captures a follow-up as another block", async () => {
		const interaction = interactionFor();
		await interaction.reply({ content: "first" });
		await interaction.followUp({ content: "second" });

		expect(interaction.captured).toHaveLength(2);
	});

	/** A modal is a second Discord round trip. There is nowhere for it to go, so it says so. */
	it("refuses a modal rather than hanging", () => {
		expect(() => interactionFor().showModal()).toThrow(UserFacingError);
	});

	/** There is no channel behind an HTTP request, and a command reading one should get null, not a fake. */
	it("has no channel", () => {
		expect(interactionFor().channel).toBeNull();
	});
});

describe("serialising what a command replied with", () => {
	it("turns content into a text block", () => {
		expect(serialiseReply({ content: "pong" })).toEqual([{ kind: "text", content: "pong" }]);
	});

	it("accepts a bare string, which `editReply` allows", () => {
		expect(serialiseReply("pong")).toEqual([{ kind: "text", content: "pong" }]);
	});

	it("flattens an embed built by the bot into fields a browser can draw", () => {
		const built = embed({
			category: "owner",
			title: "Servers",
			description: "Two of them",
			fields: [{ name: "First", value: "one", inline: true }],
		});

		expect(serialiseReply({ embeds: [built] })).toEqual([
			expect.objectContaining({
				kind: "embed",
				title: "Servers",
				description: "Two of them",
				fields: [{ name: "First", value: "one", inline: true }],
			}),
		]);
	});

	/**
	 * A button posts back to Discord's interaction endpoint and is meaningless in a browser — but a reader who
	 * cannot see that the reply had controls would think the command did less than it did.
	 */
	it("names dropped buttons rather than hiding them", () => {
		const outputs = serialiseReply({ content: "pick one", components: [{ type: 1 }] });

		expect(outputs).toContainEqual({ kind: "dropped", what: "buttons" });
	});

	it("says when what was dropped was a Components V2 panel", () => {
		const outputs = serialiseReply({
			components: [{ type: 17 } as never],
			flags: MessageFlags.IsComponentsV2,
		} as never);

		expect(outputs).toContainEqual({ kind: "dropped", what: "a Components V2 panel" });
	});

	it("names a dropped attachment", () => {
		expect(serialiseReply({ files: ["card.png"] })).toContainEqual({ kind: "dropped", what: "an attachment" });
	});

	it("yields nothing for an empty reply rather than an empty block", () => {
		expect(serialiseReply({ content: "" })).toEqual([]);
	});
});
