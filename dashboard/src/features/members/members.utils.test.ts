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
	/** `?board=` is user input, and an unknown value has to land somewhere rather than render nothing. */
	it.each([null, "", "warnings"])("falls back to economy for %p", (value) => {
		expect(boardFrom(value)).toBe("economy");
	});
});

describe("sortFrom and scopeFrom", () => {
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
	/** Somebody on the bot-wide board who was never in this server has no page here to open. */
	it("opens only this server's members on the bot-wide board", () => {
		expect(opensMember(page({ scope: "global" }), { inGuild: true })).toBe(true);
		expect(opensMember(page({ scope: "global" }), { inGuild: false })).toBe(false);
	});
});

describe("jumpTarget", () => {
	/** A button that navigates to the page already showing is a button that appears to do nothing. */
	it("offers nothing when the viewer is on this page", () => {
		expect(jumpTarget(page({ page: 2, you: { rank: 30, page: 2 } }))).toBeNull();
	});
});

describe("summarise", () => {
	it("explains an empty board rather than saying zero", () => {
		expect(summarise(page({ scope: "global", total: 0 }), t)).toBe("Nobody has an account in any server yet.");
		expect(summarise(page({ total: 0 }), t)).toBe(emptyMessage("economy", t));
	});
});
