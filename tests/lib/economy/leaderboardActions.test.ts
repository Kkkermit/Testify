import { ButtonStyle, type Guild } from "discord.js";
import { parseCustomId } from "@core/button";
import { renderBoardImage } from "@lib/canvas/boardCard.util";
import { type BoardCard } from "@lib/canvas/canvas.types";
import {
	BOARD_SIZE,
	boardControls,
	boardDescription,
	boardMessage,
	type BoardState,
	boardSubtitle,
	boardTitle,
	emptyMessage,
	footerText,
} from "@lib/economy/leaderboardActions.util";
import { boardEntries, decorateRows, standingOnBoard } from "@lib/economy/memberActions.util";
import { BOARD_SCOPES, MONEY_SORTS } from "@testify/shared";

jest.mock("@lib/economy/memberActions.util", () => ({
	SERVER_TOTALS: { sort: "total", scope: "server", guildIds: [] },
	boardEntries: jest.fn(),
	standingOnBoard: jest.fn(),
	decorateRows: jest.fn(),
}));
jest.mock("@lib/canvas/boardCard.util", () => ({
	renderBoardImage: jest.fn(() => Promise.resolve({ setDescription: jest.fn() })),
}));

const OWNER = "100000000000000001";
const GUILD = { id: "900000000000000001", name: "Testify HQ" } as unknown as Guild;

const board = (overrides: Partial<BoardState> = {}): BoardState => ({
	kind: "economy",
	sort: "total",
	scope: "server",
	...overrides,
});

describe("the board's words", () => {
	it("names what the money board is ranked by", () => {
		expect(boardTitle(board())).toBe("Richest members");
		expect(boardTitle(board({ sort: "wallet" }))).toBe("Biggest wallets");
		expect(boardTitle(board({ kind: "levels" }))).toBe("Top levels");
	});

	/** The bot-wide board is not this server's, and a subtitle naming the server would say it was. */
	it("says where the board reaches", () => {
		expect(boardSubtitle(board(), "Testify HQ")).toBe("Testify HQ · Ranked by wallet and bank together");
		expect(boardSubtitle(board({ scope: "global", sort: "bank" }), "Testify HQ")).toBe("Every server · Ranked by bank");
	});

	it("says something board-specific rather than a generic blank", () => {
		expect(emptyMessage("economy")).not.toBe(emptyMessage("levels"));
		expect(emptyMessage("economy", "global")).toMatch(/anywhere/);
	});

	it("counts the board in its own words", () => {
		expect(footerText("economy", "server", 1)).toBe("1 account ranked");
		expect(footerText("economy", "global", 1_200)).toBe("1,200 people ranked across every server");
		expect(footerText("levels", "server", 3)).toBe("3 members ranked");
	});

	it("describes the picture for anybody who cannot see it", () => {
		expect(boardDescription(board(), "Testify HQ", 27, 140)).toContain("You are 27th of 140.");
		expect(boardDescription(board(), "Testify HQ", null, 140)).toContain("You are not on it yet.");
	});
});

describe("boardControls", () => {
	it("gives the levels board no buttons", () => {
		expect(boardControls(board({ kind: "levels" }), OWNER)).toEqual([]);
	});

	/** Each button carries the whole board it leads to, so pressing one never forgets the other choice. */
	it("switches scope and sort while keeping the other, for its owner only", () => {
		const [scopes, sorts] = boardControls(board({ sort: "wallet", scope: "server" }), OWNER).map(
			(built) => built.toJSON().components as { custom_id: string; disabled: boolean; style: number }[],
		);

		expect(scopes?.map((part) => parseCustomId(part.custom_id).args)).toEqual([
			["wallet", "server", OWNER],
			["wallet", "global", OWNER],
		]);
		expect(sorts?.map((part) => parseCustomId(part.custom_id).args)).toEqual([
			["total", "server", OWNER],
			["wallet", "server", OWNER],
			["bank", "server", OWNER],
		]);
	});

	/** The current scope and the current sort both lead to this board, and Discord refused the whole reply. */
	it("never gives two buttons the same id, on any board", () => {
		for (const sort of MONEY_SORTS) {
			for (const scope of BOARD_SCOPES) {
				const ids = boardControls(board({ sort, scope }), OWNER).flatMap((built) =>
					(built.toJSON().components as { custom_id: string }[]).map((part) => part.custom_id),
				);

				expect(new Set(ids).size).toBe(ids.length);
			}
		}
	});

	it("marks the board showing by making it the one that cannot be pressed", () => {
		const [scopes] = boardControls(board({ scope: "global" }), OWNER).map(
			(built) => built.toJSON().components as { disabled: boolean; style: number }[],
		);

		expect(scopes?.map((part) => part.disabled)).toEqual([false, true]);
		expect(scopes?.[1]?.style).toBe(ButtonStyle.Primary);
	});
});

describe("boardMessage", () => {
	const entries = Array.from({ length: BOARD_SIZE }, (_, index) => ({
		userId: String(200 + index),
		primary: 1_000 - index,
		secondary: index,
	}));

	function drawn(): BoardCard {
		return jest.mocked(renderBoardImage).mock.calls.at(-1)![0];
	}

	beforeEach(() => {
		jest.clearAllMocks();
		jest.mocked(boardEntries).mockResolvedValue({ entries, total: 40 });
		jest.mocked(decorateRows).mockImplementation((_guild, rows, firstRank) =>
			Promise.resolve(
				rows.map((row, index) => ({
					userId: row.userId,
					rank: firstRank + index,
					displayName: `Person ${row.userId}`,
					avatarUrl: null,
					primary: row.primary,
					secondary: row.secondary,
					inGuild: true,
				})),
			),
		);
	});

	it("asks for the top ten and nothing past them", async () => {
		jest.mocked(standingOnBoard).mockResolvedValue(null);
		await boardMessage(GUILD, board(), OWNER, [GUILD.id]);

		expect(boardEntries).toHaveBeenCalledWith(GUILD.id, "economy", { limit: BOARD_SIZE, skip: 0 }, expect.anything());
	});

	it("draws the reader's own row under the top ten when they are further down", async () => {
		jest.mocked(standingOnBoard).mockResolvedValue({ rank: 27, entry: { userId: OWNER, primary: 50, secondary: 5 } });
		await boardMessage(GUILD, board(), OWNER, [GUILD.id]);

		expect(drawn().viewer).toMatchObject({ rank: 27, primary: "50", secondary: "5 banked", you: true });
		expect(drawn().unranked).toBeNull();
	});

	/** Somebody already in the top ten would otherwise appear twice. */
	it("marks the reader's row in place when they are in the top ten", async () => {
		jest.mocked(standingOnBoard).mockResolvedValue({ rank: 3, entry: { userId: "202", primary: 998, secondary: 2 } });
		await boardMessage(GUILD, board(), "202", [GUILD.id]);

		expect(drawn().viewer).toBeNull();
		expect(
			drawn()
				.rows.filter((row) => row.you === true)
				.map((row) => row.rank),
		).toEqual([3]);
	});

	it("says so when the reader is not on the board at all", async () => {
		jest.mocked(standingOnBoard).mockResolvedValue(null);
		await boardMessage(GUILD, board({ kind: "levels" }), OWNER, [GUILD.id]);

		expect(drawn()).toMatchObject({
			viewer: null,
			unranked: expect.stringMatching(/earn XP/) as unknown,
			theme: "levels",
		});
		expect(drawn().rows[0]).toMatchObject({ primary: "Level 1,000", secondary: "0 XP" });
	});

	/** An empty board already says nobody is on it. */
	it("does not add a second note to an empty board", async () => {
		jest.mocked(boardEntries).mockResolvedValue({ entries: [], total: 0 });
		jest.mocked(standingOnBoard).mockResolvedValue(null);
		await boardMessage(GUILD, board(), OWNER, [GUILD.id]);

		expect(drawn().unranked).toBeNull();
	});

	it("puts buttons only on the money board", async () => {
		jest.mocked(standingOnBoard).mockResolvedValue(null);

		expect((await boardMessage(GUILD, board(), OWNER, [GUILD.id])).components).toHaveLength(2);
		expect((await boardMessage(GUILD, board({ kind: "levels" }), OWNER, [GUILD.id])).components).toHaveLength(0);
	});
});
