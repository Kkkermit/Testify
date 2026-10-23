import { ideaFilterFrom, pageCount, pageFrom } from "@/features/ideas/ideas.utils";

describe("the idea board's URL", () => {
	it("reads a filter the API takes, and every idea otherwise", () => {
		expect(ideaFilterFrom("declined")).toBe("declined");
		expect(ideaFilterFrom("$where")).toBe("all");
		expect(ideaFilterFrom(null)).toBe("all");
	});

	it("reads a page, and the first page for anything that is not one", () => {
		expect(pageFrom("3")).toBe(3);
		expect(pageFrom("0")).toBe(1);
		expect(pageFrom("-2")).toBe(1);
		expect(pageFrom("two")).toBe(1);
	});

	it("never counts fewer than one page", () => {
		expect(pageCount(0, 10)).toBe(1);
		expect(pageCount(21, 10)).toBe(3);
	});
});
