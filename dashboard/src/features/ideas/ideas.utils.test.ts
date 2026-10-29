import { pageCount } from "@/features/ideas/ideas.utils";

describe("the idea board's URL", () => {
	it("never counts fewer than one page", () => {
		expect(pageCount(0, 10)).toBe(1);
		expect(pageCount(21, 10)).toBe(3);
	});
});
