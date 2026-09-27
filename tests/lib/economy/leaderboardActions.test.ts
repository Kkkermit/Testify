import { pageCount } from "@lib/discord/pagination.util";
import {
	boardTitle,
	type BoardState,
	emptyMessage,
	footerFor,
	PAGE_SIZE,
	pageOfRank,
} from "@lib/economy/leaderboardActions.util";

const board = (overrides: Partial<BoardState> = {}): BoardState => ({
	kind: "economy",
	page: 0,
	sort: "total",
	scope: "server",
	...overrides,
});

describe("boardTitle", () => {
	it("names the server and the board", () => {
		expect(boardTitle(board(), "Testify")).toBe("Richest in Testify");
		expect(boardTitle(board({ kind: "levels" }), "Testify")).toBe("Top levels in Testify");
	});

	it("names what the money board is ranked by", () => {
		expect(boardTitle(board({ sort: "wallet" }), "Testify")).toBe("Biggest wallets in Testify");
		expect(boardTitle(board({ sort: "bank" }), "Testify")).toBe("Biggest banks in Testify");
	});

	/** The bot-wide board is not this server's, and a title naming the server would say it was. */
	it("says the bot-wide board spans every server", () => {
		expect(boardTitle(board({ scope: "global" }), "Testify")).toBe("Richest across every server");
	});

	/** Page one reads oddly with a page number on it; page two needs one. */
	it("only mentions the page beyond the first", () => {
		expect(boardTitle(board({ kind: "levels", page: 1 }), "Testify")).toContain("page 2");
	});
});

describe("emptyMessage", () => {
	it("says something board-specific rather than a generic blank", () => {
		expect(emptyMessage("economy")).not.toBe(emptyMessage("levels"));
		expect(emptyMessage("economy", "global")).toMatch(/anywhere/);
	});
});

describe("pageCount", () => {
	it("counts a partial last page", () => {
		expect(pageCount(PAGE_SIZE + 1, PAGE_SIZE)).toBe(2);
	});

	it("counts an exactly full page once", () => {
		expect(pageCount(PAGE_SIZE, PAGE_SIZE)).toBe(1);
	});

	/** An empty board still renders one page saying it is empty. */
	it("never reports fewer than one page", () => {
		expect(pageCount(0, PAGE_SIZE)).toBe(1);
	});
});

describe("pageOfRank", () => {
	it("puts the first page's ranks on page zero", () => {
		expect(pageOfRank(1)).toBe(0);
		expect(pageOfRank(PAGE_SIZE)).toBe(0);
	});

	it("puts the next rank on the next page", () => {
		expect(pageOfRank(PAGE_SIZE + 1)).toBe(1);
	});

	it("never returns a negative page", () => {
		expect(pageOfRank(0)).toBe(0);
	});
});

describe("footerFor", () => {
	/** This line replaced the Find me and paging buttons. */
	it("says where the viewer sits", () => {
		expect(footerFor(board({ kind: "levels" }), 1, 1)).toMatch(/1st/);
	});

	it("says when the viewer is on the page already", () => {
		expect(footerFor(board({ kind: "levels" }), 3, 4)).toMatch(/on this page/i);
	});

	it("names the page the viewer is on when it is a different one", () => {
		expect(footerFor(board({ kind: "levels" }), 3, 24)).toMatch(/page 3/i);
	});

	it("says so when the viewer is not on the board", () => {
		expect(footerFor(board(), 1, null)).toMatch(/not on this board/i);
	});

	/** No point telling someone about page 2 of 1. */
	it("only explains paging when there is more than one page", () => {
		expect(footerFor(board({ kind: "levels" }), 1, 1)).not.toMatch(/page:2/);
		expect(footerFor(board({ kind: "levels" }), 4, 1)).toMatch(/page:2/);
	});

	it("names the board in the example command", () => {
		expect(footerFor(board(), 4, 1)).toContain("`/leaderboard economy page:2`");
	});

	/** The hint for the next page must keep the sort and scope, or following it lands on a different board. */
	it("keeps the reader's sort and scope in the next-page hint", () => {
		expect(footerFor(board({ sort: "wallet", scope: "global", page: 1 }), 4, 1)).toContain(
			"`/leaderboard economy sort:wallet scope:global page:3`",
		);
	});

	it("points nowhere past the last page", () => {
		const last = footerFor(board({ page: 3 }), 4, 1);

		expect(last).toMatch(/the last/);
		expect(last).not.toMatch(/page:5/);
	});
});
