import { ChannelType, Collection, PermissionFlagsBits } from "discord.js";
import mongoose from "mongoose";
import { createApi } from "@api/server";
import { type TestifyClient } from "@core/client";
import { findSession } from "@database/repositories/dashboardSessionRepository";
import { API_ENV, type Answer, ask, sessionOf } from "@tests/helpers/apiHarness";
import { createMockClient, createMockRole, grantableRoles } from "@tests/helpers/mocks";

/** A manager of this server, reaching through the dashboard for more than Discord would let them do themselves. */

jest.mock("@database/connection", () => ({ databaseConnected: jest.fn(() => true) }));
jest.mock("@database/repositories/dashboardSessionRepository", () => ({
	...jest.requireActual<object>("@database/repositories/dashboardSessionRepository"),
	findSession: jest.fn(),
	touchSession: jest.fn(() => Promise.resolve()),
}));

const GUILD = "900000000000000001";
const BOT_OWNER = "100000000000000001";
const MANAGER = "100000000000000002";
const MODERATOR = "100000000000000003";
const SERVER_OWNER = "100000000000000004";
const TARGET = "100000000000000005";

const OPEN = "400000000000000001";
const READ_ONLY = "400000000000000002";
const HIDDEN = "400000000000000003";
const VOICE = "400000000000000004";
const ELSEWHERE = "400000000000000009";

const BELOW_YOU = "300000000000000002";
const ABOVE_YOU = "300000000000000007";
const MANAGED = "300000000000000008";
const ABOVE_BOT = "300000000000000099";
const NOT_A_ROLE = "300000000000000055";

function channel(id: string, type: ChannelType): unknown {
	return {
		id,
		type,
		isTextBased: () => true,
		isVoiceBased: () => type === ChannelType.GuildVoice,
	};
}

/** What each person may do in each channel: the manager and moderator can read everything but post only in #open. */
function permissionsIn(channelId: string): { has: (flag: bigint) => boolean } {
	return {
		has: (flag) => channelId !== HIDDEN && (flag !== PermissionFlagsBits.SendMessages || channelId === OPEN),
	};
}

function member(id: string, flags: bigint[], highest: number): unknown {
	return {
		id,
		permissions: { has: (wanted: bigint | bigint[]) => [wanted].flat().every((flag) => flags.includes(flag)) },
		permissionsIn: (target: { id: string }) => permissionsIn(target.id),
		roles: { highest: { position: highest } },
	};
}

const MODERATOR_FLAGS = [
	PermissionFlagsBits.ManageGuild,
	PermissionFlagsBits.KickMembers,
	PermissionFlagsBits.BanMembers,
	PermissionFlagsBits.ModerateMembers,
	PermissionFlagsBits.ManageRoles,
	PermissionFlagsBits.ManageNicknames,
	PermissionFlagsBits.Administrator,
];

function clientFor(): TestifyClient {
	const roles = grantableRoles();
	roles.set(GUILD, createMockRole({ id: GUILD, name: "@everyone", position: 0, managed: false }));
	roles.set(MANAGED, createMockRole({ id: MANAGED, name: "Bot role", position: 8, managed: true }));
	roles.set(ABOVE_BOT, createMockRole({ id: ABOVE_BOT, name: "Admin", position: 60, managed: false }));

	const people: Record<string, unknown> = {
		[MANAGER]: member(MANAGER, [PermissionFlagsBits.ManageGuild], 5),
		[MODERATOR]: member(MODERATOR, MODERATOR_FLAGS, 5),
		[SERVER_OWNER]: member(SERVER_OWNER, MODERATOR_FLAGS, 1),
	};
	const guild = {
		id: GUILD,
		name: "Test Server",
		ownerId: SERVER_OWNER,
		roles: { cache: roles },
		channels: {
			cache: new Collection([
				[OPEN, channel(OPEN, ChannelType.GuildText)],
				[READ_ONLY, channel(READ_ONLY, ChannelType.GuildText)],
				[HIDDEN, channel(HIDDEN, ChannelType.GuildText)],
				[VOICE, channel(VOICE, ChannelType.GuildVoice)],
			]),
		},
		members: {
			me: { roles: { highest: { position: 50 } } },
			fetch: (id: string) => (id in people ? Promise.resolve(people[id]) : Promise.reject(new Error("Unknown Member"))),
		},
	};

	return createMockClient({
		guilds: { cache: new Collection([[GUILD, guild]]) },
		isOwner: (id: string) => id === BOT_OWNER,
	} as unknown as Partial<TestifyClient>);
}

function asking(who: string, method: string, path: string, body: unknown = {}): Promise<Answer> {
	return ask(createApi(clientFor(), API_ENV), who, method, `/api/guilds/${GUILD}${path}`, body);
}

/** Past every gate here; what the route then does without a database is not what these tests are about. */
function passed(answer: Answer): void {
	expect(answer.code ?? "").not.toMatch(/missing_permission|out_of_reach/);
	expect(answer.message ?? "").not.toMatch(/^That (channel|role) is not in this server/);
}

beforeAll(() => {
	// A write that passes the gates meets no database, and should fail at once rather than wait ten seconds for one.
	mongoose.set("bufferCommands", false);
});

beforeEach(() => {
	jest.mocked(findSession).mockImplementation((id: string) => Promise.resolve(sessionOf(id)));
});

describe("an action that needs more than Manage Server", () => {
	const actions: [string, string, string, unknown][] = [
		["kicking", "POST", `/members/${TARGET}/kick`, { confirm: "x" }],
		["banning", "POST", `/members/${TARGET}/ban`, { confirm: "x" }],
		["lifting a softban", "DELETE", `/members/${TARGET}/softban`, {}],
		["warning", "POST", "/warnings", { userId: TARGET, reason: "spam" }],
		["editing a warning", "PATCH", `/warnings/${TARGET}/abcdef12`, { reason: "spam" }],
		["removing a warning", "DELETE", `/warnings/${TARGET}/abcdef12`, {}],
		["clearing warnings", "DELETE", `/warnings/${TARGET}`, {}],
		["setting a balance", "PATCH", `/members/${TARGET}/money`, { wallet: 10 }],
		["choosing roles on join", "PUT", "/settings/auto-roles", { roleIds: [BELOW_YOU] }],
		["choosing level rewards", "PUT", "/levelling/rewards", [{ level: 5, roleId: BELOW_YOU }]],
		["choosing the verified role", "PATCH", "/verification", { roleId: BELOW_YOU }],
		["renaming the bot", "PATCH", "/settings/nickname", { nickname: "Robo" }],
	];

	/** A Manage Server manager kicked, banned and warned from the web, which Discord itself would not have let them do. */
	it.each(actions)("refuses %s to a manager without the command's own permission", async (_, method, path, body) => {
		expect(await asking(MANAGER, method, path, body)).toMatchObject({ status: 403, code: "missing_permission" });
	});

	it.each(actions)("lets %s through for somebody who has it", async (_, method, path, body) => {
		passed(await asking(MODERATOR, method, path, body));
	});

	it("names the permission that is missing", async () => {
		const { message } = await asking(MANAGER, "POST", `/members/${TARGET}/kick`, { confirm: "x" });

		expect(message).toContain("kick members");
	});
});

describe("a channel a write names", () => {
	/** Another server's channel id aimed the bot's welcome text at a server the manager does not run. */
	it("must be in this server", async () => {
		expect(await asking(MANAGER, "PATCH", "/welcome", { channelId: ELSEWHERE })).toMatchObject({ status: 400 });
	});

	it("must be one its person can see", async () => {
		expect(await asking(MANAGER, "PATCH", "/welcome", { channelId: HIDDEN })).toMatchObject({
			status: 403,
			code: "channel_out_of_reach",
		});
	});

	it("must be one its person can post in, when the bot will post there", async () => {
		expect(await asking(MANAGER, "PATCH", "/welcome", { channelId: READ_ONLY })).toMatchObject({
			status: 403,
			code: "channel_out_of_reach",
		});
	});

	it("need only be visible when it is a list rather than somewhere to post", async () => {
		passed(await asking(MANAGER, "PUT", "/levelling/ignores", { channelIds: [READ_ONLY], roleIds: [] }));
	});

	it("is not held to posting when it is a voice counter nobody posts in", async () => {
		passed(await asking(MANAGER, "PATCH", "/settings/voice-stats", { memberChannelId: VOICE }));
	});

	it("is accepted when it is in reach", async () => {
		passed(await asking(MANAGER, "PATCH", "/welcome", { channelId: OPEN }));
	});
});

describe("a role a write names", () => {
	it("must be in this server", async () => {
		expect(await asking(MANAGER, "PUT", "/levelling/boosts", [{ roleId: NOT_A_ROLE, multiplier: 2 }])).toMatchObject({
			status: 400,
		});
	});

	/** Discord lets Manage Roles hand out only what sits below your own highest role; the bot must not do more for you. */
	it("the bot hands out must sit below its person's highest role", async () => {
		expect(await asking(MODERATOR, "PUT", "/settings/auto-roles", { roleIds: [ABOVE_YOU] })).toMatchObject({
			status: 403,
			code: "role_out_of_reach",
		});
	});

	it("the bot hands out may be anything below the bot for the server's owner", async () => {
		passed(await asking(SERVER_OWNER, "PUT", "/settings/auto-roles", { roleIds: [ABOVE_YOU] }));
	});

	it.each([
		["a managed role", MANAGED],
		["a role above the bot", ABOVE_BOT],
		["@everyone", GUILD],
	])("the bot hands out is never %s, even for the bot's owner", async (_, roleId) => {
		expect(await asking(BOT_OWNER, "PUT", "/levelling/rewards", [{ level: 5, roleId }])).toMatchObject({
			status: 403,
			code: "role_out_of_reach",
		});
	});

	it("only needs to exist when the bot never hands it out", async () => {
		passed(await asking(MANAGER, "PUT", "/levelling/boosts", [{ roleId: ABOVE_YOU, multiplier: 2 }]));
	});
});
