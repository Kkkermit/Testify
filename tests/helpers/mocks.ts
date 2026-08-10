import {
	type ChatInputCommandInteraction,
	Collection,
	type Guild,
	type GuildMember,
	type Message,
	type Role,
	type TextChannel,
	type User,
} from "discord.js";
import { type TestifyClient } from "@core/client";
import { createLogger } from "@core/logger";

/** Mock factories, one per surface, with every method already stubbed. */

/** Applies overrides so that an explicit `null`, `0` or `false` wins. */
/**
 * `User`, `Role` and `GuildMember` type `toString()` as a template literal, which an object literal cannot satisfy.
 */
export type Overrides<T> = Partial<Omit<T, "toString" | "valueOf">>;

function merge<T extends object>(defaults: T, overrides: Overrides<T> = {}): T {
	const result = { ...defaults };

	for (const key of Object.keys(overrides) as (keyof T)[]) {
		if (Object.hasOwn(overrides, key)) result[key] = (overrides as Partial<T>)[key] as T[keyof T];
	}

	return result;
}

/** A discord.js Collection with the `find`/`first` helpers tests rely on. */
export function mockCollection<V>(entries: [string, V][] = []): Collection<string, V> {
	return new Collection<string, V>(entries);
}

export const OWNER_ID = "100000000000000001";
export const USER_ID = "200000000000000002";
export const GUILD_ID = "400000000000000004";
export const CHANNEL_ID = "500000000000000005";
export const ROLE_ID = "600000000000000006";
export const BOT_ID = "700000000000000007";

export function createMockUser(overrides: Overrides<User> = {}): User {
	return merge(
		{
			id: USER_ID,
			username: "alice",
			bot: false,
			displayAvatarURL: jest.fn(() => "https://cdn.discord/avatar.png"),
			toString: () => `<@${USER_ID}>`,
			send: jest.fn(() => Promise.resolve({ id: "dm" })),
		} as unknown as User,
		overrides,
	);
}

export function createMockRole(overrides: Overrides<Role> = {}): Role {
	return merge(
		{
			id: ROLE_ID,
			name: "Staff",
			position: 5,
			hexColor: "#5865f2",
			members: mockCollection(),
			toString: () => `<@&${ROLE_ID}>`,
		} as unknown as Role,
		overrides,
	);
}

export function createMockChannel(overrides: Overrides<TextChannel> = {}): TextChannel {
	return merge(
		{
			id: CHANNEL_ID,
			name: "general",
			nsfw: false,
			isTextBased: jest.fn(() => true),
			isSendable: jest.fn(() => true),
			send: jest.fn(() => Promise.resolve({ id: "sent" })),
			sendTyping: jest.fn(() => Promise.resolve()),
			bulkDelete: jest.fn(() => Promise.resolve(mockCollection())),
			permissionOverwrites: { edit: jest.fn(() => Promise.resolve()) },
			setRateLimitPerUser: jest.fn(() => Promise.resolve()),
		} as unknown as TextChannel,
		overrides,
	);
}

export function createMockMember(overrides: Overrides<GuildMember> = {}): GuildMember {
	const user = createMockUser();

	return merge(
		{
			id: user.id,
			user,
			displayName: user.username,
			manageable: true,
			bannable: true,
			kickable: true,
			moderatable: true,
			roles: { cache: mockCollection(), add: jest.fn(), remove: jest.fn() },
			permissions: { has: jest.fn(() => true), missing: jest.fn(() => []) },
			voice: { channel: null },
			toString: () => `<@${user.id}>`,
		} as unknown as GuildMember,
		overrides,
	);
}

export function createMockGuild(overrides: Overrides<Guild> = {}): Guild {
	const member = createMockMember();
	const role = createMockRole();
	const channel = createMockChannel();

	return merge(
		{
			id: GUILD_ID,
			name: "Test Server",
			ownerId: OWNER_ID,
			memberCount: 42,
			members: {
				cache: mockCollection([[member.id, member]]),
				fetch: jest.fn(() => Promise.resolve(member)),
				me: member,
			},
			channels: { cache: mockCollection([[channel.id, channel]]), create: jest.fn(() => Promise.resolve(channel)) },
			roles: { cache: mockCollection([[role.id, role]]), everyone: { id: GUILD_ID } },
			bans: { fetch: jest.fn(() => Promise.resolve(null)) },
			iconURL: jest.fn(() => "https://cdn.discord/icon.png"),
		} as unknown as Guild,
		overrides,
	);
}

export function createMockClient(overrides: Overrides<TestifyClient> = {}): TestifyClient {
	return merge(
		{
			commands: new Collection(),
			aliases: new Collection(),
			buttons: new Collection(),
			messageHandlers: [],
			logger: createLogger("fatal", false),
			env: { DISCORD_OWNER_IDS: [OWNER_ID] },
			isOwner: jest.fn((id: string) => id === OWNER_ID),
			user: {
				id: BOT_ID,
				username: "Testify",
				displayAvatarURL: jest.fn(() => "https://cdn.discordapp.com/avatars/bot.png"),
				setStatus: jest.fn(),
				setPresence: jest.fn(),
			},
			users: { cache: mockCollection() },
			guilds: { cache: mockCollection() },
			channels: { cache: mockCollection() },
			ws: { ping: 42, shards: mockCollection() },
			uptime: 60_000,
			startedAt: Date.now() - 60_000,
			timers: { every: jest.fn(), after: jest.fn(), stop: jest.fn(), stopAll: jest.fn(), names: jest.fn(() => []) },
			on: jest.fn(),
			once: jest.fn(),
		} as unknown as TestifyClient,
		overrides,
	);
}

/** What the option getters should answer, keyed by option name. */
export type MockOptions = Record<string, string | number | boolean | User | Role | TextChannel | null>;

function optionResolver(values: MockOptions, subcommand: string | null): Record<string, jest.Mock> {
	const get = (name: string): unknown => values[name] ?? null;

	return {
		getSubcommand: jest.fn(() => subcommand ?? ""),
		getString: jest.fn((name: string) => get(name) as string | null),
		getInteger: jest.fn((name: string) => get(name) as number | null),
		getNumber: jest.fn((name: string) => get(name) as number | null),
		getBoolean: jest.fn((name: string) => get(name) as boolean | null),
		getUser: jest.fn((name: string) => get(name) as User | null),
		getMember: jest.fn((name: string) => get(name)),
		getRole: jest.fn((name: string) => get(name) as Role | null),
		getChannel: jest.fn((name: string) => get(name) as TextChannel | null),
		getAttachment: jest.fn((name: string) => get(name)),
		getFocused: jest.fn(() => ""),
	};
}

export interface MockInteractionSetup {
	options?: MockOptions;
	subcommand?: string | null;
	inGuild?: boolean;
	overrides?: Overrides<ChatInputCommandInteraction>;
}

/** A slash interaction. */
export function createMockInteraction(setup: MockInteractionSetup = {}): ChatInputCommandInteraction & {
	sent: Record<string, unknown>[];
} {
	const { options = {}, subcommand = null, inGuild = true, overrides = {} } = setup;

	const sent: Record<string, unknown>[] = [];
	const guild = inGuild ? createMockGuild() : null;
	const record = (payload: Record<string, unknown>): Promise<{ id: string }> => {
		sent.push(payload);
		return Promise.resolve({ id: "reply" });
	};

	const base = {
		sent,
		commandName: "test",
		user: createMockUser(),
		member: inGuild ? createMockMember() : null,
		guild,
		guildId: guild?.id ?? null,
		channel: createMockChannel(),
		client: createMockClient(),
		options: optionResolver(options, subcommand),
		deferred: false,
		replied: false,
		deferReply: jest.fn(() => Promise.resolve({ id: "deferred" })),
		reply: jest.fn(record),
		editReply: jest.fn(record),
		followUp: jest.fn(record),
		fetchReply: jest.fn(() => Promise.resolve({ id: "reply" })),
		respond: jest.fn(() => Promise.resolve()),
		isChatInputCommand: jest.fn(() => true),
	} as unknown as ChatInputCommandInteraction & { sent: Record<string, unknown>[] };

	return merge(base, overrides as Overrides<typeof base>);
}

/** The same, for a command invoked through its subcommand. */
export function createMockSubcommandInteraction(
	subcommand: string,
	setup: Omit<MockInteractionSetup, "subcommand"> = {},
): ReturnType<typeof createMockInteraction> {
	return createMockInteraction({ ...setup, subcommand });
}

export interface MockMessageSetup {
	content?: string;
	inGuild?: boolean;
	mentions?: User[];
	attachments?: { url: string }[];
	overrides?: Overrides<Message>;
}

/** A message, for the prefix surface. */
export function createMockMessage(setup: MockMessageSetup = {}): Message & { sent: Record<string, unknown>[] } {
	const { content = "", inGuild = true, mentions = [], attachments = [], overrides = {} } = setup;

	const sent: Record<string, unknown>[] = [];
	const author = createMockUser();
	const guild = inGuild ? createMockGuild() : null;

	const base = {
		sent,
		content,
		system: false,
		webhookId: null,
		author,
		member: inGuild ? createMockMember() : null,
		guild,
		guildId: guild?.id ?? null,
		channelId: CHANNEL_ID,
		channel: createMockChannel(),
		client: createMockClient(),
		mentions: { users: mockCollection(mentions.map((user) => [user.id, user])) },
		attachments: mockCollection(attachments.map((file, index) => [String(index), file])),
		reply: jest.fn((payload: Record<string, unknown>) => {
			sent.push(payload);
			return Promise.resolve({
				id: "reply",
				edit: jest.fn((next: Record<string, unknown>) => {
					sent.push(next);
					return Promise.resolve({ id: "reply" });
				}),
			});
		}),
		react: jest.fn(() => Promise.resolve()),
		delete: jest.fn(() => Promise.resolve()),
	} as unknown as Message & { sent: Record<string, unknown>[] };

	return merge(base, overrides as Overrides<typeof base>);
}

/** A Mongoose model stub. */
export interface MockQuery {
	lean: jest.Mock<MockQuery>;
	sort: jest.Mock<MockQuery>;
	skip: jest.Mock<MockQuery>;
	limit: jest.Mock<MockQuery>;
	exec: jest.Mock<Promise<unknown>>;
}

export function createMockModel<T>(
	defaultDoc: T | null = null,
	methodOverrides: Record<string, unknown> = {},
): Record<string, unknown> {
	const chain = (value: unknown): MockQuery => ({
		lean: jest.fn((): MockQuery => chain(value)),
		sort: jest.fn((): MockQuery => chain(value)),
		skip: jest.fn((): MockQuery => chain(value)),
		limit: jest.fn((): MockQuery => chain(value)),
		exec: jest.fn(() => Promise.resolve(value)),
	});

	const defaults = {
		findOne: jest.fn(() => chain(defaultDoc)),
		find: jest.fn(() => chain(defaultDoc === null ? [] : [defaultDoc])),
		findOneAndUpdate: jest.fn(() => chain(defaultDoc)),
		updateOne: jest.fn(() => chain({ modifiedCount: 1 })),
		deleteOne: jest.fn(() => chain({ deletedCount: 1 })),
		deleteMany: jest.fn(() => chain({ deletedCount: 1 })),
		create: jest.fn(() => Promise.resolve(defaultDoc)),
		countDocuments: jest.fn(() => chain(0)),
		aggregate: jest.fn(() => Promise.resolve([])),
	};

	return merge(defaults as Record<string, unknown>, methodOverrides);
}
