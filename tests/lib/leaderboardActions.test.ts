import {
	boardTitle,
	emptyMessage,
	footerFor,
	isBoardKind,
	PAGE_SIZE,
	pageCount,
	pageOfRank,
} from "@lib/leaderboardActions.util";

describe("isBoardKind", () => {
	it("accepts the two boards and nothing else", () => {
		expect(isBoardKind("economy")).toBe(true);
		expect(isBoardKind("levels")).toBe(true);
		expect(isBoardKind("music")).toBe(false);
	});
});

describe("boardTitle", () => {
	it("names the server and the board", () => {
		expect(boardTitle("economy", "Testify", 0)).toBe("Richest in Testify");
		expect(boardTitle("levels", "Testify", 0)).toBe("Top levels in Testify");
	});

	/** Page one reads oddly with a page number on it; page two needs one. */
	it("only mentions the page beyond the first", () => {
		expect(boardTitle("levels", "Testify", 1)).toContain("page 2");
	});
});

describe("emptyMessage", () => {
	it("says something board-specific rather than a generic blank", () => {
		expect(emptyMessage("economy")).not.toBe(emptyMessage("levels"));
	});
});

describe("pageCount", () => {
	it("counts a partial last page", () => {
		expect(pageCount(PAGE_SIZE + 1)).toBe(2);
	});

	it("counts an exactly full page once", () => {
		expect(pageCount(PAGE_SIZE)).toBe(1);
	});

	/** An empty board still renders one page saying it is empty. */
	it("never reports fewer than one page", () => {
		expect(pageCount(0)).toBe(1);
	});
});

describe("pageOfRank", () => {
	/** Powers the Find me button, which jumps straight to the page you are on. */
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
	/**
	 * This line replaced the Find me and paging buttons. Every attempt to re-render
	 * the board in place left the old image attached and added the new one beside it,
	 * so the board is now a message that is never edited.
	 */
	it("says where the viewer sits", () => {
		expect(footerFor("levels", 0, 1, 1)).toMatch(/1st/);
	});

	it("says when the viewer is on the page already", () => {
		expect(footerFor("levels", 0, 3, 4)).toMatch(/on this page/i);
	});

	it("names the page the viewer is on when it is a different one", () => {
		expect(footerFor("levels", 0, 3, 24)).toMatch(/page 3/i);
	});

	it("says so when the viewer is not on the board", () => {
		expect(footerFor("economy", 0, 1, null)).toMatch(/not on this board/i);
	});

	/** No point telling someone about page 2 of 1. */
	it("only explains paging when there is more than one page", () => {
		expect(footerFor("levels", 0, 1, 1)).not.toMatch(/page:2/);
		expect(footerFor("levels", 0, 4, 1)).toMatch(/page:2/);
	});

	it("names the board in the example command", () => {
		expect(footerFor("economy", 0, 4, 1)).toContain("/leaderboard economy");
	});
});
