import { type BoardPage } from "@testify/shared";
import {
	boardFrom,
	columnsFor,
	emptyMessage,
	jumpTarget,
	opensMember,
	scopeFrom,
	sortFrom,
	summarise,
} from "@/features/members/members.utils";
import { t } from "@/test/english";

function page(overrides: Partial<BoardPage> = {}): BoardPage {
	return {
		board: "economy",
		sort: "total",
		scope: "server",
		page: 1,
		pages: 2,
		total: 30,
		rows: [],
		you: null,
		...overrides,
	};
}

describe("boardFrom", () => {
	it("reads a board out of the URL", () => {
		expect(boardFrom("levels")).toBe("levels");
	});

	/** `?board=` is user input, and an unknown value has to land somewhere rather than render nothing. */
	it.each([null, "", "warnings"])("falls back to economy for %p", (value) => {
		expect(boardFrom(value)).toBe("economy");
	});
});

describe("sortFrom and scopeFrom", () => {
	it("read the money board's sort and scope out of the URL", () => {
		expect(sortFrom("wallet")).toBe("wallet");
		expect(scopeFrom("global")).toBe("global");
	});

	it.each([null, "", "pets"])("fall back to the server's totals for %p", (value) => {
		expect(sortFrom(value)).toBe("total");
		expect(scopeFrom(value)).toBe("server");
	});
});

describe("columnsFor", () => {
	/** The column a board is sorted by comes first, or the table reads as ranked by something it is not. */
	it("leads with the figure the money board is ranked by", () => {
		expect(t(columnsFor(page({ sort: "wallet" })).primary)).toBe("Wallet");
		expect(t(columnsFor(page({ sort: "bank" })).primary)).toBe("Bank");
		expect(t(columnsFor(page({ sort: "bank" })).secondary)).toBe("Wallet");
		expect(t(columnsFor(page()).heading)).toBe("Richest");
	});

	it("ignores the sort on the levels board", () => {
		expect(t(columnsFor(page({ board: "levels", sort: "wallet" })).primary)).toBe("Level");
	});
});

describe("opensMember", () => {
	it("opens everybody on this server's board, including somebody who has left", () => {
		expect(opensMember(page(), { inGuild: false })).toBe(true);
	});

	/** Somebody on the bot-wide board who was never in this server has no page here to open. */
	it("opens only this server's members on the bot-wide board", () => {
		expect(opensMember(page({ scope: "global" }), { inGuild: true })).toBe(true);
		expect(opensMember(page({ scope: "global" }), { inGuild: false })).toBe(false);
	});
});

describe("jumpTarget", () => {
	it("offers the page holding the viewer", () => {
		expect(jumpTarget(page({ you: { rank: 30, page: 2 } }))).toBe(2);
	});

	/** A button that navigates to the page already showing is a button that appears to do nothing. */
	it("offers nothing when the viewer is on this page", () => {
		expect(jumpTarget(page({ page: 2, you: { rank: 30, page: 2 } }))).toBeNull();
	});

	it("offers nothing when the viewer is not ranked", () => {
		expect(jumpTarget(page())).toBeNull();
	});
});

describe("summarise", () => {
	it("counts accounts on the economy board", () => {
		expect(summarise(page({ total: 30 }), t)).toBe("30 accounts ranked.");
	});

	it("counts members on the levels board", () => {
		expect(summarise(page({ board: "levels", total: 1 }), t)).toBe("1 member ranked.");
	});

	it("counts people across every server on the bot-wide board", () => {
		expect(summarise(page({ scope: "global", total: 2 }), t)).toBe("2 people ranked across every server.");
	});

	it("explains an empty board rather than saying zero", () => {
		expect(summarise(page({ scope: "global", total: 0 }), t)).toBe("Nobody has an account in any server yet.");
		expect(summarise(page({ total: 0 }), t)).toBe(emptyMessage("economy", t));
	});
});
