import {
	appealGuildIds,
	createAppeal,
	decideAppeal,
	deleteAppeal,
	getAppealSettings,
	latestAppeal,
	reopenAppeal,
	type StoredAppeal,
} from "@database/repositories/appealRepository";
import {
	applyAppealSettings,
	clearListedBans,
	decideOnAppeal,
	readOwnAppeals,
	submitAppeal,
} from "@lib/appeals/appealActions.util";
import { unbanUser } from "@lib/moderation/sanctions.util";

jest.mock("@database/repositories/appealRepository", () => ({
	appealGuildIds: jest.fn(() => Promise.resolve([])),
	countOpenAppeals: jest.fn(() => Promise.resolve(0)),
	createAppeal: jest.fn(),
	decideAppeal: jest.fn(),
	deleteAppeal: jest.fn(() => Promise.resolve()),
	getAppealSettings: jest.fn(),
	latestAppeal: jest.fn(() => Promise.resolve(null)),
	reopenAppeal: jest.fn(() => Promise.resolve()),
	saveAppealSettings: jest.fn(() => Promise.resolve()),
	setAppealMessage: jest.fn(() => Promise.resolve()),
	userAppeals: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@lib/moderation/sanctions.util", () => ({
	moderatorOf: (user: { id: string; username: string }) => ({ id: user.id, name: user.username }),
	unbanUser: jest.fn(() => Promise.resolve({})),
}));

const GUILD = "900000000000000001";
const KATE = { id: "100000000000000001", username: "kate" };
const MOD = { id: "100000000000000002", username: "mod" };
const CHANNEL = "400000000000000001";

const settings = jest.mocked(getAppealSettings);
const latest = jest.mocked(latestAppeal);
const created = jest.mocked(createAppeal);
const decided = jest.mocked(decideAppeal);
const unban = jest.mocked(unbanUser);

function appeal(overrides: Partial<StoredAppeal> = {}): StoredAppeal {
	return {
		id: "a".repeat(24),
		guildId: GUILD,
		userId: KATE.id,
		username: KATE.username,
		text: "I was spamming, and I will not again.",
		status: "open",
		reason: "",
		decidedBy: null,
		decidedByName: null,
		decidedAt: null,
		channelId: CHANNEL,
		messageId: null,
		createdAt: new Date("2026-11-01T00:00:00.000Z"),
		...overrides,
	};
}

function world(options: { banned?: boolean; sendFails?: boolean; dashboard?: boolean } = {}) {
	const channel = {
		id: CHANNEL,
		isSendable: () => true,
		isTextBased: () => true,
		send: jest.fn(() => (options.sendFails === true ? Promise.reject(new Error("no")) : Promise.resolve({ id: "5" }))),
		messages: { fetch: jest.fn(() => Promise.resolve(null)) },
	};
	const guild = {
		id: GUILD,
		name: "Test Server",
		iconURL: () => null,
		members: { me: { permissions: { has: () => true } } },
		bans: {
			fetch: jest.fn(() => (options.banned === false ? Promise.reject(new Error("10026")) : Promise.resolve({}))),
		},
		channels: { fetch: jest.fn(() => Promise.resolve(channel)) },
	};
	const send = jest.fn(() => Promise.resolve());
	const client = {
		env: { DASHBOARD_ENABLED: options.dashboard ?? true, DASHBOARD_BASE_URL: "https://bot.example" },
		guilds: { cache: new Map([[GUILD, guild]]) },
		users: { fetch: jest.fn(() => Promise.resolve({ send })) },
		logger: { debug: jest.fn() },
	};

	return { client: client as never, guild: guild as never, channel, send };
}

beforeEach(() => {
	jest.clearAllMocks();
	settings.mockResolvedValue({ enabled: true, channelId: CHANNEL, cooldownDays: 30 });
	latest.mockResolvedValue(null);
	created.mockResolvedValue(appeal());
});

describe("submitAppeal", () => {
	/** A server's staff channel is not somewhere anybody may post into by naming its server. */
	it("refuses somebody the server has not banned, and posts nothing", async () => {
		const { client, channel } = world({ banned: false });

		await expect(submitAppeal(client, GUILD, KATE, "Please let me back in, I mean it.")).rejects.toThrow(/not banned/);
		expect(channel.send).not.toHaveBeenCalled();
	});

	it("holds back a second appeal while one waits, and a new one inside the wait after a refusal", async () => {
		const { client } = world();

		latest.mockResolvedValueOnce(appeal());
		await expect(submitAppeal(client, GUILD, KATE, "Another try at this.")).rejects.toThrow(/still waiting/);

		latest.mockResolvedValueOnce(appeal({ status: "refused", decidedAt: new Date() }));
		await expect(submitAppeal(client, GUILD, KATE, "Another try at this.")).rejects.toThrow(/refused/);
		expect(created).not.toHaveBeenCalled();
	});

	/** The appeal quotes whatever a banned person typed, which could be `@everyone`. */
	it("posts it to staff without pinging anybody", async () => {
		const { client, channel } = world();

		await submitAppeal(client, GUILD, KATE, "I was spamming, and I will not again.");

		expect(channel.send).toHaveBeenCalledWith(expect.objectContaining({ allowedMentions: { parse: [] } }));
	});

	/** An appeal staff never saw would sit waiting for ever and block the next one. */
	it("drops the appeal when its post cannot be sent", async () => {
		const { client } = world({ sendFails: true });

		await expect(submitAppeal(client, GUILD, KATE, "I was spamming, and I will not again.")).rejects.toThrow();
		expect(deleteAppeal).toHaveBeenCalledWith(GUILD, appeal().id);
	});
});

describe("decideOnAppeal", () => {
	const ACCEPT = { status: "accepted", reason: "" } as const;

	/** The claim goes first; an unban Discord refuses must leave the appeal waiting rather than marked done. */
	it("hands the appeal back when Discord refuses the unban", async () => {
		const { client, guild, send } = world();
		decided.mockResolvedValue(appeal({ status: "accepted" }));
		unban.mockRejectedValueOnce(new Error("50013"));

		await expect(decideOnAppeal(client, guild, appeal().id, ACCEPT, MOD)).rejects.toThrow(/Ban Members/);
		expect(reopenAppeal).toHaveBeenCalledWith(GUILD, appeal().id);
		expect(send).not.toHaveBeenCalled();
	});

	it("refuses a second decision without touching the ban", async () => {
		const { client, guild } = world();
		decided.mockResolvedValue(null);

		await expect(decideOnAppeal(client, guild, appeal().id, ACCEPT, MOD)).rejects.toThrow(/already been decided/);
		expect(unban).not.toHaveBeenCalled();
	});

	/** Somebody may lift the ban in Discord while the appeal waits; accepting it then is still the right record. */
	it("accepts without unbanning when the ban has already gone, and tells the person", async () => {
		const { client, guild, send } = world({ banned: false });
		decided.mockResolvedValue(appeal({ status: "accepted" }));

		await decideOnAppeal(client, guild, appeal().id, ACCEPT, MOD);

		expect(unban).not.toHaveBeenCalled();
		expect(send).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining("accepted") }));
	});
});

describe("applyAppealSettings", () => {
	/** Appeals are written on the dashboard, so turning them on without one would leave every banned member stuck. */
	it("will not turn appeals on without a dashboard or a channel", async () => {
		settings.mockResolvedValue(null);

		await expect(
			applyAppealSettings(world({ dashboard: false }).client, world().guild, { enabled: true }, MOD.id),
		).rejects.toThrow(/dashboard/);
		await expect(applyAppealSettings(world().client, world().guild, { enabled: true }, MOD.id)).rejects.toThrow(
			/Pick a channel/,
		);
	});
});

describe("readOwnAppeals", () => {
	it("offers only the servers that take appeals and have banned the reader", async () => {
		jest.mocked(appealGuildIds).mockResolvedValue([GUILD, "900000000000000009"]);

		const banned = await readOwnAppeals(world().client, KATE.id);
		clearListedBans();
		const free = await readOwnAppeals(world({ banned: false }).client, KATE.id);

		expect(banned.servers.map((server) => server.guildId)).toEqual([GUILD]);
		expect(free.servers).toEqual([]);
	});
});
