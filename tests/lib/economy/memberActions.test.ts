import { Collection, type Guild, type GuildMember } from "discord.js";
import {
	countAccounts,
	countGlobalAccounts,
	getEconomyRank,
	getGlobalLeaderboard,
	getGlobalRank,
	getLeaderboard,
} from "@database/repositories/economyRepository";
import { countRanked, getLevelLeaderboard, getRank } from "@database/repositories/levelRepository";
import { boardEntries, decorateRows, readBoard } from "@lib/economy/memberActions.util";

jest.mock("@database/repositories/economyRepository", () => ({
	getLeaderboard: jest.fn(() => Promise.resolve([])),
	countAccounts: jest.fn(() => Promise.resolve(0)),
	getEconomyRank: jest.fn(() => Promise.resolve(null)),
	getGlobalLeaderboard: jest.fn(() => Promise.resolve([])),
	countGlobalAccounts: jest.fn(() => Promise.resolve(0)),
	getGlobalRank: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/levelRepository", () => ({
	getLevelLeaderboard: jest.fn(() => Promise.resolve([])),
	countRanked: jest.fn(() => Promise.resolve(0)),
	getRank: jest.fn(() => Promise.resolve(null)),
}));

const GUILD = "900000000000000001";
const VIEWER = "100000000000000001";

const economyRows = jest.mocked(getLeaderboard);
const economyTotal = jest.mocked(countAccounts);
const economyRank = jest.mocked(getEconomyRank);
const levelRows = jest.mocked(getLevelLeaderboard);
const levelTotal = jest.mocked(countRanked);
const levelRank = jest.mocked(getRank);

function member(id: string, displayName: string): GuildMember {
	return {
		id,
		displayName,
		displayAvatarURL: () => `https://cdn.example.test/${id}.png`,
	} as unknown as GuildMember;
}

function guild(members: GuildMember[] = []): Guild {
	const cache = new Collection(members.map((one) => [one.id, one]));

	return {
		id: GUILD,
		members: { cache, fetch: jest.fn(() => Promise.resolve(cache)) },
	} as unknown as Guild;
}

beforeEach(() => {
	// `clearAllMocks` forgets the calls but keeps the implementations, so each default is restated here.
	jest.clearAllMocks();
	economyRows.mockResolvedValue([]);
	economyTotal.mockResolvedValue(0);
	economyRank.mockResolvedValue(null);
	levelRows.mockResolvedValue([]);
	levelTotal.mockResolvedValue(0);
	levelRank.mockResolvedValue(null);
	jest.mocked(getGlobalLeaderboard).mockResolvedValue([]);
	jest.mocked(countGlobalAccounts).mockResolvedValue(0);
	jest.mocked(getGlobalRank).mockResolvedValue(null);
});

describe("boardEntries", () => {
	it("reads the economy board as the total and what is banked", async () => {
		economyRows.mockResolvedValue([{ userId: "1", total: 900, bank: 400 }] as never);
		economyTotal.mockResolvedValue(1);

		await expect(boardEntries(GUILD, "economy", { limit: 25, skip: 0 })).resolves.toEqual({
			total: 1,
			entries: [{ userId: "1", primary: 900, secondary: 400 }],
		});
	});

	it("reads the levels board as the level and the XP", async () => {
		levelRows.mockResolvedValue([{ userId: "1", level: 12, xp: 4_800 }] as never);
		levelTotal.mockResolvedValue(1);

		await expect(boardEntries(GUILD, "levels", { limit: 25, skip: 0 })).resolves.toEqual({
			total: 1,
			entries: [{ userId: "1", primary: 12, secondary: 4_800 }],
		});
	});

	/** The window is what makes one query serve both the ten-row canvas board and the twenty-five-row table. */
	it("passes the window straight through", async () => {
		await boardEntries(GUILD, "economy", { limit: 10, skip: 30 });

		expect(economyRows).toHaveBeenCalledWith(GUILD, 10, "total", 30);
	});
});

describe("decorateRows", () => {
	it("numbers rows from where the page starts, not from one", async () => {
		const rows = await decorateRows(guild([member("1", "kate")]), [{ userId: "1", primary: 5, secondary: 1 }], 26);

		expect(rows[0]?.rank).toBe(26);
	});

	/** A balance and an XP total outlive the membership, so the row has to survive somebody leaving. */
	it("keeps a row for somebody who is no longer in the server", async () => {
		const rows = await decorateRows(guild(), [{ userId: "9", primary: 5, secondary: 1 }], 1);

		expect(rows[0]).toMatchObject({ displayName: "Left the server", avatarUrl: null, inGuild: false });
	});

	/** One bulk fetch, not one request per row — the board is the widest read on the page. */
	it("fetches only the members the cache is missing", async () => {
		const target = guild([member("1", "kate")]);

		await decorateRows(
			target,
			[
				{ userId: "1", primary: 5, secondary: 1 },
				{ userId: "2", primary: 4, secondary: 1 },
			],
			1,
		);

		expect(target.members.fetch).toHaveBeenCalledTimes(1);
		expect(target.members.fetch).toHaveBeenCalledWith({ user: ["2"] });
	});

	it("asks for nothing when every member is already cached", async () => {
		const target = guild([member("1", "kate")]);

		await decorateRows(target, [{ userId: "1", primary: 5, secondary: 1 }], 1);

		expect(target.members.fetch).not.toHaveBeenCalled();
	});
});

describe("readBoard", () => {
	it("reports an empty board as one page rather than none", async () => {
		const page = await readBoard(guild(), "economy", 1, VIEWER);

		expect(page).toMatchObject({ total: 0, pages: 1, rows: [], you: null });
	});

	it("skips a whole page at a time", async () => {
		await readBoard(guild(), "economy", 3, VIEWER);

		expect(economyRows).toHaveBeenCalledWith(GUILD, 25, "total", 50);
	});

	/** The jump button needs the page, and a rank alone does not say which page holds it. */
	it("says which page the viewer is on", async () => {
		economyRank.mockResolvedValue(30);

		const page = await readBoard(guild(), "economy", 1, VIEWER);

		expect(page.you).toEqual({ rank: 30, page: 2 });
	});

	it("asks the levels board for the viewer's level rank", async () => {
		levelRank.mockResolvedValue(4);

		const page = await readBoard(guild(), "levels", 1, VIEWER);

		expect(levelRank).toHaveBeenCalledWith(GUILD, VIEWER);
		expect(page.you).toEqual({ rank: 4, page: 1 });
	});
});

describe("the money board's sort and scope", () => {
	const SERVERS = [GUILD, "900000000000000002"];
	const row = { userId: "1", wallet: 300, bank: 700, total: 1_000 };

	it("ranks by the figure asked for and shows the other purse beside it", async () => {
		economyRows.mockResolvedValue([row] as never);

		const byWallet = await boardEntries(
			GUILD,
			"economy",
			{ limit: 25, skip: 0 },
			{ sort: "wallet", scope: "server", guildIds: [] },
		);
		const byBank = await boardEntries(
			GUILD,
			"economy",
			{ limit: 25, skip: 0 },
			{ sort: "bank", scope: "server", guildIds: [] },
		);

		expect(economyRows).toHaveBeenCalledWith(GUILD, 25, "wallet", 0);
		expect(byWallet.entries).toEqual([{ userId: "1", primary: 300, secondary: 700 }]);
		expect(byBank.entries).toEqual([{ userId: "1", primary: 700, secondary: 300 }]);
	});

	/** The bot-wide board adds up the servers the bot is in, so it must ask with exactly those and nothing else. */
	it("reads the bot-wide board across the servers it is given", async () => {
		jest.mocked(getGlobalLeaderboard).mockResolvedValue([row]);
		jest.mocked(countGlobalAccounts).mockResolvedValue(1);

		const board = await boardEntries(
			GUILD,
			"economy",
			{ limit: 10, skip: 20 },
			{ sort: "total", scope: "global", guildIds: SERVERS },
		);

		expect(getGlobalLeaderboard).toHaveBeenCalledWith(SERVERS, 10, "total", 20);
		expect(economyRows).not.toHaveBeenCalled();
		expect(board).toEqual({ total: 1, entries: [{ userId: "1", primary: 1_000, secondary: 700 }] });
	});

	it("ranks the viewer on the board they are looking at", async () => {
		await readBoard(guild(), "economy", 1, VIEWER, { sort: "bank", scope: "global", guildIds: SERVERS });

		expect(getGlobalRank).toHaveBeenCalledWith(SERVERS, VIEWER, "bank");
		expect(economyRank).not.toHaveBeenCalled();
	});

	/** The levels board has one figure and one server; a sort sent with it must not leak into the answer. */
	it("ignores a sort or scope sent with the levels board", async () => {
		const page = await readBoard(guild(), "levels", 1, VIEWER, { sort: "bank", scope: "global", guildIds: SERVERS });

		expect(page).toMatchObject({ board: "levels", sort: "total", scope: "server" });
		expect(getGlobalLeaderboard).not.toHaveBeenCalled();
	});

	it("names somebody who was never in this server from their Discord profile on the bot-wide board", async () => {
		const target = guild();
		(target as unknown as { client: unknown }).client = {
			users: {
				fetch: jest.fn(() =>
					Promise.resolve({ displayName: "Faraway", displayAvatarURL: () => "https://cdn.example.test/far.png" }),
				),
			},
		};

		const [stranger] = await decorateRows(target, [{ userId: "7", primary: 1, secondary: 0 }], 1, "global");

		expect(stranger).toMatchObject({
			displayName: "Faraway",
			avatarUrl: "https://cdn.example.test/far.png",
			inGuild: false,
		});
	});

	it("still calls somebody who left this server gone on the server board", async () => {
		const [gone] = await decorateRows(guild(), [{ userId: "7", primary: 1, secondary: 0 }], 1, "server");

		expect(gone?.displayName).toBe("Left the server");
	});
});
