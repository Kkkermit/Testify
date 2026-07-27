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
	subcommandsOf,
	textChannelOption,
} from "@core/command";
import { UserFacingError } from "@core/errors";
import {
	CHANNEL_ID,
	createMockChannel,
	createMockGuild,
	createMockInteraction,
	createMockRole,
	mockCollection,
	ROLE_ID,
} from "@tests/helpers/mocks";

const base: Command = { name: "demo", description: "A demo command.", category: "info", run: () => Promise.resolve() };

describe("inGuild", () => {
	it("returns the guild inside a server", () => {
		expect(inGuild(createMockInteraction() as unknown as CommandInput)).toBeDefined();
	});

	it("refuses in a direct message", () => {
		const interaction = createMockInteraction({ inGuild: false });
		expect(() => inGuild(interaction as unknown as CommandInput)).toThrow(UserFacingError);
	});
});

describe("asMember", () => {
	it("returns the member inside a server", () => {
		const guild = createMockGuild();
		const interaction = createMockInteraction({ overrides: { member: { guild, id: "1" } } as never });

		expect(asMember(interaction as unknown as CommandInput)).toBeDefined();
	});

	it("refuses in a direct message", () => {
		const interaction = createMockInteraction({ inGuild: false });
		expect(() => asMember(interaction as unknown as CommandInput)).toThrow(UserFacingError);
	});

	/** An API partial has no `guild`, so it is not a member we can act on. */
	it("refuses a partial member object", () => {
		const interaction = createMockInteraction({ overrides: { member: { id: "1" } } as never });
		expect(() => asMember(interaction as unknown as CommandInput)).toThrow(UserFacingError);
	});
});

describe("inTextChannel", () => {
	it("returns a guild channel", () => {
		const interaction = createMockInteraction({
			overrides: { channel: { guild: createMockGuild(), id: CHANNEL_ID } } as never,
		});

		expect(inTextChannel(interaction as unknown as CommandInput)).toBeDefined();
	});

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
		it("returns null when the option was not supplied", () => {
			expect(textChannelOption(interactionWith(null, []), "channel")).toBeNull();
		});

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
		it("returns null when the option was not supplied", () => {
			expect(channelOption(interactionWith(null, []), "channel")).toBeNull();
		});

		it("accepts any channel type, not just text", () => {
			const voice = { id: CHANNEL_ID, isTextBased: () => false };
			expect(channelOption(interactionWith({ id: CHANNEL_ID }, [[CHANNEL_ID, voice]]), "c")).toBe(voice);
		});

		it("refuses a channel that is not in this server", () => {
			expect(() => channelOption(interactionWith({ id: "gone" }, []), "c")).toThrow(UserFacingError);
		});
	});

	describe("roleOption", () => {
		it("returns null when the option was not supplied", () => {
			expect(roleOption(interactionWith(null, []), "role")).toBeNull();
		});

		it("resolves to the cached role", () => {
			const role = createMockRole({ id: ROLE_ID });
			expect(roleOption(interactionWith({ id: ROLE_ID }, [[ROLE_ID, role]]), "r")).toBe(role);
		});

		it("refuses a role that is not in this server", () => {
			expect(() => roleOption(interactionWith({ id: "gone" }, []), "r")).toThrow(UserFacingError);
		});
	});
});

describe("subcommandsOf", () => {
	it("returns an empty list for a plain command", () => {
		expect(subcommandsOf(base)).toEqual([]);
	});

	it("returns the subcommands when there are some", () => {
		const withSubs = { ...base, subcommands: [{ name: "a", description: "d", run: jest.fn() }] };
		expect(subcommandsOf(withSubs)).toHaveLength(1);
	});
});

describe("asSubcommand", () => {
	it("keeps the name and description", () => {
		const folded = asSubcommand(base);

		expect(folded.name).toBe("demo");
		expect(folded.description).toBe("A demo command.");
	});

	/** Folding `/meme` into `/lookup meme` must not break `t?meme`. */
	it("keeps the old name as a prefix alias", () => {
		expect(asSubcommand(base).aliases).toContain("demo");
	});

	it("keeps the command's own aliases and any extra ones", () => {
		const folded = asSubcommand({ ...base, aliases: ["d"] }, ["demonstrate"]);

		expect(folded.aliases).toEqual(expect.arrayContaining(["demo", "d", "demonstrate"]));
	});

	it("carries the options across", () => {
		const options = [{ name: "x", description: "d", type: "string" as const }];
		expect(asSubcommand({ ...base, options }).options).toEqual(options);
	});

	it("still runs the original command", async () => {
		const run = jest.fn(() => Promise.resolve());
		await asSubcommand({ ...base, run }).run({} as never, {} as never);

		expect(run).toHaveBeenCalled();
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

	it("names and describes the command", () => {
		expect(build([])).toMatchObject({ name: "demo", description: "A demo command." });
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

	/**
	 * The builder emits options in the order they were declared — it does not sort
	 * them. Discord rejects the whole payload when a required option follows an
	 * optional one, and that rule is enforced against every real command in
	 * `tests/core/loader.test.ts` rather than silently corrected here.
	 */
	it("emits options in the order they were declared", () => {
		const json = build([
			{ name: "a", description: "d", type: "string" },
			{ name: "b", description: "d", type: "string", required: true },
		]);

		expect((json.options as { name: string }[]).map((option) => option.name)).toEqual(["a", "b"]);
	});

	it("carries min and max onto a number option", () => {
		const json = build([{ name: "n", description: "d", type: "integer", min: 1, max: 10 }]);
		const option = (json.options as Record<string, unknown>[])[0];

		expect(option).toMatchObject({ min_value: 1, max_value: 10 });
	});

	it("carries choices onto a string option", () => {
		const json = build([{ name: "s", description: "d", type: "string", choices: [{ name: "One", value: "one" }] }]);

		expect((json.options as { choices: unknown[] }[])[0]?.choices).toHaveLength(1);
	});

	it("marks an option as autocompleting instead of listing choices", () => {
		const json = build([{ name: "s", description: "d", type: "string", autocomplete: true }]);
		expect((json.options as { autocomplete?: boolean }[])[0]?.autocomplete).toBe(true);
	});

	it("builds subcommands rather than top-level options", () => {
		const { run: _unused, ...withoutRun } = base;
		const json = buildSlashCommand({
			...withoutRun,
			subcommands: [{ name: "sub", description: "A sub.", run: jest.fn() }],
		}).toJSON() as unknown as Record<string, unknown>;

		expect((json.options as { type: number; name: string }[])[0]).toMatchObject({ type: 1, name: "sub" });
	});
});
