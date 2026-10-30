import { ChannelType, Collection, PermissionFlagsBits, PermissionsBitField } from "discord.js";
import mongoose from "mongoose";
import { createApi } from "@api/server";
import { type TestifyClient } from "@core/client";
import { findSession } from "@database/repositories/dashboardSessionRepository";
import { API_ENV, type Answer, ask, askRaw, sessionOf } from "@tests/helpers/apiHarness";
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
const MODERATES = "300000000000000066";

const MENU = { channelId: OPEN, title: "Pings", description: "", mode: "many" };

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
	PermissionFlagsBits.ManageChannels,
	PermissionFlagsBits.Administrator,
];

function clientFor(): TestifyClient {
	const roles = grantableRoles();
	roles.set(GUILD, createMockRole({ id: GUILD, name: "@everyone", position: 0, managed: false }));
	roles.set(MANAGED, createMockRole({ id: MANAGED, name: "Bot role", position: 8, managed: true }));
	roles.set(ABOVE_BOT, createMockRole({ id: ABOVE_BOT, name: "Admin", position: 60, managed: false }));
	roles.set(
		MODERATES,
		createMockRole({
			id: MODERATES,
			name: "Helpers",
			position: 3,
			managed: false,
			permissions: new PermissionsBitField([PermissionFlagsBits.KickMembers]),
		}),
	);

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
function stopped(answer: Answer): boolean {
	return (
		/missing_permission|out_of_reach/.test(answer.code ?? "") ||
		/^That (channel|role) is not in this server/.test(answer.message ?? "")
	);
}

function passed(answer: Answer): void {
	expect(stopped(answer)).toBe(false);
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
		["making a role menu", "POST", "/role-menus", { ...MENU, roleIds: [BELOW_YOU] }],
		["changing raid protection", "PATCH", "/raid-protection", { minAccountAgeDays: 7 }],
		["lifting a ban", "POST", `/bans/${TARGET}/unban`, {}],
		["timing a member out", "POST", `/members/${TARGET}/timeout`, { minutes: 60, reason: "spam", confirm: "x" }],
		["lifting a timeout", "DELETE", `/members/${TARGET}/timeout`, {}],
		["renaming a member", "PATCH", `/members/${TARGET}/nickname`, { nickname: "Kate" }],
		["changing a member's roles", "PUT", `/members/${TARGET}/roles`, { roleIds: [BELOW_YOU] }],
		["locking a channel", "PATCH", `/channel-tools/${OPEN}`, { locked: true }],
		["reading the bans", "GET", "/bans", undefined],
		["reading moderation cases", "GET", "/cases", undefined],
		["reading warnings", "GET", "/warnings", undefined],
		["setting a level, which hands out its rewards", "PATCH", `/members/${TARGET}/level`, { level: 5 }],
	];

	/** Each action as one caller, with the answer it got, so one run names every route that answered wrongly. */
	async function answers(who: string): Promise<[name: string, answer: Answer][]> {
		return Promise.all(
			actions.map(
				async ([name, method, path, body]) => [name, await asking(who, method, path, body)] as [string, Answer],
			),
		);
	}

	/** A Manage Server manager kicked, banned and warned from the web, which Discord itself would not have let them do. */
	it("refuses each action to a manager without the command's own permission", async () => {
		const allowed = (await answers(MANAGER)).filter(
			([, answer]) => answer.status !== 403 || answer.code !== "missing_permission",
		);

		expect(allowed.map(([name]) => name)).toEqual([]);
	});

	it("lets each action through for somebody who has it", async () => {
		const refused = (await answers(MODERATOR)).filter(([, answer]) => stopped(answer));

		expect(refused.map(([name]) => name)).toEqual([]);
	});

	it("names the permission that is missing", async () => {
		const { message } = await asking(MANAGER, "POST", `/members/${TARGET}/kick`, { confirm: "x" });

		expect(message).toContain("kick members");
	});
});

describe("a write's body", () => {
	/** Walking a body nested thousands deep for channel ids overflowed the stack, which answered as a crash. */
	it("is refused, not walked, when it is nested past any form the page sends", async () => {
		// Written out as text, since building it with `JSON.stringify` would overflow this test's own stack first.
		const deep = `${'{"inner":'.repeat(10_000)}{"channelId":"${OPEN}"}${"}".repeat(10_000)}`;
		const app = createApi(clientFor(), API_ENV);

		expect(await askRaw(app, MANAGER, "PATCH", `/api/guilds/${GUILD}/welcome`, deep)).toMatchObject({ status: 400 });
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

	it("on a menu members pick from sits below its person's highest role", async () => {
		expect(await asking(MODERATOR, "POST", "/role-menus", { ...MENU, roleIds: [ABOVE_YOU] })).toMatchObject({
			status: 403,
			code: "role_out_of_reach",
		});
	});

	/** A self-assigned role that kicks would let anybody in the server kick, whoever made the menu. */
	it("on a menu members pick from never moderates, even for the server's owner", async () => {
		const answer = await asking(SERVER_OWNER, "POST", "/role-menus", { ...MENU, roleIds: [MODERATES] });

		expect(answer).toMatchObject({ status: 403, code: "role_out_of_reach" });
		expect(answer.message).toMatch(/moderation or admin permissions/);
	});

	it("only needs to exist when the bot never hands it out", async () => {
		passed(await asking(MANAGER, "PUT", "/levelling/boosts", [{ roleId: ABOVE_YOU, multiplier: 2 }]));
	});
});
