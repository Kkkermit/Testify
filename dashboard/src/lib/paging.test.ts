import { pageCount, pageFrom, pageOf } from "@/lib/paging";

describe("pageFrom", () => {
	/** A page number out of a URL can be anything at all. */
	it.each([null, "", "0", "-3", "abc", "1.5", "1e9999"])("falls back to the first page for %p", (raw) => {
		expect(pageFrom(raw)).toBe(1);
	});

	it("reads a real page number", () => {
		expect(pageFrom("4")).toBe(4);
	});
});

describe("pageCount", () => {
	it("rounds a part-full last page up", () => {
		expect(pageCount(51, 25)).toBe(3);
	});

	/** Zero items is still one page, or the pager renders "Page 1 of 0". */
	it("is one page for nothing at all", () => {
		expect(pageCount(0, 25)).toBe(1);
	});
});

describe("pageOf", () => {
	const numbers = Array.from({ length: 23 }, (_unused, index) => index + 1);

	it("hands back one page's worth, and how many pages there are", () => {
		expect(pageOf(numbers, 1, 10)).toEqual({ items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], page: 1, pages: 3 });
		expect(pageOf(numbers, 3, 10)).toEqual({ items: [21, 22, 23], page: 3, pages: 3 });
	});

	/** A search can shrink a list under a page number left in the URL, which would otherwise show nothing. */
	it("clamps a page past the end to the last one", () => {
		expect(pageOf(numbers, 9, 10).page).toBe(3);
		expect(pageOf([], 4, 10)).toEqual({ items: [], page: 1, pages: 1 });
	});
});
