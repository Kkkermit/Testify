import { type BoardPage } from "@testify/shared";
import { boardFrom, emptyMessage, jumpTarget, pageFrom, summarise } from "@/features/members/members.utils";

function page(overrides: Partial<BoardPage> = {}): BoardPage {
	return { board: "economy", page: 1, pages: 2, total: 30, rows: [], you: null, ...overrides };
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

describe("pageFrom", () => {
	it("reads a page out of the URL", () => {
		expect(pageFrom("4")).toBe(4);
	});

	it.each([null, "0", "-2", "two", "1.5"])("falls back to the first page for %p", (value) => {
		expect(pageFrom(value)).toBe(1);
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
		expect(summarise(page({ total: 30 }))).toBe("30 accounts ranked.");
	});

	it("counts members on the levels board", () => {
		expect(summarise(page({ board: "levels", total: 1 }))).toBe("1 member ranked.");
	});

	it("explains an empty board rather than saying zero", () => {
		expect(summarise(page({ total: 0 }))).toBe(emptyMessage("economy"));
	});
});
