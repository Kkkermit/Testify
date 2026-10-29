import {
	type CommandInput,
	asMember,
	asSubcommand,
	buildSlashCommand,
	channelOption,
	type Command,
	inGuild,
	inTextChannel,
	roleOption,
	textChannelOption,
} from "@core/command";
import { UserFacingError } from "@core/errors";
import {
	CHANNEL_ID,
	createMockChannel,
	createMockGuild,
	createMockInteraction,
	mockCollection,
} from "@tests/helpers/mocks";

const base: Command = { name: "demo", description: "A demo command.", category: "info", run: () => Promise.resolve() };

describe("inGuild", () => {
	it("refuses in a direct message", () => {
		const interaction = createMockInteraction({ inGuild: false });
		expect(() => inGuild(interaction as unknown as CommandInput)).toThrow(UserFacingError);
	});
});

describe("asMember", () => {
	it("refuses in a direct message", () => {
		const interaction = createMockInteraction({ inGuild: false });
		expect(() => asMember(interaction as unknown as CommandInput)).toThrow(UserFacingError);
	});

	/** An API partial has no `guild`, so it is not a member that can be acted on. */
	it("refuses a partial member object", () => {
		const interaction = createMockInteraction({ overrides: { member: { id: "1" } } as never });
		expect(() => asMember(interaction as unknown as CommandInput)).toThrow(UserFacingError);
	});
});

describe("inTextChannel", () => {
	it("refuses a DM channel", () => {
		const interaction = createMockInteraction({ overrides: { channel: { id: "dm" } } as never });
		expect(() => inTextChannel(interaction as unknown as CommandInput)).toThrow(UserFacingError);
	});

	it("refuses when there is no channel at all", () => {
		const interaction = createMockInteraction({ overrides: { channel: null } });
		expect(() => inTextChannel(interaction as unknown as CommandInput)).toThrow(UserFacingError);
	});
});

describe("the option resolvers", () => {
	function interactionWith(picked: unknown, cached: [string, unknown][]): CommandInput {
		const guild = createMockGuild({ channels: { cache: mockCollection(cached) } } as never);
		(guild as { roles: unknown }).roles = { cache: mockCollection(cached) };

		return createMockInteraction({
			overrides: {
				guild,
				options: {
					getChannel: jest.fn(() => picked),
					getRole: jest.fn(() => picked),
				},
			} as never,
		});
	}

	describe("textChannelOption", () => {
		/** The API stub cannot be sent to; the cached channel can. */
		it("resolves the API stub to the real cached channel", () => {
			const real = createMockChannel({ id: CHANNEL_ID });
			const resolved = textChannelOption(
				interactionWith({ id: CHANNEL_ID, name: "general" }, [[CHANNEL_ID, real]]),
				"c",
			);

			expect(resolved).toBe(real);
		});

		it("refuses a channel it cannot post in", () => {
			const voice = { id: CHANNEL_ID, isTextBased: () => false };
			expect(() =>
				textChannelOption(interactionWith({ id: CHANNEL_ID, name: "Voice" }, [[CHANNEL_ID, voice]]), "c"),
			).toThrow(/not a channel I can send messages in/);
		});

		it("refuses a channel that is not in the cache", () => {
			expect(() => textChannelOption(interactionWith({ id: "gone", name: "gone" }, []), "c")).toThrow(UserFacingError);
		});
	});

	describe("channelOption", () => {
		it("refuses a channel that is not in this server", () => {
			expect(() => channelOption(interactionWith({ id: "gone" }, []), "c")).toThrow(UserFacingError);
		});
	});

	describe("roleOption", () => {
		it("refuses a role that is not in this server", () => {
			expect(() => roleOption(interactionWith({ id: "gone" }, []), "r")).toThrow(UserFacingError);
		});
	});
});

describe("asSubcommand", () => {
	/** Folding `/meme` into `/lookup meme` must not break `t?meme`. */
	it("keeps the old name as a prefix alias", () => {
		expect(asSubcommand(base).aliases).toContain("demo");
	});

	/** Discord allows only one level of nesting. */
	it("refuses a command that already has subcommands", () => {
		const nested = { ...base, subcommands: [{ name: "a", description: "d", run: jest.fn() }] };
		expect(() => asSubcommand(nested)).toThrow(/only allows one level/);
	});

	it("refuses a command with nothing to run", () => {
		expect(() => asSubcommand({ name: "x", description: "d", category: "info" })).toThrow(/no run function/);
	});
});

describe("buildSlashCommand", () => {
	const build = (options: NonNullable<Command["options"]>): Record<string, unknown> =>
		buildSlashCommand({ ...base, options }).toJSON() as unknown as Record<string, unknown>;

	/** An owner-only command such as `/eval` stays out of the slash menu for everybody but a server's administrators. */
	it("hides an owner-only command from members", () => {
		const json = buildSlashCommand({ ...base, ownerOnly: true }).toJSON();
		expect(json.default_member_permissions).toBe("0");
	});

	it.each([
		["string", 3],
		["integer", 4],
		["boolean", 5],
		["user", 6],
		["channel", 7],
		["role", 8],
		["number", 10],
		["attachment", 11],
	])("builds a %s option", (type, apiType) => {
		const json = build([{ name: "o", description: "d", type: type as never }]);
		expect((json.options as { type: number }[])[0]?.type).toBe(apiType);
	});

	/** The builder emits options in the order they were declared — it does not sort them. */
	it("emits options in the order they were declared", () => {
		const json = build([
			{ name: "a", description: "d", type: "string" },
			{ name: "b", description: "d", type: "string", required: true },
		]);

		expect((json.options as { name: string }[]).map((option) => option.name)).toEqual(["a", "b"]);
	});
});
