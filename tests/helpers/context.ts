import { Collection } from "discord.js";
import { type SharedCommand } from "../../src/core/command";
import { type CommandContext, type ReplyOptions, type ResolvedOptions, type Surface } from "../../src/core/context";
import { type TestifyClient } from "../../src/core/client";
import { createLogger } from "../../src/core/logger";
import { MessagePipeline } from "../../src/core/messagePipeline";
import { TimerRegistry } from "../../src/core/timers";

export interface MockOptionValues {
	strings?: Record<string, string>;
	integers?: Record<string, number>;
	booleans?: Record<string, boolean>;
	users?: Record<string, { id: string; username: string; bot?: boolean }>;
	subcommand?: string | null;
}

const logger = createLogger({ level: "fatal", pretty: false });

export function createMockClient(overrides: Partial<TestifyClient> = {}): TestifyClient {
	const state = new Map<string, unknown>();

	const client = {
		commands: new Collection<string, SharedCommand>(),
		aliases: new Collection<string, string>(),
		components: new Collection(),
		logger,
		timers: new TimerRegistry(logger),
		messages: new MessagePipeline(logger),
		startedAt: Date.now() - 60_000,
		state,
		env: {
			NODE_ENV: "test",
			LOG_LEVEL: "fatal",
			DISCORD_TOKEN: "token",
			DISCORD_CLIENT_ID: "123456789012345678",
			DISCORD_OWNER_IDS: ["111111111111111111"],
			MONGODB_URI: "mongodb://localhost/test",
			OAUTH_PORT: 3000,
		},
		user: { id: "999999999999999999", username: "Testify" },
		ws: { ping: 42 },
		isOwner(userId: string) {
			return userId === "111111111111111111";
		},
		featureState<T>(key: string, create: () => T): T {
			const existing = state.get(key);
			if (existing !== undefined) return existing as T;
			const created = create();
			state.set(key, created);
			return created;
		},
		resolveCommand(this: TestifyClient, name: string) {
			return this.commands.get(name) ?? this.commands.get(this.aliases.get(name) ?? "");
		},
		...overrides,
	} as unknown as TestifyClient;

	return client;
}

export interface MockContext extends CommandContext {
	replies: ReplyOptions[];
	followUps: ReplyOptions[];
	edits: ReplyOptions[];
}

/**
 * Testing a command no longer means faking a whole Interaction — this is the
 * payoff of the CommandContext abstraction.
 */
export function createMockContext(
	config: {
		client?: TestifyClient;
		surface?: Surface;
		commandName?: string;
		guildId?: string | null;
		userId?: string;
		options?: MockOptionValues;
	} = {},
): MockContext {
	const client = config.client ?? createMockClient();
	const values = config.options ?? {};
	const replies: ReplyOptions[] = [];
	const followUps: ReplyOptions[] = [];
	const edits: ReplyOptions[] = [];

	const normalise = (input: ReplyOptions | string): ReplyOptions =>
		typeof input === "string" ? { content: input } : input;

	const options: ResolvedOptions = {
		getString: ((name: string, required?: boolean) => {
			const value = values.strings?.[name] ?? null;
			if (value === null && required === true) throw new Error(`Missing ${name}`);
			return value;
		}) as ResolvedOptions["getString"],
		getInteger: ((name: string, required?: boolean) => {
			const value = values.integers?.[name] ?? null;
			if (value === null && required === true) throw new Error(`Missing ${name}`);
			return value;
		}) as ResolvedOptions["getInteger"],
		getNumber: ((name: string) => values.integers?.[name] ?? null) as ResolvedOptions["getNumber"],
		getBoolean: ((name: string) => values.booleans?.[name] ?? null) as ResolvedOptions["getBoolean"],
		getUser: ((name: string, required?: boolean) => {
			const value = values.users?.[name] ?? null;
			if (value === null && required === true) throw new Error(`Missing ${name}`);
			return value;
		}) as unknown as ResolvedOptions["getUser"],
		getMember: () => null,
		getChannel: () => null,
		getRole: () => null,
		getAttachmentUrl: () => null,
		getSubcommand: () => values.subcommand ?? null,
		getSubcommandGroup: () => null,
		rest: () => "",
	};

	const guildId = config.guildId === undefined ? "222222222222222222" : config.guildId;

	return {
		client,
		surface: config.surface ?? "slash",
		commandName: config.commandName ?? "test",
		guild: guildId === null ? null : { id: guildId, name: "Test guild" },
		channel: { id: "333333333333333333", isSendable: () => true } as unknown as CommandContext["channel"],
		user: {
			id: config.userId ?? "444444444444444444",
			username: "tester",
			displayName: "Tester",
			bot: false,
			displayAvatarURL: () => "https://example.invalid/avatar.png",
			toString: () => `<@${config.userId ?? "444444444444444444"}>`,
		} as unknown as CommandContext["user"],
		member: null,
		options,
		message: null,
		locale: "en-GB",
		deferred: false,
		replied: replies.length > 0,
		replies,
		followUps,
		edits,
		reply: (input) => {
			replies.push(normalise(input));
			return Promise.resolve();
		},
		defer: () => Promise.resolve(),
		editReply: (input) => {
			edits.push(normalise(input));
			return Promise.resolve();
		},
		followUp: (input) => {
			followUps.push(normalise(input));
			return Promise.resolve();
		},
		deleteReply: () => Promise.resolve(),
		fetchReply: () => Promise.resolve(null),
	} as MockContext;
}
