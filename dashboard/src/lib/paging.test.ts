import { pageCount, pageFrom, pageOf, pageWindow } from "@/lib/paging";

describe("pageFrom", () => {
	/** A page number out of a URL can be anything at all. */
	it.each([null, "", "0", "-3", "abc", "1.5", "1e9999"])("falls back to the first page for %p", (raw) => {
		expect(pageFrom(raw)).toBe(1);
	});
});

describe("pageCount", () => {
	/** Zero items is still one page, or the pager renders "Page 1 of 0". */
	it("is one page for nothing at all", () => {
		expect(pageCount(0, 25)).toBe(1);
	});
});

describe("pageOf", () => {
	const numbers = Array.from({ length: 23 }, (_unused, index) => index + 1);

	/** A search can shrink a list under a page number left in the URL, which would otherwise show nothing. */
	it("clamps a page past the end to the last one", () => {
		expect(pageOf(numbers, 9, 10).page).toBe(3);
		expect(pageOf([], 4, 10)).toEqual({ items: [], page: 1, pages: 1 });
	});
});

describe("pageWindow", () => {
	/** Two either side is what lets a reader skip ahead without stepping one page at a time. */
	it("offers two pages either side of the current one", () => {
		expect(pageWindow(6, 12)).toEqual([4, 5, 6, 7, 8]);
	});
});
