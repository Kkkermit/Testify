import { parseCustomId } from "@core/button";
import {
	boardTitle,
	emptyMessage,
	isBoardKind,
	LEADERBOARD_ID,
	otherKind,
	PAGE_SIZE,
	pageCount,
	pageOfRank,
	switchButton,
} from "@lib/leaderboardActions.util";

const OWNER = "100000000000000001";

/** `ButtonBuilder.data` is a union that includes SKU buttons, which have no custom ID. */
function dataOf(builder: ReturnType<typeof switchButton>): Record<string, unknown> {
	return builder.toJSON() as unknown as Record<string, unknown>;
}

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

describe("otherKind", () => {
	it("swaps between the two boards", () => {
		expect(otherKind("economy")).toBe("levels");
		expect(otherKind("levels")).toBe("economy");
	});
});

describe("switchButton", () => {
	/**
	 * Swapping board is a `goto` on the other board's first page, so the handler has
	 * one action rather than two doing the same job.
	 */
	it("jumps to the other board's first page", () => {
		const parsed = parseCustomId(dataOf(switchButton("levels", OWNER)).custom_id as string);

		expect(parsed.id).toBe(LEADERBOARD_ID);
		expect(parsed.action).toBe("goto");
		expect(parsed.args.slice(0, 2)).toEqual(["economy", "0"]);
	});

	it("puts the owner last, so ownerOnly can read it", () => {
		const parsed = parseCustomId(dataOf(switchButton("economy", OWNER)).custom_id as string);
		expect(parsed.args.at(-1)).toBe(OWNER);
	});

	it("is labelled with the board it goes to", () => {
		expect(dataOf(switchButton("economy", OWNER)).label).toBe("Highest levels");
		expect(dataOf(switchButton("levels", OWNER)).label).toBe("Richest members");
	});
});
